import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { clientsTable } from "./clients";
import { usersTable } from "./users";
import { EXERCISE_CATEGORIES } from "./exercises";
import { WORKSHOP_SESSION_MODES } from "./workshop-sessions";

export const BRIEF_STATUSES = ["in_design"] as const;

export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export const briefsTable = pgTable("briefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisationsTable.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clientsTable.id),
  title: text("title").notNull(),
  category: text("category", { enum: EXERCISE_CATEGORIES }).notNull(),
  audience: text("audience").notNull(),
  skill: text("skill").notNull(),
  debriefFocus: text("debrief_focus").notNull(),
  setting: text("setting").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  teamCount: integer("team_count").notNull(),
  mode: text("mode", { enum: WORKSHOP_SESSION_MODES }).notNull(),
  status: text("status", { enum: BRIEF_STATUSES }).notNull().default("in_design"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type BriefRow = typeof briefsTable.$inferSelect;
export type InsertBriefRow = typeof briefsTable.$inferInsert;
