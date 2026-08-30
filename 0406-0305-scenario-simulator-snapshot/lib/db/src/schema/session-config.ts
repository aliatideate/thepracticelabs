import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workshopsTable } from "./workshops";

export const sessionConfigTable = pgTable("session_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  workshopId: uuid("workshop_id")
    .notNull()
    .unique()
    .references(() => workshopsTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type SessionConfigRow = typeof sessionConfigTable.$inferSelect;
export type InsertSessionConfigRow = typeof sessionConfigTable.$inferInsert;
