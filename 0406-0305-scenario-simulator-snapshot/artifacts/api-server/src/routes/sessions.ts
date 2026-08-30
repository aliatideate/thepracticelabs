import { Router, type IRouter } from "express";
import { eq, isNotNull, asc, and } from "drizzle-orm";
// listSessions added so the moderator dashboard can show live progress.
import {
  CreateOrResumeSessionBody,
  GetSessionParams,
  UpdateSessionParams,
  UpdateSessionBody,
  SubmitSessionParams,
  SubmitSessionBody,
  DeleteSessionParams,
  ResetSessionParams,
  SetSessionFlagParams,
  SetSessionFlagBody,
  ListSessionsQueryParams,
  ListSubmissionsQueryParams,
} from "@workspace/api-zod";
import {
  db,
  sessionsTable,
  workshopsTable,
  type SessionRow,
  type StepKey,
  type StepTimings,
} from "@workspace/db";
import { submissionsBus } from "../lib/events";

const router: IRouter = Router();

interface SerializeContext {
  workshopCode: string;
}

const QUESTION_SCREENS = new Set(["q1", "q2", "q3", "q4"]);

function screenToStep(screen: string, submitted: boolean): StepKey | null {
  if (submitted) return "submit";
  if (QUESTION_SCREENS.has(screen)) return "interview";
  switch (screen) {
    case "entry":
      return null;
    case "company":
    case "scenario":
      return "brief";
    case "investigate":
      return "stakeholder";
    case "intro":
      return "interview";
    case "evidence":
    case "evidence_reveal":
      return "evidence";
    case "insights":
    case "problem":
      return "define";
    case "confirm":
      return "submit";
    default:
      return null;
  }
}

function emptyTimings(): StepTimings {
  return { totals: {}, currentStep: null, currentStepStartedAt: null };
}

// Roll forward step timings from `prev` to `nextStep`, accumulating elapsed
// time on the previously-active step into `totals` when stepping changes.
function advanceTimings(
  prev: StepTimings | null | undefined,
  nextStep: StepKey | null,
  now: Date,
): StepTimings {
  const base: StepTimings = prev
    ? {
        totals: { ...(prev.totals ?? {}) },
        currentStep: prev.currentStep ?? null,
        currentStepStartedAt: prev.currentStepStartedAt ?? null,
      }
    : emptyTimings();

  if (base.currentStep === nextStep) {
    if (nextStep && !base.currentStepStartedAt) {
      base.currentStepStartedAt = now.toISOString();
    }
    return base;
  }

  if (base.currentStep && base.currentStepStartedAt) {
    const startedAt = new Date(base.currentStepStartedAt).getTime();
    const elapsed = Math.max(0, now.getTime() - startedAt);
    base.totals[base.currentStep] =
      (base.totals[base.currentStep] ?? 0) + elapsed;
  }

  base.currentStep = nextStep;
  base.currentStepStartedAt = nextStep ? now.toISOString() : null;
  return base;
}

function publish(
  type: "submission.created" | "submission.updated" | "submission.deleted",
  sessionId: string,
  workshopId: string,
  workshopCode: string,
) {
  submissionsBus.emitSubmission({
    type,
    sessionId,
    workshopId,
    workshopCode,
    at: new Date().toISOString(),
  });
}

