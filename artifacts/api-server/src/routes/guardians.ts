import { Router } from "express";
import { db } from "@workspace/db";
import { guardianRelationshipsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// POST /api/guardian/add - Add a protected person
router.post("/guardian/add", async (req, res) => {
  const { guardianId, protectedUserEmail, protectedUserPhone, name } = req.body;

  if (!guardianId || (!protectedUserEmail && !protectedUserPhone)) {
    res.status(400).json({ 
      error: "guardianId and (protectedUserEmail or protectedUserPhone) are required" 
    });
    return;
  }

  try {
    const relationship = await db.insert(guardianRelationshipsTable).values({
      guardianId,
      protectedUserId: "",
      protectedUserEmail: protectedUserEmail || null,
      protectedUserPhone: protectedUserPhone || null,
      name: name || null, // ✅ AGREGADO: guardar nombre
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
    const circle = await db
      .select()
      .from(guardianRelationshipsTable)
      .where(
        and(
          eq(guardianRelationshipsTable.guardianId, guardianId),
          eq(guardianRelationshipsTable.isActive, 1)
        )
      );

    res.json(circle);
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

export default router;
