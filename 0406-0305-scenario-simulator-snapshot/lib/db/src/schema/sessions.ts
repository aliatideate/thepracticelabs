import { pgTable, text, timestamp, uuid, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { workshopsTable } from "./workshops";

export interface AnswerRecord {
  questionId: string;
  selected: "A" | "B" | "C";
}

export type StepKey =
  | "brief"
  | "stakeholder"
  | "interview"
  | "evidence"
  | "define"
  | "submit";

export interface StepTimings {
  totals: Partial<Record<StepKey, number>>;
  currentStep: StepKey | null;
  currentStepStartedAt: string | null;
}

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshopsTable.id, { onDelete: "cascade" }),
    teamName: text("team_name").notNull(),
    currentScreen: text("current_screen").notNull().default("company"),
    selectedStakeholder: text("selected_stakeholder"),
    selectedEvidenceSource: text("selected_evidence_source"),
    answers: jsonb("answers").$type<AnswerRecord[]>().notNull().default([]),
    problemStatement: text("problem_statement").notNull().default(""),
    confidence: text("confidence", { enum: ["Low", "Medium", "High"] }),
    assumption: text("assumption").notNull().default(""),
    flaggedForDebrief: boolean("flagged_for_debrief").notNull().default(false),
    stepTimings: jsonb("step_timings")
      .$type<StepTimings>()
      .notNull()
      .default({ totals: {}, currentStep: null, currentStepStartedAt: null }),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    workshopTeamUnique: unique("sessions_workshop_team_unique").on(
      t.workshopId,
      t.teamName,
    ),
  }),
);

export type SessionRow = typeof sessionsTable.$inferSelect;
export type InsertSessionRow = typeof sessionsTable.$inferInsert;