function serialize(row: SessionRow, ctx: SerializeContext) {
  return {
    id: row.id,
    workshopId: row.workshopId,
    workshopCode: ctx.workshopCode,
    teamName: row.teamName,
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

async function loadWorkshopCodeMap(
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({ id: workshopsTable.id, code: workshopsTable.code })
    .from(workshopsTable);
  for (const r of rows) map.set(r.id, r.code);
  return map;
}

async function workshopCodeFor(id: string): Promise<string> {
  const rows = await db
    .select({ code: workshopsTable.code })
    .from(workshopsTable)
    .where(eq(workshopsTable.id, id))
    .limit(1);
  return rows[0]?.code ?? "";
}

router.get("/sessions", async (req, res) => {
  const query = ListSessionsQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: query.error.flatten() });
  }
  const filterCode = query.data.workshopCode?.toUpperCase();

  let workshopId: string | null = null;
  if (filterCode) {
    const ws = await db
      .select({ id: workshopsTable.id })
      .from(workshopsTable)
      .where(eq(workshopsTable.code, filterCode))
      .limit(1);
    if (!ws[0]) return res.json([]);
    workshopId = ws[0].id;
  }

  const rows = workshopId
    ? await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.workshopId, workshopId))
        .orderBy(asc(sessionsTable.teamName))
    : await db
        .select()
        .from(sessionsTable)
        .orderBy(asc(sessionsTable.teamName));

  const codeMap = await loadWorkshopCodeMap(rows.map((r) => r.workshopId));
  return res.json(
    rows.map((r) => serialize(r, { workshopCode: codeMap.get(r.workshopId) ?? "" })),
  );
});

router.post("/sessions", async (req, res) => {
  const parsed = CreateOrResumeSessionBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const teamName = parsed.data.teamName.trim();
  const workshopCode = parsed.data.workshopCode.trim().toUpperCase();
  if (!teamName) return res.status(400).json({ error: "teamName required" });
  if (!workshopCode)
    return res.status(400).json({ error: "workshopCode required" });

  const workshopRows = await db
    .select()
    .from(workshopsTable)
    .where(eq(workshopsTable.code, workshopCode))
    .limit(1);
  const workshop = workshopRows[0];
  if (!workshop) return res.status(404).json({ error: "workshop not found" });

  const existing = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.workshopId, workshop.id),
        eq(sessionsTable.teamName, teamName),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return res.json(serialize(existing[0], { workshopCode: workshop.code }));
  }

  const now = new Date();
  const inserted = await db
    .insert(sessionsTable)
    .values({
      teamName,
      workshopId: workshop.id,
      stepTimings: advanceTimings(null, screenToStep("company", false), now),
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    req.log.error("failed to insert session");
    return res.status(500).json({ error: "insert failed" });
  }
  publish("submission.created", row.id, workshop.id, workshop.code);
  return res.json(serialize(row, { workshopCode: workshop.code }));
});

router.get("/sessions/:id", async (req, res) => {
  const parsed = GetSessionParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, parsed.data.id))
    .limit(1);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const code = await workshopCodeFor(row.workshopId);
  return res.json(serialize(row, { workshopCode: code }));
});

router.patch("/sessions/:id", async (req, res) => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const body = UpdateSessionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }

  const now = new Date();
  const updates: Partial<typeof sessionsTable.$inferInsert> = {
    updatedAt: now,
  };
  if (body.data.currentScreen !== undefined) {
    updates.currentScreen = body.data.currentScreen;
    const existingRows = await db
      .select({ stepTimings: sessionsTable.stepTimings, submittedAt: sessionsTable.submittedAt })
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.data.id))
      .limit(1);
    const prev = existingRows[0]?.stepTimings ?? null;
    const submitted = !!existingRows[0]?.submittedAt;
    updates.stepTimings = advanceTimings(
      prev,
      screenToStep(body.data.currentScreen, submitted),
      now,
    );
  }
  if (body.data.selectedStakeholder !== undefined)
    updates.selectedStakeholder = body.data.selectedStakeholder ?? null;
  if (body.data.selectedEvidenceSource !== undefined)
    updates.selectedEvidenceSource = body.data.selectedEvidenceSource ?? null;
  if (body.data.answers !== undefined) updates.answers = body.data.answers;
  if (body.data.problemStatement !== undefined)
    updates.problemStatement = body.data.problemStatement;
  if (body.data.confidence !== undefined)
    updates.confidence = body.data.confidence;
  if (body.data.assumption !== undefined)
    updates.assumption = body.data.assumption;

  const updated = await db
    .update(sessionsTable)
    .set(updates)
    .where(eq(sessionsTable.id, params.data.id))
    .returning();
  const row = updated[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const code = await workshopCodeFor(row.workshopId);
  publish("submission.updated", row.id, row.workshopId, code);
  return res.json(serialize(row, { workshopCode: code }));
});

