import { Router } from "express";
import { analyzeUrl } from "../services/security.js";

const router = Router();

// GET /api/check-security?url=https://...
router.get("/check-security", async (req, res) => {
  const url = req.query.url as string | undefined;

  if (!url) {
    res.status(400).json({ error: "Missing url query parameter" });
    return;
  }

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  try {
    const result = await analyzeUrl(normalizedUrl);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error analyzing URL");
    res.status(500).json({ error: "Analysis failed", risk_level: "unknown" });
  }
});

export default router;
