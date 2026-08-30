import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { sessionsTable } from "./sessions";

export const moderatorNotesTable = pgTable("moderator_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessionsTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  templateId: text("template_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: "date" }),
});

export type ModeratorNoteRow = typeof moderatorNotesTable.$inferSelect;
export type InsertModeratorNoteRow = typeof moderatorNotesTable.$inferInsert;

export const accessRequestsTable = pgTable(
  "access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessionsTable.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "granted", "declined"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    pendingPerSessionUnique: uniqueIndex("access_requests_pending_per_session")
      .on(table.sessionId)
      .where(sql`status = 'pending'`),
  }),
);

export type AccessRequestRow = typeof accessRequestsTable.$inferSelect;
export type InsertAccessRequestRow = typeof accessRequestsTable.$inferInsert;
