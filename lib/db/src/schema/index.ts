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

// ── Users ─────────────────────────────────────────────────────────────────
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatar: text("avatar"),
  country: varchar("country", { length: 10 }),
  phone: varchar("phone", { length: 30 }),
  visibility: varchar("visibility", { length: 20 }).default("standard"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ── Reports ───────────────────────────────────────────────────────────────
export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  userId: varchar("user_id", { length: 100 }),
  country: varchar("country", { length: 10 }),
  source: varchar("source", { length: 50 }).default("angel-browser"),
  explanation: text("explanation"),
  confidence: real("confidence"),
  reportCount: integer("report_count").default(1),
  fraudType: varchar("fraud_type", { length: 30 }),
  comment: text("comment"),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({
  id: true,
  createdAt: true,
  reportCount: true,
  reportedAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;

// ── Guardian Protection Relationships ──────────────────────────────────────
export const guardianRelationshipsTable = pgTable("guardian_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  guardianId: uuid("guardian_id").notNull(),
  protectedUserId: uuid("protected_user_id").notNull(),
  protectedUserEmail: text("protected_user_email"),
  protectedUserPhone: varchar("protected_user_phone", { length: 30 }),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuardianRelationshipSchema = createInsertSchema(guardianRelationshipsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGuardianRelationship = z.infer<typeof insertGuardianRelationshipSchema>;
export type GuardianRelationship = typeof guardianRelationshipsTable.$inferSelect;
