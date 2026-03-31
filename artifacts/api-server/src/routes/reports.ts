import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable, usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// POST /api/report
router.post("/report", async (req, res) => {
  const {
    url, userId, risk_level, country, source,
    explanation, confidence, fraud_type, comment,
  } = req.body;

  if (!url || !risk_level) {
    res.status(400).json({ error: "url and risk_level are required" });
    return;
  }

  try {
    let existing = null;
    if (userId && userId !== "anonymous") {
      const found = await db
        .select()
        .from(reportsTable)
        .where(sql`${reportsTable.url} = ${url} AND ${reportsTable.userId} = ${userId}`)
        .limit(1);
      existing = found[0] ?? null;
    }

    if (existing) {
      const [updated] = await db
        .update(reportsTable)
        .set({
          riskLevel: risk_level,
          country: country ?? existing.country,
          fraudType: fraud_type ?? existing.fraudType,
          comment: comment ?? existing.comment,
          reportCount: (existing.reportCount ?? 1) + 1,
        })
        .where(eq(reportsTable.id, existing.id))
        .returning();
      res.json({ success: true, report: updated });
    } else {
      const [report] = await db
        .insert(reportsTable)
        .values({
          url,
          riskLevel: risk_level,
          userId: userId ?? "anonymous",
          country: country ?? "XX",
          source: source ?? "angel-browser",
          explanation: explanation ?? null,
          confidence: confidence ?? null,
          fraudType: fraud_type ?? null,
          comment: comment ?? null,
        })
        .returning();
      res.json({ success: true, report });
    }
  } catch (err) {
    req.log.error({ err }, "Error saving report");
    res.status(500).json({ error: "Failed to save report" });
  }
});

// GET /api/reports?country=ES&limit=50
router.get("/reports", async (req, res) => {
  const country = req.query.country as string | undefined;
  const limit = Math.min(parseInt((req.query.limit as string) ?? "50"), 200);

  try {
    if (country) {
      const results = await db
        .select({
          id: reportsTable.id,
          url: reportsTable.url,
          riskLevel: reportsTable.riskLevel,
          fraudType: reportsTable.fraudType,
          comment: reportsTable.comment,
          userId: reportsTable.userId,
          country: reportsTable.country,
          reportedAt: reportsTable.reportedAt,
          confidence: reportsTable.confidence,
          userName: usersTable.name,
          userAvatar: usersTable.avatar,
        })
        .from(reportsTable)
        .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
        .where(eq(reportsTable.country, country.toUpperCase()))
        .orderBy(desc(reportsTable.createdAt))
        .limit(limit);
      res.json({ reports: results, count: results.length });
      return;
    }

    const results = await db
      .select({
        id: reportsTable.id,
        url: reportsTable.url,
        riskLevel: reportsTable.riskLevel,
        fraudType: reportsTable.fraudType,
        comment: reportsTable.comment,
        userId: reportsTable.userId,
        country: reportsTable.country,
        reportedAt: reportsTable.reportedAt,
        confidence: reportsTable.confidence,
        userName: usersTable.name,
        userAvatar: usersTable.avatar,
      })
      .from(reportsTable)
      .leftJoin(usersTable, eq(reportsTable.userId, usersTable.id))
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit);

    res.json({ reports: results, count: results.length });
  } catch (err) {
    req.log.error({ err }, "Error fetching reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// GET /api/heroes — top reporters ranked by report count
router.get("/heroes", async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "20"), 50);

  try {
    const heroes = await db
      .select({
        userId: reportsTable.userId,
        reportCount: sql<number>`cast(count(*) as int)`,
      })
      .from(reportsTable)
      .where(sql`${reportsTable.userId} != 'anonymous'`)
      .groupBy(reportsTable.userId)
      .orderBy(sql`count(*) desc`)
      .limit(limit);

    const formatted = heroes.map((h, i) => ({
      id: h.userId ?? `hero-${i}`,
      name: h.userId ?? "Anónimo",
      reportCount: h.reportCount,
      rank: i + 1,
    }));

    res.json(formatted);
  } catch (err) {
    req.log.error({ err }, "Error fetching heroes");
    res.status(500).json({ error: "Failed to fetch heroes" });
  }
});

export default router;
