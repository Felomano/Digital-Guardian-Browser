import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  Animated,
  Linking,
} from "react-native";

let WebView: any = null;
if (Platform.OS !== "web") {
  const webviewModule = require("react-native-webview");
  WebView = webviewModule.WebView;
}
type WebViewNavigation = {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
};

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";
import { AngelOverlay } from "@/components/AngelOverlay";
import { ToastMessage } from "@/components/ToastMessage";
import { ReportModal } from "@/components/ReportModal";
import { SECURITY_ENDPOINT } from "@/constants/api";
import { loadSettings } from "@/constants/settings";
import { getSession } from "@/constants/session";

const SECURITY_API = SECURITY_ENDPOINT;
const DEFAULT_URL = "https://www.google.com";
const SEARCH_ENGINE = "https://www.google.com/search?q=";

type RiskLevel = "safe" | "warning" | "danger" | "loading" | "unknown";

// ─── Local phishing heuristics ─────────────────────────────────────────────
const DANGER_KEYWORDS = [
  "phishing", "phish", "malware", "scam", "hack", "exploit",
  "trojan", "ransomware", "keylogger", "spyware", "botnet",
  "credential", "steal", "victim", "deceptive", "fraud",
];

const DANGER_DOMAINS = [
  "ebrowsing.appspot.com",
  "phishtank.com",
  "malware-test.com",
  "eicar.org",
  "testsafebrowsing.appspot.com",
];

const WARNING_PATTERNS = [
  /login.*paypal/i,
  /paypal.*login/i,
  /secure.*bank/i,
  /account.*verify/i,
  /update.*credit/i,
  /confirm.*password/i,
];

const WARNING_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".download"];

// ─── Known brands + their official domains ──────────────────────────────────
const KNOWN_BRANDS: Record<string, string[]> = {
  "lidl":         ["lidl.es", "lidl.com", "lidl.fr", "lidl.de", "lidl.co.uk"],
  "conforama":    ["conforama.es", "conforama.com", "conforama.fr"],
  "amazon":       ["amazon.es", "amazon.com", "amazon.co.uk", "amazon.fr", "amazon.de"],
  "leroy merlin": ["leroymerlin.es", "leroymerlin.fr", "leroymerlin.com"],
  "mediamarkt":   ["mediamarkt.es", "mediamarkt.com", "mediamarkt.de"],
};

// ─── Shannon entropy to detect random/generated hostnames ───────────────────
function shannonEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const ch of str) freq[ch] = (freq[ch] ?? 0) + 1;
  const len = str.length;
  return -Object.values(freq).reduce((acc, n) => {
    const p = n / len;
    return acc + p * Math.log2(p);
  }, 0);
}

function isHighEntropyDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const sld = hostname.split(".").slice(-2, -1)[0] ?? "";
    if (sld.length < 6) return false;
    const entropy = shannonEntropy(sld);
    // High entropy (>3.5) on unusual TLD = likely generated domain
    const dangerousTld = WARNING_TLDS.some((t) => hostname.endsWith(t));
    return entropy > 3.5 && dangerousTld;
  } catch {
    return false;
  }
}

// ─── Brand-clone detection injected into WebView ────────────────────────────
const BRAND_CLONE_JS = `
(function() {
  var BRANDS = ${JSON.stringify(Object.entries(KNOWN_BRANDS).map(([brand, domains]) => ({ brand, domains })))};
  var SEARCH_ENGINES = ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com'];
  var currentHost = window.location.hostname.toLowerCase();
  
  // Don't trigger brand-clone alert on trusted search engines
  for (var se = 0; se < SEARCH_ENGINES.length; se++) {
    if (currentHost === SEARCH_ENGINES[se] || currentHost.endsWith('.' + SEARCH_ENGINES[se])) {
      return;
    }
  }
  
  var bodyText = (document.body && document.body.innerText) ? document.body.innerText.toLowerCase() : '';
  var title = document.title ? document.title.toLowerCase() : '';
  var combined = bodyText + ' ' + title;
  for (var i = 0; i < BRANDS.length; i++) {
    var b = BRANDS[i];
    if (combined.indexOf(b.brand) !== -1) {
      var isOfficial = false;
      for (var j = 0; j < b.domains.length; j++) {
        if (currentHost === b.domains[j] || currentHost.endsWith('.' + b.domains[j])) {
          isOfficial = true;
          break;
        }
      }
      if (!isOfficial) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'BRAND_CLONE',
          brand: b.brand,
          url: window.location.href,
        }));
        break;
      }
    }
  }
  true;
})();
`;

