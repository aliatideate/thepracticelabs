import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organisationsTable } from "./organisations";
import { clientsTable } from "./clients";
import { clientCopiesTable } from "./client-copies";
import { exerciseVersionsTable } from "./exercise-versions";
import { usersTable } from "./users";

export const WORKSHOP_SESSION_MODES = ["in_person", "remote", "hybrid"] as const;

export type WorkshopSessionMode = (typeof WORKSHOP_SESSION_MODES)[number];

export const WORKSHOP_SESSION_STATUSES = ["ready", "live", "ended"] as const;

export type WorkshopSessionStatus = (typeof WORKSHOP_SESSION_STATUSES)[number];

/**
 * Creator / workshop run. Named workshop_sessions to avoid colliding with
 * the runtime per-team `sessions` table.
 */
export const workshopSessionsTable = pgTable(
  "workshop_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    clientCopyId: uuid("client_copy_id")
      .notNull()
      .references(() => clientCopiesTable.id),
    exerciseVersionId: uuid("exercise_version_id")
      .notNull()
      .references(() => exerciseVersionsTable.id),
    variableValues: jsonb("variable_values")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    title: text("title").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    teamCount: integer("team_count").notNull(),
    mode: text("mode", { enum: WORKSHOP_SESSION_MODES }).notNull(),
    workshopCode: text("workshop_code").notNull(),
    resolvedContent: jsonb("resolved_content").$type<unknown>().notNull(),
    resolvedFacilitatorNotes: text("resolved_facilitator_notes"),
    facilitatorTokenHash: text("facilitator_token_hash"),
    status: text("status", { enum: WORKSHOP_SESSION_STATUSES }).notNull(),
    isPreview: boolean("is_preview").notNull().default(false),
    previewExpiresAt: timestamp("preview_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
  },
  (t) => ({
    workshopCodeUnique: uniqueIndex("workshop_sessions_workshop_code_unique").on(
      t.workshopCode,
    ),
    clientCreatedIdx: index("workshop_sessions_client_created_idx").on(
      t.clientId,
      t.createdAt,
    ),
    orgStatusIdx: index("workshop_sessions_org_status_idx").on(t.orgId, t.status),
    previewCleanupIdx: index("workshop_sessions_preview_cleanup_idx")
      .on(t.previewExpiresAt)
      .where(sql`${t.isPreview} = true`),
  }),
);

export type WorkshopSessionRow = typeof workshopSessionsTable.$inferSelect;
export type InsertWorkshopSessionRow = typeof workshopSessionsTable.$inferInsert;