router.delete("/sessions/:id", async (req, res) => {
  const parsed = DeleteSessionParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const deleted = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.id, parsed.data.id))
    .returning();
  const row = deleted[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const code = await workshopCodeFor(row.workshopId);
  publish("submission.deleted", parsed.data.id, row.workshopId, code);
  return res.status(204).end();
});

router.post("/sessions/:id/reset", async (req, res) => {
  const parsed = ResetSessionParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const now = new Date();
  const updated = await db
    .update(sessionsTable)
    .set({
      currentScreen: "company",
      selectedStakeholder: null,
      selectedEvidenceSource: null,
      answers: [],
      problemStatement: "",
      confidence: null,
      assumption: "",
      submittedAt: null,
      stepTimings: advanceTimings(null, screenToStep("company", false), now),
      updatedAt: now,
    })
    .where(eq(sessionsTable.id, parsed.data.id))
    .returning();
  const row = updated[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const code = await workshopCodeFor(row.workshopId);
  publish("submission.updated", row.id, row.workshopId, code);
  return res.json(serialize(row, { workshopCode: code }));
});

router.post("/sessions/:id/submit", async (req, res) => {
  const params = SubmitSessionParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const body = SubmitSessionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }

  const now = new Date();
  const existingRows = await db
    .select({ stepTimings: sessionsTable.stepTimings })
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id))
    .limit(1);
  const prev = existingRows[0]?.stepTimings ?? null;
  const updated = await db
    .update(sessionsTable)
    .set({
      problemStatement: body.data.problemStatement,
      confidence: body.data.confidence,
      assumption: body.data.assumption,
      selectedStakeholder: body.data.selectedStakeholder,
      selectedEvidenceSource: body.data.selectedEvidenceSource,
      currentScreen: "confirm",
      submittedAt: now,
      stepTimings: advanceTimings(prev, "submit", now),
      updatedAt: now,
    })
    .where(eq(sessionsTable.id, params.data.id))
    .returning();
  const row = updated[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const code = await workshopCodeFor(row.workshopId);
  publish("submission.created", row.id, row.workshopId, code);
  return res.json(serialize(row, { workshopCode: code }));
});

router.post("/sessions/:id/flag", async (req, res) => {
  const params = SetSessionFlagParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: params.error.flatten() });
  }
  const body = SetSessionFlagBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }
  const updated = await db
    .update(sessionsTable)
    .set({ flaggedForDebrief: body.data.flagged, updatedAt: new Date() })
    .where(eq(sessionsTable.id, params.data.id))
    .returning();
  const row = updated[0];
  if (!row) return res.status(404).json({ error: "not found" });
  const code = await workshopCodeFor(row.workshopId);
  submissionsBus.emitSubmission({
    type: "flag.changed",
    sessionId: row.id,
    workshopId: row.workshopId,
    workshopCode: code,
    flagged: row.flaggedForDebrief,
    at: new Date().toISOString(),
  });
  return res.json(serialize(row, { workshopCode: code }));
});

router.get("/submissions", async (req, res) => {
  const query = ListSubmissionsQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: query.error.flatten() });
  }
  const filterCode = query.data.workshopCode?.toUpperCase();

  let workshopId: string | null = null;
  if (filterCode) {
    const ws = await db
      .select({ id: workshopsTable.id })
      .from(workshopsTable)
      .where(eq(workshopsTable.code, filterCode))
      .limit(1);
    if (!ws[0]) return res.json([]);
    workshopId = ws[0].id;
  }

  const where = workshopId
    ? and(
        isNotNull(sessionsTable.submittedAt),
        eq(sessionsTable.workshopId, workshopId),
      )
    : isNotNull(sessionsTable.submittedAt);

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(where)
    .orderBy(asc(sessionsTable.submittedAt));

  const codeMap = await loadWorkshopCodeMap(rows.map((r) => r.workshopId));
  return res.json(
    rows.map((r) =>
      serialize(r, { workshopCode: codeMap.get(r.workshopId) ?? "" }),
    ),
  );
});

export default router;
