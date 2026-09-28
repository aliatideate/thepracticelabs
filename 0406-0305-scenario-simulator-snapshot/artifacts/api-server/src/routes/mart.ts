import { assertFacilitator, resolveAuth } from "../lib/auth";
import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  decisionSessionsTable,
  sessionArchivesTable,
  sessionConfigTable,
  workshopSessionsTable,
  type DecisionChoice,
  type DecisionSessionRow,
} from "@workspace/db";
import {
  MART_DURATION_MINUTES,
  MART_TRY_WORKSHOP_CODE,
  MART_WORKSHOP_CODE,
    isAllowedTeamEmoji,
  isAllowedTeamName,
  normalizeDisplayName,
} from "../lib/workshop";
import { loadDecisionGame } from "../lib/decision-game";
import { optionFor, revealBreakdown, revealStories, scoreOf, tagLine, weekLine } from "../lib/decision-engine";
import { clearClock, startTimerIfIdle, workshopIdFor, getOrCreateConfig } from "../lib/session-clock";
import {
  decisionGameFacilitatorForCode,
  decisionGameForCode,
  setWorkshopSessionStatusByRuntimeCode,
} from "../lib/workshop-session";

const router: IRouter = Router();

function serializeClock(row: typeof sessionConfigTable.$inferSelect) {
  return {
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    durationMinutes: row.durationMinutes,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serialize(row: DecisionSessionRow, includeFacilitator: boolean, workshopCode = MART_WORKSHOP_CODE) {
  const choices = row.choices ?? [];
  const base = {
    id: row.id,
    workshopCode,
    teamName: row.teamName,
    displayName: row.displayName,
    emoji: row.emoji,
    currentScreen: row.currentScreen,
    decisionIndex: row.decisionIndex,
    choices: choices.map((c) => ({
      decisionId: c.decisionId,
      optionId: c.optionId,
      at: c.at,
    })),
    flaggedForDebrief: row.flaggedForDebrief,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (!includeFacilitator) return base;
  const game = loadDecisionGame();
  const score = scoreOf(game, choices);
  return {
    ...base,
    score: score.total,
    maxScore: score.maxTotal,
    slowLost: score.slowLost,
    fastLost: score.fastLost,
    style: score.style,
    styleLabel: score.styleLabel,
  };
}

async function loadDecision(id: string, workshopId?: string) {
  const rows = await db
    .select()
    .from(decisionSessionsTable)
    .where(eq(decisionSessionsTable.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (workshopId && row.workshopId !== workshopId) return null;
  return row;
}

function archiveSummary(row: typeof sessionArchivesTable.$inferSelect) {
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

router.get("/decision-game", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  return res.json(await decisionGameForCode(code));
});

router.get("/decision-game/facilitator", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  return res.json(await decisionGameFacilitatorForCode(code));
});

router.get("/mart/session-config", async (_req, res) => {
  const row = await getOrCreateConfig(MART_WORKSHOP_CODE);
  return res.json(serializeClock(row));
});

router.post("/mart/session-config/start", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const now = new Date();
  const updated = await db
    .update(sessionConfigTable)
    .set({
      startedAt: now,
      endedAt: null,
      durationMinutes: MART_DURATION_MINUTES,
      updatedAt: now,
    })
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .returning();
  return res.json(serializeClock(updated[0] ?? (await getOrCreateConfig(MART_WORKSHOP_CODE))));
});

router.patch("/mart/session-config", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const body = req.body as { durationMinutes?: number; end?: boolean };
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const now = new Date();
  const updates: Partial<typeof sessionConfigTable.$inferInsert> = { updatedAt: now };
  if (typeof body.durationMinutes === "number" && body.durationMinutes > 0) {
    updates.durationMinutes = Math.round(body.durationMinutes);
    updates.endedAt = null;
  }
  if (body.end === true) updates.endedAt = now;
  const updated = await db
    .update(sessionConfigTable)
    .set(updates)
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .returning();
  if (!updated[0]) return res.status(404).json({ error: "not found" });
  if (body.end === true) {
    await setWorkshopSessionStatusByRuntimeCode(MART_WORKSHOP_CODE, "ended");
  }
  return res.json(serializeClock(updated[0]));
});

router.get("/mart/sessions", async (req, res) => {
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  // Public list for join UI; facilitator fields only when authenticated.
  const fac = !!(await resolveAuth(req));
  const rows = await db
    .select()
    .from(decisionSessionsTable)
    .where(eq(decisionSessionsTable.workshopId, workshopId))
    .orderBy(asc(decisionSessionsTable.teamName));
  return res.json(rows.map((r) => serialize(r, fac)));
});

router.post("/mart/sessions", async (req, res) => {
  const body = req.body as { teamName?: string; displayName?: string; emoji?: string };
  const teamName = (body.teamName ?? "").trim();
  const displayName = normalizeDisplayName(body.displayName ?? "");
  const emoji = (body.emoji ?? "").trim();
  if (!isAllowedTeamName(teamName)) return res.status(400).json({ error: "invalid team" });
  if (!displayName) return res.status(400).json({ error: "invalid displayName" });
  if (!isAllowedTeamEmoji(emoji)) return res.status(400).json({ error: "invalid emoji" });

  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const existing = await db
    .select()
    .from(decisionSessionsTable)
    .where(
      and(
        eq(decisionSessionsTable.workshopId, workshopId),
        eq(decisionSessionsTable.teamName, teamName),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return res.status(409).json({ error: "team claimed", sessionId: existing[0].id });
  }

  const now = new Date();
  const inserted = await db
    .insert(decisionSessionsTable)
    .values({
      workshopId,
      teamName,
      displayName,
      emoji,
      currentScreen: "intro",
      decisionIndex: 0,
      choices: [],
    })
    .returning();
  const row = inserted[0];
  if (!row) return res.status(500).json({ error: "insert failed" });
  await startTimerIfIdle(now, MART_WORKSHOP_CODE);
  return res.json(serialize(row, false));
});

router.post("/mart/sessions/reset-all", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const deleted = await db
    .delete(decisionSessionsTable)
    .where(eq(decisionSessionsTable.workshopId, workshopId))
    .returning({ id: decisionSessionsTable.id });
  await clearClock(new Date(), MART_WORKSHOP_CODE);
  return res.json({ deleted: deleted.length });
});

router.get("/mart/sessions/:id", async (req, res) => {
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  return res.json(serialize(row, false));
});

router.get("/mart/sessions/:id/reveal", async (req, res) => {
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  if (row.currentScreen !== "reveal") {
    return res.status(409).json({ error: "not finished" });
  }
  const game = loadDecisionGame();
  const choices = row.choices ?? [];
  return res.json({
    stories: revealStories(game, choices),
    breakdown: revealBreakdown(game, choices),
    score: scoreOf(game, choices),
    slowLine: tagLine(game, choices, "tooSlow"),
    fastLine: tagLine(game, choices, "tooFast"),
    weekLine: weekLine(game, choices),
    scoring: game.scoring,
  });
});

router.post("/mart/sessions/:id/start", async (req, res) => {
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  if (row.currentScreen !== "intro") return res.json(serialize(row, false));
  const now = new Date();
  const updated = await db
    .update(decisionSessionsTable)
    .set({
      currentScreen: "decision",
      decisionIndex: 0,
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(decisionSessionsTable.id, row.id))
    .returning();
  return res.json(serialize(updated[0]!, false));
});

router.post("/mart/sessions/:id/choice", async (req, res) => {
  const body = req.body as { decisionId?: string; optionId?: string };
  const decisionId = body.decisionId ?? "";
  const optionId = body.optionId ?? "";
  const game = loadDecisionGame();
  const { decision, option } = optionFor(game, decisionId, optionId);
  if (!decision || !option) return res.status(400).json({ error: "invalid choice" });

  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  const existingChoices = row.choices ?? [];
  if (existingChoices.some((c) => c.decisionId === decisionId)) {
    return res.json(serialize(row, false));
  }
  if (row.currentScreen !== "decision") {
    return res.status(409).json({ error: "not in play" });
  }
  const current = game.decisions[row.decisionIndex];
  if (!current || current.id !== decisionId) {
    return res.status(409).json({ error: "wrong decision" });
  }

  const now = new Date();
  const choices = [...existingChoices];
  const next: DecisionChoice = { decisionId, optionId, at: now.toISOString() };
  choices.push(next);
  const last = row.decisionIndex >= game.decisions.length - 1;
  const updated = await db
    .update(decisionSessionsTable)
    .set({
      choices,
      currentScreen: last ? "reveal" : "decision",
      decisionIndex: last ? row.decisionIndex : row.decisionIndex + 1,
      finishedAt: last ? now : row.finishedAt,
      updatedAt: now,
    })
    .where(eq(decisionSessionsTable.id, row.id))
    .returning();
  return res.json(serialize(updated[0]!, false));
});

router.post("/mart/sessions/:id/flag", async (req, res) => {
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  const flagged = Boolean((req.body as { flagged?: boolean }).flagged);
  const updated = await db
    .update(decisionSessionsTable)
    .set({ flaggedForDebrief: flagged, updatedAt: new Date() })
    .where(eq(decisionSessionsTable.id, row.id))
    .returning();
  if (!updated[0]) return res.status(404).json({ error: "not found" });
  return res.json(serialize(updated[0], false));
});

router.delete("/mart/sessions/:id", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  await db.delete(decisionSessionsTable).where(eq(decisionSessionsTable.id, row.id));
  return res.json({ ok: true });
});

router.get("/mart/export", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const game = loadDecisionGame();
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const rows = await db
    .select()
    .from(decisionSessionsTable)
    .where(eq(decisionSessionsTable.workshopId, workshopId))
    .orderBy(asc(decisionSessionsTable.teamName));
  const teams = rows.map((row) => {
    const packed = serialize(row, true) as ReturnType<typeof serialize> & {
      score?: number;
      maxScore?: number;
      slowLost?: number;
      fastLost?: number;
      style?: string;
    };
    return {
      team: row.displayName,
      slot: row.teamName,
      emoji: row.emoji,
      choices: (row.choices ?? []).map((c) => {
        const { option } = optionFor(game, c.decisionId, c.optionId);
        return {
          decisionId: c.decisionId,
          optionId: c.optionId,
          label: option?.label ?? c.optionId,
          grade: option?.grade.grade ?? null,
        };
      }),
      score: packed.score ?? 0,
      maxScore: packed.maxScore ?? 0,
      slowLost: packed.slowLost ?? 0,
      fastLost: packed.fastLost ?? 0,
      style: packed.style ?? "",
    };
  });
  const format = String(req.query.format ?? "json");
  if (format === "csv") {
    const headers = ["team", "slot", ...game.decisions.map((d) => d.id), "score", "slowLost", "fastLost", "style"];
    const lines = [headers.join(",")];
    for (const t of teams) {
      const map = new Map(t.choices.map((c) => [c.decisionId, c.optionId]));
      lines.push(
        [
          JSON.stringify(t.team),
          t.slot,
          ...game.decisions.map((d) => map.get(d.id) ?? ""),
          String(t.score),
          String(t.slowLost),
          String(t.fastLost),
          t.style,
        ].join(","),
      );
    }
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", "attachment; filename=mart-results.csv");
    return res.send(lines.join("\n"));
  }
  return res.json({ scenarioId: game.scenario.id, teams });
});

router.get("/try/sessions", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await workshopIdFor(MART_TRY_WORKSHOP_CODE);
  const rows = await db
    .select()
    .from(decisionSessionsTable)
    .where(eq(decisionSessionsTable.workshopId, workshopId))
    .orderBy(desc(decisionSessionsTable.createdAt));
  return res.json(rows.map((r) => serialize(r, true, MART_TRY_WORKSHOP_CODE)));
});

