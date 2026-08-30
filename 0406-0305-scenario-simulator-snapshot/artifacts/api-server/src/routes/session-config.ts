import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionConfigTable } from "@workspace/db";
import { loadScenario } from "../lib/content";
import { checkFacilitatorSecret } from "../lib/workshop";
import { defaultWorkshopId, getOrCreateConfig } from "../lib/session-clock";

const router: IRouter = Router();

function serialize(row: typeof sessionConfigTable.$inferSelect) {
  return {
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    durationMinutes: row.durationMinutes,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/session-config", async (_req, res) => {
  const row = await getOrCreateConfig();
  return res.json(serialize(row));
});

router.post("/session-config/start", async (req, res) => {
  if (!checkFacilitatorSecret(String(req.headers["x-facilitator-secret"] ?? ""))) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const scenario = loadScenario();
  const workshopId = await defaultWorkshopId();
  const now = new Date();
  const updated = await db
    .update(sessionConfigTable)
    .set({
      startedAt: now,
      endedAt: null,
      durationMinutes: scenario.timing.defaultMinutes,
      updatedAt: now,
    })
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .returning();
  const row = updated[0] ?? (await getOrCreateConfig());
  return res.json(serialize(row));
});

router.patch("/session-config", async (req, res) => {
  if (!checkFacilitatorSecret(String(req.headers["x-facilitator-secret"] ?? ""))) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const body = req.body as {
    durationMinutes?: number;
    end?: boolean;
  };
  const workshopId = await defaultWorkshopId();
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
  return res.json(serialize(row));
});

export default router;
