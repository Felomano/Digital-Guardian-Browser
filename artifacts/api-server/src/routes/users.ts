import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/user/:id
router.get("/user/:id", async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.params.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    req.log.error({ err }, "Error fetching user");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/user — create or get user (upsert by email)
router.post("/user", async (req, res) => {
  const { name, email, avatar, country } = req.body;

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  try {
    // Try to find existing user
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing[0]) {
      res.json({ user: existing[0], created: false });
      return;
    }

    // Create new user
    const [user] = await db
      .insert(usersTable)
      .values({
        name: name ?? email.split("@")[0],
        email,
        avatar: avatar ?? null,
        country: country ?? null,
      })
      .returning();

    res.status(201).json({ user, created: true });
  } catch (err) {
    req.log.error({ err }, "Error creating user");
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/user/profile
router.put("/user/profile", async (req, res) => {
  const { userId, country, phone, visibility } = req.body;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (country !== undefined) updateData.country = country;
    if (phone !== undefined) updateData.phone = phone;
    if (visibility !== undefined) updateData.visibility = visibility;

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: updated });
  } catch (err) {
    req.log.error({ err }, "Error updating profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
