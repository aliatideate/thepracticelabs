import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  sessionArchivesTable,
  sessionsTable,
  type SessionRow,
} from "@workspace/db";
import { loadScenario } from "../lib/content";
import { assertFacilitator } from "../lib/auth";
import { defaultWorkshopId, getOrCreateConfig } from "../lib/session-clock";

const router: IRouter = Router();

function emptyTimings() {
  return { totals: {}, currentStep: null, currentStepStartedAt: null };
}

function serializeTeam(row: SessionRow, workshopCode: string) {
  return {
    id: row.id,
    workshopId: row.workshopId,
    workshopCode,
    teamName: row.teamName,
    displayName: row.displayName ?? "",
    emoji: row.emoji ?? "",
    currentScreen: row.currentScreen,
    selectedStakeholder: row.selectedStakeholder,
    selectedEvidenceSource: row.selectedEvidenceSource,
    answers: row.answers ?? [],
    problemStatement: row.problemStatement,
    confidence: row.confidence,
    assumption: row.assumption,
    flaggedForDebrief: row.flaggedForDebrief,
    stepTimings: row.stepTimings ?? emptyTimings(),
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}


function summary(row: typeof sessionArchivesTable.$inferSelect) {
  return {
    id: row.id,
    savedAt: row.savedAt.toISOString(),
    teamCount: row.teamCount,
    submittedCount: row.submittedCount,
    durationMinutes: row.durationMinutes,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    scenarioId: row.scenarioId,
  };
}

router.get("/archives", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await defaultWorkshopId();
  const rows = await db
    .select()
    .from(sessionArchivesTable)
    .where(eq(sessionArchivesTable.workshopId, workshopId))
    .orderBy(desc(sessionArchivesTable.savedAt));
  return res.json(rows.map(summary));
});

router.get("/archives/:id", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await defaultWorkshopId();
  const rows = await db
    .select()
    .from(sessionArchivesTable)
    .where(eq(sessionArchivesTable.id, String(req.params.id)))
    .limit(1);
  const row = rows[0];
  if (!row || row.workshopId !== workshopId) {
    return res.status(404).json({ error: "not found" });
  }
  return res.json({
    ...summary(row),
    payload: row.payload,
  });
});

router.post("/archives", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await defaultWorkshopId();
  const scenario = loadScenario();
  const clock = await getOrCreateConfig();
  const teams = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.workshopId, workshopId))
    .orderBy(asc(sessionsTable.teamName));
  if (teams.length === 0) {
    return res.status(400).json({ error: "no teams to save" });
  }
  const serialized = teams.map((t) => serializeTeam(t, "DEFAULT"));
  const submittedCount = serialized.filter((t) => t.submittedAt).length;
  const payload = {
    scenarioId: scenario.id,
    clock: {
      startedAt: clock.startedAt ? clock.startedAt.toISOString() : null,
      endedAt: clock.endedAt ? clock.endedAt.toISOString() : null,
      durationMinutes: clock.durationMinutes,
    },
    teams: serialized,
  };
  const inserted = await db
    .insert(sessionArchivesTable)
    .values({
      workshopId,
      teamCount: teams.length,
      submittedCount,
      durationMinutes: clock.durationMinutes,
      startedAt: clock.startedAt,
      endedAt: clock.endedAt,
      scenarioId: scenario.id,
      payload,
    })
    .returning();
  return res.status(201).json(summary(inserted[0]!));
});

export default router;
