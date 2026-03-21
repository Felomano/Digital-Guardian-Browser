import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

type RiskLevel = "safe" | "warning" | "danger";

interface SecurityResult {
  risk_level: RiskLevel;
  explanation: string;
  confidence: number;
  reasons: string[];
}

// ── Layer 1: Heuristic analysis ────────────────────────────────────────────

const DANGER_KEYWORDS = [
  "phishing", "phish", "malware", "scam", "hack", "exploit",
  "trojan", "ransomware", "keylogger", "spyware", "botnet",
  "deceptive", "fraud", "steal",
];

const WARNING_KEYWORDS = [
  "login", "verify", "update", "confirm", "secure-", "account-",
  "signin", "sign-in", "auth", "password", "credential",
];

const SUSPICIOUS_TLDS = [
  ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top",
  ".click", ".download", ".info", ".biz", ".pw",
];

const KNOWN_DANGER_DOMAINS = [
  "ebrowsing.appspot.com",
  "testsafebrowsing.appspot.com",
  "malware-test.com",
  "eicar.org",
];

const BRAND_NAMES = [
  "paypal", "amazon", "google", "microsoft", "apple", "facebook",
  "netflix", "instagram", "whatsapp", "twitter", "bank", "bancomer",
  "bbva", "santander", "banamex", "hsbc", "visa", "mastercard",
];

// Detect homograph/typosquatting attacks
function detectTyposquatting(hostname: string): string | null {
  // Check for number substitutions like amaz0n, paypa1
  const normalized = hostname
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/\-/g, "");

  for (const brand of BRAND_NAMES) {
    if (normalized.includes(brand) && !hostname.includes(brand)) {
      return brand;
    }
  }
  return null;
}

function heuristicAnalysis(url: string): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { score: 0, reasons: ["URL inválida"] };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullUrl = url.toLowerCase();
  const pathQuery = (parsed.pathname + parsed.search).toLowerCase();

  // Known dangerous domains
  for (const domain of KNOWN_DANGER_DOMAINS) {
    if (hostname.includes(domain)) {
      score += 80;
      reasons.push("dominio catalogado como peligroso");
      break;
    }
  }

  // Danger keywords
  for (const kw of DANGER_KEYWORDS) {
    if (fullUrl.includes(kw)) {
      score += 60;
      reasons.push(`contiene palabra clave sospechosa: "${kw}"`);
      break;
    }
  }

  // Typosquatting
  const typo = detectTyposquatting(hostname);
  if (typo) {
    score += 55;
    reasons.push(`posible imitación de "${typo}" usando caracteres similares`);
  }

  // Brand name in subdomain (e.g. paypal.fake-site.com)
  const parts = hostname.split(".");
  const domain = parts.slice(-2).join(".");
  const subdomains = parts.slice(0, -2).join(".");
  for (const brand of BRAND_NAMES) {
    if (subdomains.includes(brand) && !domain.includes(brand)) {
      score += 50;
      reasons.push(`imita a "${brand}" en el subdominio`);
      break;
    }
  }

  // Warning keywords in URL
  for (const kw of WARNING_KEYWORDS) {
    if (pathQuery.includes(kw)) {
      score += 25;
      reasons.push(`URL contiene "${kw}" — patrón típico de phishing`);
      break;
    }
  }

  // Suspicious TLD
  for (const tld of SUSPICIOUS_TLDS) {
    if (hostname.endsWith(tld)) {
      score += 30;
      reasons.push(`dominio de nivel superior sospechoso: "${tld}"`);
      break;
    }
  }

  // Plain HTTP
  if (parsed.protocol === "http:" && !hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
    score += 20;
    reasons.push("conexión no segura (HTTP sin cifrado)");
  }

  // Too many subdomains (e.g. login.secure.paypal.fake.com)
  if (parts.length > 4) {
    score += 15;
    reasons.push("estructura de dominio inusualmente compleja");
  }

  // Very long URL
  if (url.length > 200) {
    score += 10;
    reasons.push("URL anormalmente larga");
  }

  return { score, reasons };
}

// ── Layer 2: DB reputation ─────────────────────────────────────────────────

async function reputationCheck(url: string): Promise<{
  score: number;
  reportCount: number;
  reasons: string[];
}> {
  try {
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return { score: 0, reportCount: 0, reasons: [] };
    }

    // Find reports for this exact URL or same domain
    const reports = await db
      .select()
      .from(reportsTable)
      .where(sql`${reportsTable.url} ILIKE ${"%" + hostname + "%"}`)
      .limit(50);

    if (reports.length === 0) return { score: 0, reportCount: 0, reasons: [] };

    const dangerCount = reports.filter((r) => r.riskLevel === "danger").length;
    const warningCount = reports.filter((r) => r.riskLevel === "warning").length;
    const totalCount = reports.length;

    const score = Math.min(
      (dangerCount * 25 + warningCount * 10),
      60
    );

    const reasons: string[] = [];
    if (totalCount > 0) {
      reasons.push(
        `reportado ${totalCount} vez${totalCount > 1 ? "es" : ""} por usuarios de la comunidad`
      );
    }

    return { score, reportCount: totalCount, reasons };
  } catch {
    return { score: 0, reportCount: 0, reasons: [] };
  }
}

// ── Layer 3: AI simulation ─────────────────────────────────────────────────

function generateExplanation(
  riskLevel: RiskLevel,
  hostname: string,
  reasons: string[]
): string {
  if (riskLevel === "safe") {
    return `El dominio "${hostname}" no presenta indicadores de riesgo conocidos. La conexión parece segura.`;
  }

  if (reasons.length === 0) {
    return riskLevel === "danger"
      ? `El sitio "${hostname}" ha sido identificado como potencialmente peligroso.`
      : `El sitio "${hostname}" presenta algunos indicadores de riesgo moderado.`;
  }

  const mainReason = reasons[0];
  const extra = reasons.length > 1 ? ` Además, ${reasons[1]}.` : "";

  return riskLevel === "danger"
    ? `⚠️ Sitio de alto riesgo: ${mainReason}.${extra} Se recomienda NO ingresar datos personales.`
    : `🔶 Precaución: ${mainReason}.${extra} Navega con cuidado.`;
}

// ── Main analysis function ─────────────────────────────────────────────────

export async function analyzeUrl(url: string): Promise<SecurityResult> {
  const { score: heuristicScore, reasons: heuristicReasons } =
    heuristicAnalysis(url);

  const { score: reputationScore, reasons: reputationReasons } =
    await reputationCheck(url);

  const allReasons = [...heuristicReasons, ...reputationReasons];
  const totalScore = Math.min(heuristicScore + reputationScore, 100);

  let riskLevel: RiskLevel;
  if (totalScore >= 50) {
    riskLevel = "danger";
  } else if (totalScore >= 20) {
    riskLevel = "warning";
  } else {
    riskLevel = "safe";
  }

  let hostname = "desconocido";
  try {
    hostname = new URL(url).hostname;
  } catch {}

  const confidence = Math.min(0.4 + totalScore / 100, 0.97);
  const explanation = generateExplanation(riskLevel, hostname, allReasons);

  return {
    risk_level: riskLevel,
    explanation,
    confidence: Math.round(confidence * 100) / 100,
    reasons: allReasons,
  };
}