function localRiskCheck(url: string): RiskLevel {
  try {
    const lower = url.toLowerCase();
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const fullLower = hostname + path;

    // Known dangerous domains
    for (const d of DANGER_DOMAINS) {
      if (hostname.includes(d)) return "danger";
    }

    // High-entropy random-looking domain (e.g. lqjkarav.shop)
    if (isHighEntropyDomain(url)) return "danger";

    // Dangerous keywords in URL
    for (const kw of DANGER_KEYWORDS) {
      if (fullLower.includes(kw)) return "danger";
    }

    // Plain HTTP (not HTTPS) — warning
    if (parsed.protocol === "http:") {
      // Exception: localhost
      if (!hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
        return "warning";
      }
    }

    // Warning patterns
    for (const p of WARNING_PATTERNS) {
      if (p.test(lower)) return "warning";
    }

    // Suspicious TLDs
    for (const tld of WARNING_TLDS) {
      if (hostname.endsWith(tld)) return "warning";
    }

    // Many subdomains = suspicious
    const parts = hostname.split(".");
    if (parts.length > 4) return "warning";

    return "safe";
  } catch {
    return "unknown";
  }
}
// ───────────────────────────────────────────────────────────────────────────

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_URL;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return "https://" + trimmed;
  return SEARCH_ENGINE + encodeURIComponent(trimmed);
}

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ initialUrl?: string }>();

  const initialUrl = params.initialUrl || DEFAULT_URL;
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [webViewUrl, setWebViewUrl] = useState(initialUrl);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("unknown");
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as any });
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isInputFocused, setInputFocused] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiReasons, setAiReasons] = useState<string[]>([]);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [brandCloneAlert, setBrandCloneAlert] = useState<string | null>(null);
  const [hideHaloOnGreen, setHideHaloOnGreen] = useState(false);
  const [userName, setUserName] = useState("Usuario");
  const [guardianPhone, setGuardianPhone] = useState("");

  const webViewRef = useRef<any>(null);
  const alertShownFor = useRef<string>("");
  const checkAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    checkSecurity(initialUrl);
    // Load session data including guardianPhone
    (async () => {
      const session = await getSession();
      if (session?.name) setUserName(session.name);
      if (session?.phone) setGuardianPhone(session.phone);
    })();
  }, []);

  // Reload user settings when screen comes into focus (e.g., after visiting profile)
  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => setHideHaloOnGreen(s.hideHaloOnGreen));
      // Also reload user phone in case it was updated in profile
      (async () => {
        const session = await getSession();
        if (session?.phone) setGuardianPhone(session.phone);
      })();
    }, [])
  );

  // ── Security check: local first, then API ────────────────────────────────
  const checkSecurity = useCallback(async (url: string) => {
    if (!url || url.startsWith("about:") || url === "about:blank") return;

    // Cancel any in-flight request
    if (checkAbort.current) checkAbort.current.abort();
    checkAbort.current = new AbortController();

    setRiskLevel("loading");

    // 1. Run local heuristics immediately — instant feedback
    const localRisk = localRiskCheck(url);
    if (localRisk === "danger" || localRisk === "warning") {
      setRiskLevel(localRisk);
      await saveRecentSite(url, localRisk);
      if (alertShownFor.current !== url) {
        alertShownFor.current = url;
        setTimeout(() => setAlertVisible(true), 400);
      }
    }

    // 2. Also call the remote API (may upgrade or confirm local result)
    try {
      const response = await fetch(
        `${SECURITY_API}?url=${encodeURIComponent(url)}`,
        { signal: checkAbort.current.signal }
      );

      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      const apiRisk: RiskLevel = data.risk_level || "unknown";

      // Capture AI explanation and reasons
      if (data.explanation) setAiExplanation(data.explanation);
      if (data.reasons?.length) setAiReasons(data.reasons);

      // Use the most severe of local + remote
      const severity: Record<RiskLevel, number> = {
        danger: 4, warning: 3, unknown: 2, loading: 1, safe: 0,
      };
      const finalRisk: RiskLevel =
        severity[apiRisk] > severity[localRisk] ? apiRisk : localRisk;

      if (finalRisk !== "loading") {
        setRiskLevel(finalRisk);
        await saveRecentSite(url, finalRisk);

        if (
          (finalRisk === "danger" || finalRisk === "warning") &&
          alertShownFor.current !== url
        ) {
          alertShownFor.current = url;
          setTimeout(() => setAlertVisible(true), 400);
        }
      }
    } catch (e: any) {
      // AbortError is fine — user navigated away
      if (e?.name === "AbortError") return;
      // If API fails, keep local result
      if (localRisk !== "safe" && localRisk !== "unknown") {
        setRiskLevel(localRisk);
      } else {
        setRiskLevel("unknown");
      }
    }
  }, []);

  const saveRecentSite = async (url: string, risk: RiskLevel) => {
    try {
      const stored = await AsyncStorage.getItem("recent_sites");
      const existing = stored ? JSON.parse(stored) : [];
      const filtered = existing.filter((s: any) => s.url !== url);
      const updated = [
        { url, risk, timestamp: new Date().toISOString() },
        ...filtered,
      ].slice(0, 30);
      await AsyncStorage.setItem("recent_sites", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleNavigate = () => {
    Keyboard.dismiss();
    const normalized = normalizeUrl(inputUrl);
    alertShownFor.current = "";
    setAiExplanation(null);
    setAiReasons([]);
    setCurrentUrl(normalized);
    setWebViewUrl(normalized);
    setInputUrl(normalized);
    setWebViewError(null);
    setRiskLevel("loading");
    checkSecurity(normalized);
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(!!navState.canGoBack);
    setCanGoForward(!!navState.canGoForward);

    const newUrl = navState.url;
    if (!newUrl || newUrl === "about:blank") return;

    // Always update URL display
    setCurrentUrl(newUrl);
    if (!isInputFocused) setInputUrl(newUrl);

    // Trigger security check if it's a new URL
    if (newUrl !== currentUrl) {
      alertShownFor.current = "";
      checkSecurity(newUrl);
    }
  };

  const handleReport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAlertVisible(false);
    setTimeout(() => setReportModalOpen(true), 300);
  };

  // ── Handle WebView messages (brand-clone detection) ───────────────────────
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "BRAND_CLONE") {
        const brandLabel = msg.brand.charAt(0).toUpperCase() + msg.brand.slice(1);
        setBrandCloneAlert(brandLabel);
        setRiskLevel("danger");
        setAiExplanation(`¡Este sitio suplanta a ${brandLabel}! La URL (${new URL(currentUrl).hostname}) no es el dominio oficial de ${brandLabel}.`);
        setAiReasons([
          `Contenido de marca "${brandLabel}" en dominio no oficial`,
          `URL con alta entropía o TLD sospechoso`,
          `Posible clonación de sitio legítimo`,
        ]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => setAlertVisible(true), 400);
      }
    } catch {}
  }, [currentUrl]);

  const handleReportSuccess = async () => {
    setReportModalOpen(false);
    // Also cache locally for community screen
    try {
      const stored = await AsyncStorage.getItem("community_reports");
      const existing = stored ? JSON.parse(stored) : [];
      const reportEntry = {
        url: currentUrl,
        risk: riskLevel,
        timestamp: new Date().toISOString(),
        source: "angel-browser",
      };
      const filtered = existing.filter((r: any) => r.url !== currentUrl);
      await AsyncStorage.setItem(
        "community_reports",
        JSON.stringify([reportEntry, ...filtered].slice(0, 100))
      );
    } catch {}
    showToast("¡Reporte enviado! Gracias por proteger a la comunidad", "success");
  };

  const showToast = (message: string, type: "success" | "info" | "warning" = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  };

  const handleOpenExternal = () => Linking.openURL(currentUrl);

  const getRiskBarColor = () => {
    switch (riskLevel) {
      case "safe": return Colors.safe;
      case "warning": return Colors.warning;
      case "danger": return Colors.danger;
      case "loading": return Colors.accent;
      default: return Colors.accent;
    }
  };

  // Top bar tint based on risk
  const navBarBg =
    riskLevel === "danger"
      ? "#2A0808"
      : riskLevel === "warning"
        ? "#2A1F00"
        : Colors.primaryLight;

  const navBarBorder =
    riskLevel === "danger"
      ? Colors.danger + "55"
      : riskLevel === "warning"
        ? Colors.warning + "44"
        : Colors.cardBorder;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Navigation Bar ─────────────────────────────────────────────── */}
      <View style={[styles.navBar, { backgroundColor: navBarBg, borderBottomColor: navBarBorder }]}>
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          onPress={() => (canGoBack ? webViewRef.current?.goBack() : router.back())}
        >
          <Feather
            name={canGoBack ? "chevron-left" : "arrow-left"}
            size={22}
            color={Colors.white}
          />
        </Pressable>

        {/* URL bar */}
        <View style={[styles.urlBar, isInputFocused && styles.urlBarFocused,
          riskLevel === "danger" && styles.urlBarDanger,
          riskLevel === "warning" && styles.urlBarWarning,
        ]}>
          {riskLevel === "loading" ? (
            <ActivityIndicator size="small" color={Colors.accent} style={{ width: 14 }} />
          ) : riskLevel !== "unknown" ? (
            <View style={[styles.urlRiskDot, { backgroundColor: getRiskBarColor() }]} />
          ) : (
            <Feather name="lock" size={12} color={Colors.textMuted} />
          )}

          <TextInput
            style={styles.urlInput}
            value={isInputFocused ? inputUrl : inputUrl.replace(/^https?:\/\//, "").split("?")[0]}
            onChangeText={setInputUrl}
            onFocus={() => { setInputFocused(true); setInputUrl(currentUrl); }}
            onBlur={() => setInputFocused(false)}
            onSubmitEditing={handleNavigate}
            placeholder="Buscar o ingresar URL"
            placeholderTextColor={Colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus
            returnKeyType="go"
          />

          {isInputFocused ? (
            <Pressable onPress={handleNavigate} style={styles.goBtn}>
              <Feather name="arrow-right" size={16} color={Colors.white} />
            </Pressable>
          ) : (
            <Pressable onPress={() => webViewRef.current?.reload()} style={styles.reloadBtn}>
              <Feather name="rotate-cw" size={14} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          onPress={() => {
            setInputUrl("");
            setCurrentUrl("");
            setInputFocused(true);
          }}
        >
          <Feather name="plus" size={22} color={Colors.white} />
        </Pressable>
      </View>

      {/* ── Risk indicator strip ────────────────────────────────────────── */}
      {(riskLevel === "danger" || riskLevel === "warning") && (
        <Pressable
          style={[styles.riskStrip, { backgroundColor: getRiskBarColor() + "22", borderBottomColor: getRiskBarColor() + "44" }]}
          onPress={() => setAlertVisible(true)}
        >
          <Feather
            name={riskLevel === "danger" ? "alert-octagon" : "alert-triangle"}
            size={14}
            color={getRiskBarColor()}
          />
          <Text style={[styles.riskStripText, { color: getRiskBarColor() }]}>
            {riskLevel === "danger"
              ? "Sitio peligroso detectado — Toca para ver detalles"
              : "Sitio poco conocido — Navega con precaución"}
          </Text>
          <Feather name="chevron-right" size={14} color={getRiskBarColor()} />
        </Pressable>
      )}

      {/* ── Brand Clone Alert Banner ────────────────────────────────────── */}
      {brandCloneAlert && (
        <Pressable
          style={styles.brandCloneBanner}
          onPress={() => setAlertVisible(true)}
        >
          <Feather name="alert-octagon" size={16} color="#fff" />
          <Text style={styles.brandCloneBannerText}>
            ¡ALERTA! Este sitio suplanta a {brandCloneAlert}
          </Text>
          <Pressable
            style={styles.brandCloneClose}
            onPress={() => setBrandCloneAlert(null)}
          >
            <Feather name="x" size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </Pressable>
      )}

      {/* ── WebView / Fallback ─────────────────────────────────────────── */}
      {webViewError ? (
        <View style={styles.errorScreen}>
          <View style={styles.errorIconBg}>
            <Feather name="wifi-off" size={36} color={Colors.textSecondary} />
          </View>
          <Text style={styles.errorTitle}>Este sitio no permite navegación interna.</Text>
          <Text style={styles.errorMessage}>Puedes abrirlo en tu navegador externo.</Text>
          <Pressable
            style={({ pressed }) => [styles.openExternalBtn, pressed && { opacity: 0.8 }]}
            onPress={handleOpenExternal}
          >
            <Feather name="external-link" size={18} color={Colors.white} />
            <Text style={styles.openExternalText}>Abrir en navegador externo</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.goBackBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              setWebViewError(null);
              setWebViewUrl(DEFAULT_URL);
              setCurrentUrl(DEFAULT_URL);
              setInputUrl(DEFAULT_URL);
            }}
          >
            <Text style={styles.goBackText}>Ir a la página de inicio</Text>
          </Pressable>
        </View>
      ) : Platform.OS === "web" ? (
        <View style={styles.webOnlyScreen}>
          <View style={styles.webOnlyIconBg}>
            <Feather name="smartphone" size={40} color={Colors.accent} />
          </View>
          <Text style={styles.webOnlyTitle}>Funciona en dispositivos móviles</Text>
          <Text style={styles.webOnlyDesc}>
            El navegador Ángel está optimizado para iOS y Android. Descarga la app para navegar con protección en tiempo real.
          </Text>
          <View style={styles.webOnlyUrlBox}>
            <Feather name="globe" size={14} color={Colors.textSecondary} />
            <Text style={styles.webOnlyUrl} numberOfLines={1}>
              {currentUrl.replace(/^https?:\/\//, "").split("/")[0]}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.openExternalBtn, pressed && { opacity: 0.8 }]}
            onPress={handleOpenExternal}
          >
            <Feather name="external-link" size={18} color={Colors.white} />
            <Text style={styles.openExternalText}>Abrir en navegador externo</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          injectedJavaScript={BRAND_CLONE_JS}
          onMessage={handleWebViewMessage}
          onLoadStart={() => {
            setIsLoading(true);
            setWebViewError(null);
            setBrandCloneAlert(null);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.code !== -999) {
              setWebViewError(nativeEvent.description || "Error loading page");
              setIsLoading(false);
            }
          }}
          onHttpError={(syntheticEvent: any) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode === 403 || nativeEvent.statusCode === 401) {
              setWebViewError("This site has restricted access.");
              setIsLoading(false);
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          renderLoading={() => (
            <View style={styles.loadingScreen}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          )}
          startInLoadingState
        />
      )}

      {/* ── Bottom navigation bar ───────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* Atrás */}
        <Pressable
          style={({ pressed }) => [styles.bottomNavBtn, pressed && styles.bottomNavBtnPressed, !canGoBack && styles.bottomNavBtnDisabled]}
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
        >
          <Feather name="chevron-left" size={22} color={canGoBack ? Colors.white : Colors.textMuted} />
          <Text style={[styles.bottomNavLabel, !canGoBack && styles.bottomNavLabelDisabled]}>Atrás</Text>
        </Pressable>

        {/* Adelante */}
        <Pressable
          style={({ pressed }) => [styles.bottomNavBtn, pressed && styles.bottomNavBtnPressed, !canGoForward && styles.bottomNavBtnDisabled]}
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
        >
          <Feather name="chevron-right" size={22} color={canGoForward ? Colors.white : Colors.textMuted} />
          <Text style={[styles.bottomNavLabel, !canGoForward && styles.bottomNavLabelDisabled]}>Adelante</Text>
        </Pressable>

        {/* Comunidad */}
        <Pressable
          style={({ pressed }) => [styles.bottomNavBtn, pressed && styles.bottomNavBtnPressed]}
          onPress={() => router.push("/heroes")}
        >
          <Feather name="users" size={20} color={Colors.white} />
          <Text style={styles.bottomNavLabel}>Comunidad</Text>
        </Pressable>

        {/* Perfil */}
        <Pressable
          style={({ pressed }) => [styles.bottomNavBtn, pressed && styles.bottomNavBtnPressed]}
          onPress={() => router.push("/profile")}
        >
          <Feather name="user" size={20} color={Colors.white} />
          <Text style={styles.bottomNavLabel}>Perfil</Text>
        </Pressable>
      </View>

      {/* ── Angel overlay ───────────────────────────────────────────────── */}
      <AngelOverlay
        riskLevel={riskLevel}
        currentUrl={currentUrl}
        onGoBack={() => canGoBack ? webViewRef.current?.goBack() : router.back()}
        onContinue={() => setAlertVisible(false)}
        onReport={handleReport}
        isAlertVisible={isAlertVisible}
        setAlertVisible={setAlertVisible}
        aiExplanation={aiExplanation}
        aiReasons={aiReasons}
        hideWhenSafe={hideHaloOnGreen}
        userName={userName}
        guardianPhone={guardianPhone}
      />

      {/* ── Report modal ────────────────────────────────────────────────── */}
      <ReportModal
        visible={isReportModalOpen}
        url={currentUrl}
        onClose={() => setReportModalOpen(false)}
        onSuccess={handleReportSuccess}
      />

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      <ToastMessage visible={toast.visible} message={toast.message} type={toast.type} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  urlBarFocused: {
    borderColor: Colors.accent + "88",
    backgroundColor: "rgba(123,47,190,0.2)",
  },
  urlBarDanger: {
    borderColor: Colors.danger + "66",
    backgroundColor: "rgba(231,76,60,0.15)",
  },
  urlBarWarning: {
    borderColor: Colors.warning + "66",
    backgroundColor: "rgba(241,196,15,0.1)",
  },
  urlRiskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  urlInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.white,
    paddingVertical: 0,
  },
  goBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  reloadBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  // Risk strip below nav bar
  riskStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  riskStripText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 16,
  },

  webView: { flex: 1, backgroundColor: "#FFFFFF" },

  loadingScreen: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#666" },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  errorIconBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.cardBg,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18, fontFamily: "Inter_600SemiBold",
    color: Colors.white, textAlign: "center", lineHeight: 26,
  },
  errorMessage: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center",
  },
  openExternalBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.accent,
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 14, marginTop: 8,
  },
  openExternalText: {
    fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white,
  },
  goBackBtn: { paddingVertical: 12 },
  goBackText: {
    fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary,
  },

  // Bottom navigation bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingTop: 8,
    backgroundColor: Colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    minHeight: 62,
  },
  bottomNavBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 3,
    borderRadius: 10,
    minHeight: 52,
  },
  bottomNavBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bottomNavBtnDisabled: {
    opacity: 0.35,
  },
  bottomNavBtnReport: {
    // no extra styles needed
  },
  reportIconBg: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  bottomNavLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.white,
    textAlign: "center",
  },
  bottomNavLabelDisabled: {
    color: Colors.textMuted,
  },

  // Web-only fallback
  webOnlyScreen: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 16,
  },
  webOnlyIconBg: {
    width: 90, height: 90, borderRadius: 26,
    backgroundColor: "rgba(123,47,190,0.2)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 8,
  },
  webOnlyTitle: {
    fontSize: 20, fontFamily: "Inter_700Bold",
    color: Colors.white, textAlign: "center",
  },
  webOnlyDesc: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: Colors.textSecondary, textAlign: "center", lineHeight: 22,
  },
  webOnlyUrlBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.cardBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.cardBorder, alignSelf: "stretch",
  },
  webOnlyUrl: {
    fontSize: 13, fontFamily: "Inter_500Medium",
    color: Colors.textSecondary, flex: 1,
  },

  // Brand clone alert banner
  brandCloneBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.danger,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  brandCloneBannerText: {
    flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  brandCloneClose: {
    padding: 4,
  },
});
