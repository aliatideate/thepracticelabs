import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { exercisesTable } from "./exercises";
import { usersTable } from "./users";

/** Declared editable variable schema (Phase 4). v1 seeds use []. */
export type ExerciseVariableDef = {
  key: string;
  label: string;
  type: "text" | "image";
  default?: string;
  maxLength?: number;
  required?: boolean;
};

/** Path refs under /content/media/… (or relative content filenames). */
export type ExerciseDefaultAssets = Record<string, unknown>;

export const exerciseVersionsTable = pgTable(
  "exercise_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: jsonb("content").$type<unknown>().notNull(),
    facilitatorNotes: text("facilitator_notes"),
    variables: jsonb("variables").$type<ExerciseVariableDef[]>().notNull().default([]),
    defaultAssets: jsonb("default_assets")
      .$type<ExerciseDefaultAssets>()
      .notNull()
      .default({}),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    exerciseVersionUnique: unique("exercise_versions_exercise_version_unique").on(
      t.exerciseId,
      t.version,
    ),
  }),
);

export type ExerciseVersionRow = typeof exerciseVersionsTable.$inferSelect;
export type InsertExerciseVersionRow = typeof exerciseVersionsTable.$inferInsert;
