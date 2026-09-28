import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workshopsTable } from "./workshops";

export interface ArchiveClock {
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
}

export interface ArchivePayload {
  scenarioId: string;
  clock: ArchiveClock;
  teams: unknown[];
}

export const sessionArchivesTable = pgTable("session_archives", {
  id: uuid("id").primaryKey().defaultRandom(),
  workshopId: uuid("workshop_id")
    .notNull()
    .references(() => workshopsTable.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  teamCount: integer("team_count").notNull().default(0),
  submittedCount: integer("submitted_count").notNull().default(0),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
  scenarioId: text("scenario_id").notNull().default(""),
  payload: jsonb("payload").$type<ArchivePayload>().notNull(),
});

export type SessionArchiveRow = typeof sessionArchivesTable.$inferSelect;