router.post("/try/sessions", async (req, res) => {
  const body = req.body as { displayName?: string; emoji?: string };
  const displayName = normalizeDisplayName(body.displayName ?? "");
  const emoji = (body.emoji ?? "").trim();
  if (!displayName) return res.status(400).json({ error: "invalid displayName" });
  if (!isAllowedTeamEmoji(emoji)) return res.status(400).json({ error: "invalid emoji" });

  const workshopId = await workshopIdFor(MART_TRY_WORKSHOP_CODE);
  const teamName = `try-${randomBytes(4).toString("hex")}`;
  const inserted = await db
    .insert(decisionSessionsTable)
    .values({
      workshopId,
      teamName,
      displayName,
      emoji,
      currentScreen: "intro",
      decisionIndex: 0,
      choices: [],
    })
    .returning();
  const row = inserted[0];
  if (!row) return res.status(500).json({ error: "insert failed" });
  return res.json(serialize(row, false, MART_TRY_WORKSHOP_CODE));
});

router.get("/try/sessions/:id", async (req, res) => {
  const workshopId = await workshopIdFor(MART_TRY_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  return res.json(serialize(row, false, MART_TRY_WORKSHOP_CODE));
});

router.get("/try/sessions/:id/reveal", async (req, res) => {
  const workshopId = await workshopIdFor(MART_TRY_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  if (row.currentScreen !== "reveal") {
    return res.status(409).json({ error: "not finished" });
  }
  const game = loadDecisionGame();
  const choices = row.choices ?? [];
  return res.json({
    stories: revealStories(game, choices),
    breakdown: revealBreakdown(game, choices),
    score: scoreOf(game, choices),
    slowLine: tagLine(game, choices, "tooSlow"),
    fastLine: tagLine(game, choices, "tooFast"),
    weekLine: weekLine(game, choices),
    scoring: game.scoring,
  });
});

router.post("/try/sessions/:id/start", async (req, res) => {
  const workshopId = await workshopIdFor(MART_TRY_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  if (row.currentScreen !== "intro") return res.json(serialize(row, false, MART_TRY_WORKSHOP_CODE));
  const now = new Date();
  const updated = await db
    .update(decisionSessionsTable)
    .set({
      currentScreen: "decision",
      decisionIndex: 0,
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(decisionSessionsTable.id, row.id))
    .returning();
  return res.json(serialize(updated[0]!, false, MART_TRY_WORKSHOP_CODE));
});

router.post("/try/sessions/:id/choice", async (req, res) => {
  const body = req.body as { decisionId?: string; optionId?: string };
  const decisionId = body.decisionId ?? "";
  const optionId = body.optionId ?? "";
  const game = loadDecisionGame();
  const { decision, option } = optionFor(game, decisionId, optionId);
  if (!decision || !option) return res.status(400).json({ error: "invalid choice" });

  const workshopId = await workshopIdFor(MART_TRY_WORKSHOP_CODE);
  const row = await loadDecision(String(req.params.id), workshopId);
  if (!row) return res.status(404).json({ error: "not found" });
  const existingChoices = row.choices ?? [];
  if (existingChoices.some((c) => c.decisionId === decisionId)) {
    return res.json(serialize(row, false, MART_TRY_WORKSHOP_CODE));
  }
  if (row.currentScreen !== "decision") {
    return res.status(409).json({ error: "not in play" });
  }
  const current = game.decisions[row.decisionIndex];
  if (!current || current.id !== decisionId) {
    return res.status(409).json({ error: "wrong decision" });
  }

  const now = new Date();
  const choices = [...existingChoices];
  const next: DecisionChoice = { decisionId, optionId, at: now.toISOString() };
  choices.push(next);
  const last = row.decisionIndex >= game.decisions.length - 1;
  const updated = await db
    .update(decisionSessionsTable)
    .set({
      choices,
      currentScreen: last ? "reveal" : "decision",
      decisionIndex: last ? row.decisionIndex : row.decisionIndex + 1,
      finishedAt: last ? now : row.finishedAt,
      updatedAt: now,
    })
    .where(eq(decisionSessionsTable.id, row.id))
    .returning();
  return res.json(serialize(updated[0]!, false, MART_TRY_WORKSHOP_CODE));
});

router.get("/mart/archives", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const rows = await db
    .select()
    .from(sessionArchivesTable)
    .where(eq(sessionArchivesTable.workshopId, workshopId))
    .orderBy(desc(sessionArchivesTable.savedAt));
  return res.json(rows.map(archiveSummary));
});

router.get("/mart/archives/:id", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
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
    ...archiveSummary(row),
    payload: row.payload,
  });
});

