import { boolean, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { workshopsTable } from "./workshops";

export interface DecisionChoice {
  decisionId: string;
  optionId: string;
  at: string;
}

export const decisionSessionsTable = pgTable(
  "decision_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshopsTable.id, { onDelete: "cascade" }),
    teamName: text("team_name").notNull(),
    displayName: text("display_name").notNull().default(""),
    emoji: text("emoji").notNull().default(""),
    currentScreen: text("current_screen").notNull().default("intro"),
    decisionIndex: integer("decision_index").notNull().default(0),
    choices: jsonb("choices").$type<DecisionChoice[]>().notNull().default([]),
    flaggedForDebrief: boolean("flagged_for_debrief").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    workshopTeamUnique: unique("decision_sessions_workshop_team_unique").on(
      t.workshopId,
      t.teamName,
    ),
  }),
);

export type DecisionSessionRow = typeof decisionSessionsTable.$inferSelect;
