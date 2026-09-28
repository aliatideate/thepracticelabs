import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionConfigTable } from "@workspace/db";
import { assertFacilitator } from "../lib/auth";
import { WORKSHOP_CODE } from "../lib/workshop";
import { getOrCreateConfig, workshopIdFor } from "../lib/session-clock";
import { setWorkshopSessionStatusByRuntimeCode } from "../lib/workshop-session";

const router: IRouter = Router();

function serialize(row: typeof sessionConfigTable.$inferSelect) {
  return {
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    durationMinutes: row.durationMinutes,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function codeFrom(req: { query: Record<string, unknown>; body?: unknown }) {
  const q = req.query.workshopCode;
  if (typeof q === "string" && q.trim()) return q.trim().toUpperCase();
  const body = req.body as { workshopCode?: string } | undefined;
  if (typeof body?.workshopCode === "string" && body.workshopCode.trim()) {
    return body.workshopCode.trim().toUpperCase();
  }
  return WORKSHOP_CODE;
}

router.get("/session-config", async (req, res) => {
  const code = codeFrom(req);
  const row = await getOrCreateConfig(code);
  return res.json(serialize(row));
});

router.post("/session-config/start", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const code = codeFrom(req);
  const workshopId = await workshopIdFor(code);
  const existing = await getOrCreateConfig(code);
  const now = new Date();
  const updated = await db
    .update(sessionConfigTable)
    .set({
      startedAt: now,
      endedAt: null,
      durationMinutes: existing.durationMinutes,
      updatedAt: now,
    })
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .returning();
  const row = updated[0] ?? (await getOrCreateConfig(code));
  await setWorkshopSessionStatusByRuntimeCode(code, "live");
  return res.json(serialize(row));
});

router.patch("/session-config", async (req, res) => {
  if (!(await assertFacilitator(req, res))) return;
  const code = codeFrom(req);
  const body = req.body as {
    durationMinutes?: number;
    end?: boolean;
  };
  const workshopId = await workshopIdFor(code);
  const now = new Date();
  const updates: Partial<typeof sessionConfigTable.$inferInsert> = {
    updatedAt: now,
  };
  if (typeof body.durationMinutes === "number" && body.durationMinutes > 0) {
    updates.durationMinutes = Math.round(body.durationMinutes);
    updates.endedAt = null;
  }
  if (body.end === true) {
    updates.endedAt = now;
  }
  const updated = await db
    .update(sessionConfigTable)
    .set(updates)
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .returning();
  const row = updated[0];
  if (!row) return res.status(404).json({ error: "not found" });
  if (body.end === true) {
    await setWorkshopSessionStatusByRuntimeCode(code, "ended");
  }
  return res.json(serialize(row));
});

export default router;
