import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { organisationsTable } from "./organisations";
import { usersTable } from "./users";

export const EXERCISE_CATEGORIES = [
  "problem-framing",
  "decision-making",
  "ideation",
  "prototyping",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISE_FORMATS = ["investigation", "branching"] as const;

export type ExerciseFormat = (typeof EXERCISE_FORMATS)[number];

export const EXERCISE_STATUSES = ["published", "in_design"] as const;

export type ExerciseStatus = (typeof EXERCISE_STATUSES)[number];

export const exercisesTable = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organisationsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category", { enum: EXERCISE_CATEGORIES }).notNull(),
    format: text("format", { enum: EXERCISE_FORMATS }).notNull(),
    status: text("status", { enum: EXERCISE_STATUSES }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orgTitleUnique: unique("exercises_org_title_unique").on(t.orgId, t.title),
  }),
);

export type ExerciseRow = typeof exercisesTable.$inferSelect;
export type InsertExerciseRow = typeof exercisesTable.$inferInsert;
