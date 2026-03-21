import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// POST /api/report
router.post("/report", async (req, res) => {
  const { url, userId, risk_level, country, source, explanation, confidence } = req.body;

  if (!url || !risk_level) {
    res.status(400).json({ error: "url and risk_level are required" });
    return;
  }

  try {
    // Check if this URL was already reported by this user
    let existing = null;
    if (userId) {
      const found = await db
        .select()
        .from(reportsTable)
        .where(sql`${reportsTable.url} = ${url} AND ${reportsTable.userId} = ${userId}`)
        .limit(1);
      existing = found[0] ?? null;
    }

    if (existing) {
      // Update report count
      const [updated] = await db
        .update(reportsTable)
        .set({
          riskLevel: risk_level,
          country: country ?? existing.country,
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
  const limit = Math.min(parseInt(req.query.limit as string ?? "50"), 200);

  try {
    let query = db
      .select()
      .from(reportsTable)
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit);

    if (country) {
      // Filter by country using SQL
      const results = await db
        .select()
        .from(reportsTable)
        .where(eq(reportsTable.country, country.toUpperCase()))
        .orderBy(desc(reportsTable.createdAt))
        .limit(limit);
      res.json({ reports: results, count: results.length });
      return;
    }

    const results = await query;
    res.json({ reports: results, count: results.length });
  } catch (err) {
    req.log.error({ err }, "Error fetching reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// GET /api/heroes — top reporters
router.get("/heroes", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string ?? "10"), 50);

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
      rank: i + 1,
      name: h.userId ?? "Anónimo",
      reports: h.reportCount,
    }));

    res.json({ heroes: formatted });
  } catch (err) {
    req.log.error({ err }, "Error fetching heroes");
    res.status(500).json({ error: "Failed to fetch heroes" });
  }
});

export default router;
