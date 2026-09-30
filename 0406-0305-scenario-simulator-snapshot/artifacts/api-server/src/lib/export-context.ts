import { eq } from "drizzle-orm";
import {
  clientsTable,
  db,
  exercisesTable,
  exerciseVersionsTable,
  workshopSessionsTable,
  workshopsTable,
} from "@workspace/db";
import {
  engineOf,
  type ExerciseEngine,
  type SharedCsvContext,
} from "./engine-contract";

/**
 * Resolve shared CSV metadata for a runtime workshop code.
 * Legacy DEFAULT/MART rooms without a workshop_sessions row get placeholders.
 */
export async function sharedCsvContextForCode(
  workshopCode: string,
): Promise<SharedCsvContext> {
  const code = workshopCode.trim().toUpperCase();
  const rows = await db
    .select({
      sessionTitle: workshopSessionsTable.title,
      clientName: clientsTable.name,
      exerciseTitle: exercisesTable.title,
      category: exercisesTable.category,
      format: exercisesTable.format,
    })
    .from(workshopsTable)
    .leftJoin(
      workshopSessionsTable,
      eq(workshopSessionsTable.runtimeWorkshopId, workshopsTable.id),
    )
    .leftJoin(clientsTable, eq(clientsTable.id, workshopSessionsTable.clientId))
    .leftJoin(
      exerciseVersionsTable,
      eq(exerciseVersionsTable.id, workshopSessionsTable.exerciseVersionId),
    )
    .leftJoin(exercisesTable, eq(exercisesTable.id, exerciseVersionsTable.exerciseId))
    .where(eq(workshopsTable.code, code))
    .limit(1);

  const row = rows[0];
  if (row?.exerciseTitle && row.format) {
    const format = row.format as ExerciseEngine;
    return {
      client: row.clientName ?? "",
      session: row.sessionTitle ?? code,
      exercise: row.exerciseTitle,
      category: row.category ?? "",
      engine: format,
    };
  }

  // Legacy Unilever rooms
  if (code === "MART" || code === "MART-TRY") {
    return {
      client: "Unilever UAE",
      session: code,
      exercise: "A Week in the Field",
      category: "decision-making",
      engine: "branching",
    };
  }
  return {
    client: "Unilever UAE",
    session: code,
    exercise: "The Demand Spike",
    category: "problem-framing",
    engine: "investigation",
  };
}

export function teamCsvFields(input: {
  format: string;
  displayName?: string | null;
  teamName: string;
  emoji?: string | null;
  currentScreen?: string | null;
  submittedAt?: Date | string | null;
  createdAt?: Date | string | null;
  endedAt?: Date | string | null;
}) {
  const engine = engineOf(input.format);
  const progress = engine.progressOf({
    currentScreen: input.currentScreen,
    submittedAt: input.submittedAt ?? null,
  });
  const team =
    input.displayName?.trim()
      ? `${input.emoji ? `${input.emoji} ` : ""}${input.displayName.trim()}`
      : input.teamName;
  const startedAt =
    input.createdAt instanceof Date
      ? input.createdAt.toISOString()
      : input.createdAt
        ? String(input.createdAt)
        : "";
  const endedAt =
    input.endedAt instanceof Date
      ? input.endedAt.toISOString()
      : input.endedAt
        ? String(input.endedAt)
        : input.submittedAt instanceof Date
          ? input.submittedAt.toISOString()
          : input.submittedAt
            ? String(input.submittedAt)
            : "";
  return {
    team,
    slot: input.teamName,
    startedAt,
    endedAt,
    progress: progress.progress,
    submitted: progress.done ? ("yes" as const) : ("no" as const),
  };
}
