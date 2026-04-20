import {
  pgTable,
  text,
  timestamp,
  uuid,
  real,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ... otras tablas ...

// ── Guardian Protection Relationships ──────────────────────────────────────
export const guardianRelationshipsTable = pgTable("guardian_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  guardianId: uuid("guardian_id").notNull(),
  protectedUserId: uuid("protected_user_id").notNull(),
  protectedUserEmail: text("protected_user_email"),
  protectedUserPhone: varchar("protected_user_phone", { length: 30 }),
  name: text("name"), // ✅ AGREGADO: nombre del familiar protegido
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuardianRelationshipSchema = createInsertSchema(guardianRelationshipsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGuardianRelationship = z.infer<typeof insertGuardianRelationshipSchema>;
export type GuardianRelationship = typeof guardianRelationshipsTable.$inferSelect;
