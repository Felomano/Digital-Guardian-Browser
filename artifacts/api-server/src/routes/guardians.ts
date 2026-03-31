import { Router } from "express";
import { db } from "@workspace/db";
import { guardianRelationshipsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// POST /api/guardian/add - Add a protected person
router.post("/guardian/add", async (req, res) => {
  const { guardianId, protectedUserEmail, protectedUserPhone } = req.body;

  if (!guardianId || (!protectedUserEmail && !protectedUserPhone)) {
    res.status(400).json({ error: "guardianId and protectedUserEmail or protectedUserPhone are required" });
    return;
  }

  try {
    const relationship = await db.insert(guardianRelationshipsTable).values({
      guardianId,
      protectedUserId: "", // Placeholder, filled if protected user exists
      protectedUserEmail: protectedUserEmail || null,
      protectedUserPhone: protectedUserPhone || null,
      isActive: 1,
    }).returning();

    res.json(relationship[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/guardian/circle/:guardianId - Get protected circle
router.get("/guardian/circle/:guardianId", async (req, res) => {
  const { guardianId } = req.params;

  try {
    const relationships = await db
      .select({
        id: guardianRelationshipsTable.id,
        protectedUserEmail: guardianRelationshipsTable.protectedUserEmail,
        protectedUserPhone: guardianRelationshipsTable.protectedUserPhone,
        isActive: guardianRelationshipsTable.isActive,
        createdAt: guardianRelationshipsTable.createdAt,
      })
      .from(guardianRelationshipsTable)
      .where(eq(guardianRelationshipsTable.guardianId, guardianId));

    res.json(relationships);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/guardian/toggle/:relationshipId - Toggle protection status
router.put("/guardian/toggle/:relationshipId", async (req, res) => {
  const { relationshipId } = req.params;
  const { isActive } = req.body;

  try {
    const updated = await db
      .update(guardianRelationshipsTable)
      .set({ isActive: isActive ? 1 : 0 })
      .where(eq(guardianRelationshipsTable.id, relationshipId))
      .returning();

    res.json(updated[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// DELETE /api/guardian/remove/:relationshipId - Remove from protected circle
router.delete("/guardian/remove/:relationshipId", async (req, res) => {
  const { relationshipId } = req.params;

  try {
    await db
      .delete(guardianRelationshipsTable)
      .where(eq(guardianRelationshipsTable.id, relationshipId));

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/guardian/alert - Send alert to guardian (triggered by risky site detection)
router.post("/guardian/alert", async (req, res) => {
  const { protectedUserName, dangerousUrl, riskLevel, guardianPhone } = req.body;

  if (!guardianPhone || !protectedUserName || !dangerousUrl || !riskLevel) {
    res.status(400).json({ error: "guardianPhone, protectedUserName, dangerousUrl, and riskLevel are required" });
    return;
  }

  try {
    // Message to send to WhatsApp
    const riskEmoji = riskLevel === "danger" ? "🚨" : "⚠️";
    const message = `${riskEmoji} Alerta de Angel: ${protectedUserName} ha intentado acceder a un sitio de riesgo (${riskLevel}). URL: ${dangerousUrl}. Por favor, verifica su seguridad.`;
    
    // Return the WhatsApp link for the client to open
    const whatsappLink = `whatsapp://send?phone=${guardianPhone}&text=${encodeURIComponent(message)}`;

    res.json({ 
      success: true,
      message,
      whatsappLink,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PUT /api/user/phone/:userId - Update user phone
router.put("/user/phone/:userId", async (req, res) => {
  const { userId } = req.params;
  const { phone } = req.body;

  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  try {
    const updated = await db
      .update(usersTable)
      .set({ phone })
      .where(eq(usersTable.id, userId))
      .returning();

    res.json(updated[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