router.post("/mart/archives", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const workshopId = await workshopIdFor(MART_WORKSHOP_CODE);
  const game = loadDecisionGame();
  const clock = await getOrCreateConfig(MART_WORKSHOP_CODE);
  const teams = await db
    .select()
    .from(decisionSessionsTable)
    .where(eq(decisionSessionsTable.workshopId, workshopId))
    .orderBy(asc(decisionSessionsTable.teamName));
  if (teams.length === 0) {
    return res.status(400).json({ error: "no teams to save" });
  }
  const serialized = teams.map((t) => serialize(t, true));
  const submittedCount = serialized.filter((t) => t.currentScreen === "reveal").length;
  const payload = {
    scenarioId: game.scenario.id,
    clock: {
      startedAt: clock.startedAt ? clock.startedAt.toISOString() : null,
      endedAt: clock.endedAt ? clock.endedAt.toISOString() : null,
      durationMinutes: clock.durationMinutes,
    },
    teams: serialized,
  };
  const linked = await db
    .select({ id: workshopSessionsTable.id })
    .from(workshopSessionsTable)
    .where(eq(workshopSessionsTable.runtimeWorkshopId, workshopId))
    .limit(1);
  const inserted = await db
    .insert(sessionArchivesTable)
    .values({
      workshopId,
      workshopSessionId: linked[0]?.id ?? null,
      teamCount: teams.length,
      submittedCount,
      durationMinutes: clock.durationMinutes,
      startedAt: clock.startedAt,
      endedAt: clock.endedAt,
      scenarioId: game.scenario.id,
      payload,
    })
    .returning();
  return res.status(201).json(archiveSummary(inserted[0]!));
});

export default router;
