import { eq } from "drizzle-orm";
import {
  db,
  exercisesTable,
  exerciseVersionsTable,
  workshopSessionsTable,
  workshopsTable,
} from "@workspace/db";
import { loadScenario, mediaUrl, type Scenario } from "./content";
import { asPublicDecisionGame, loadDecisionGame, publicDecisionGame } from "./decision-game";
import {
  DEMAND_TRY_WORKSHOP_CODE,
  MART_TRY_WORKSHOP_CODE,
  MART_WORKSHOP_CODE,
  WORKSHOP_CODE,
} from "./workshop";

export type WorkshopSessionSummary = {
  id: string;
  workshopCode: string;
  title: string;
  format: "investigation" | "branching";
  teamCount: number;
  durationMinutes: number;
  status: string;
  isPreview: boolean;
  runtimeWorkshopCode: string | null;
};

function enrichScenario(scenario: Scenario) {
  return {
    ...scenario,
    company: {
      ...scenario.company,
      logoUrl: mediaUrl(scenario.company.logo),
    },
    stakeholders: scenario.stakeholders.map((s) => ({
      ...s,
      avatarUrl: mediaUrl(s.avatar),
    })),
  };
}

export async function findWorkshopSessionByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  const rows = await db
    .select({
      session: workshopSessionsTable,
      format: exercisesTable.format,
      runtimeCode: workshopsTable.code,
    })
    .from(workshopSessionsTable)
    .innerJoin(
      exerciseVersionsTable,
      eq(exerciseVersionsTable.id, workshopSessionsTable.exerciseVersionId),
    )
    .innerJoin(exercisesTable, eq(exercisesTable.id, exerciseVersionsTable.exerciseId))
    .leftJoin(workshopsTable, eq(workshopsTable.id, workshopSessionsTable.runtimeWorkshopId))
    .where(eq(workshopSessionsTable.workshopCode, normalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function workshopSessionSummary(
  code: string,
): Promise<WorkshopSessionSummary | null> {
  const row = await findWorkshopSessionByCode(code);
  if (!row) return null;
  return {
    id: row.session.id,
    workshopCode: row.session.workshopCode,
    title: row.session.title,
    format: row.format as "investigation" | "branching",
    teamCount: row.session.teamCount,
    durationMinutes: row.session.durationMinutes,
    status: row.session.status,
    isPreview: row.session.isPreview,
    runtimeWorkshopCode: row.runtimeCode ?? null,
  };
}

export async function legacyAliasCodes() {
  return {
    demand: WORKSHOP_CODE,
    mart: MART_WORKSHOP_CODE,
    demandTry: DEMAND_TRY_WORKSHOP_CODE,
    martTry: MART_TRY_WORKSHOP_CODE,
  };
}

/** Scenario JSON for an investigation session code, or file fallback. */
export async function scenarioForCode(code?: string | null) {
  const key = (code ?? WORKSHOP_CODE).trim().toUpperCase() || WORKSHOP_CODE;
  const row = await findWorkshopSessionByCode(key);
  if (row?.format === "investigation" && row.session.resolvedContent) {
    return enrichScenario(row.session.resolvedContent as Scenario);
  }
  return enrichScenario(loadScenario());
}

/** Decision-game JSON for a branching session code, or file fallback. */
export async function decisionGameForCode(code?: string | null) {
  const key = (code ?? MART_WORKSHOP_CODE).trim().toUpperCase() || MART_WORKSHOP_CODE;
  const row = await findWorkshopSessionByCode(key);
  if (row?.format === "branching" && row.session.resolvedContent) {
    return asPublicDecisionGame(row.session.resolvedContent);
  }
  return publicDecisionGame();
}

export async function decisionGameFacilitatorForCode(code?: string | null) {
  const key = (code ?? MART_WORKSHOP_CODE).trim().toUpperCase() || MART_WORKSHOP_CODE;
  const row = await findWorkshopSessionByCode(key);
  if (row?.format === "branching" && row.session.resolvedContent) {
    return row.session.resolvedContent;
  }
  return loadDecisionGame();
}

export async function setWorkshopSessionStatusByRuntimeCode(
  runtimeCode: string,
  status: "ready" | "live" | "ended",
) {
  const ws = await db
    .select({ id: workshopsTable.id })
    .from(workshopsTable)
    .where(eq(workshopsTable.code, runtimeCode))
    .limit(1);
  const workshopId = ws[0]?.id;
  if (!workshopId) return;
  const patch: Partial<typeof workshopSessionsTable.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };
  if (status === "ended") patch.endedAt = new Date();
  if (status === "ready") patch.endedAt = null;
  await db
    .update(workshopSessionsTable)
    .set(patch)
    .where(eq(workshopSessionsTable.runtimeWorkshopId, workshopId));
}
