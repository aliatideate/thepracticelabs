import { and, eq, isNull } from "drizzle-orm";
import { db, sessionConfigTable, workshopsTable } from "@workspace/db";
import { loadScenario } from "./content";
import { WORKSHOP_CODE, MART_WORKSHOP_CODE, MART_TRY_WORKSHOP_CODE, MART_DURATION_MINUTES } from "./workshop";
import { setWorkshopSessionStatusByRuntimeCode } from "./workshop-session";

export async function workshopIdFor(code: string): Promise<string> {
  const rows = await db
    .select({ id: workshopsTable.id })
    .from(workshopsTable)
    .where(eq(workshopsTable.code, code))
    .limit(1);
  const id = rows[0]?.id;
  if (!id) throw new Error(`${code} workshop missing`);
  return id;
}

export async function defaultWorkshopId(): Promise<string> {
  return workshopIdFor(WORKSHOP_CODE);
}

export async function getOrCreateConfig(code = WORKSHOP_CODE) {
  const workshopId = await workshopIdFor(code);
  const existing = await db
    .select()
    .from(sessionConfigTable)
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .limit(1);
  if (existing[0]) return existing[0];
  const durationMinutes =
    code === MART_WORKSHOP_CODE || code === MART_TRY_WORKSHOP_CODE
      ? MART_DURATION_MINUTES
      : loadScenario().timing.defaultMinutes;
  const inserted = await db
    .insert(sessionConfigTable)
    .values({
      workshopId,
      durationMinutes,
    })
    .returning();
  return inserted[0];
}

/** Starts the shared clock once. Later teams join the same countdown. */
export async function startTimerIfIdle(now = new Date(), code = WORKSHOP_CODE) {
  await getOrCreateConfig(code);
  const workshopId = await workshopIdFor(code);
  const before = await db
    .select({ startedAt: sessionConfigTable.startedAt })
    .from(sessionConfigTable)
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .limit(1);
  await db
    .update(sessionConfigTable)
    .set({
      startedAt: now,
      endedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(sessionConfigTable.workshopId, workshopId),
        isNull(sessionConfigTable.startedAt),
      ),
    );
  if (!before[0]?.startedAt) {
    await setWorkshopSessionStatusByRuntimeCode(code, "live");
  }
}

/** Clears the shared clock so the next team join starts a fresh countdown. */
export async function clearClock(now = new Date(), code = WORKSHOP_CODE) {
  await getOrCreateConfig(code);
  const workshopId = await workshopIdFor(code);
  const durationMinutes =
    code === MART_WORKSHOP_CODE || code === MART_TRY_WORKSHOP_CODE
      ? MART_DURATION_MINUTES
      : loadScenario().timing.defaultMinutes;
  await db
    .update(sessionConfigTable)
    .set({
      startedAt: null,
      endedAt: null,
      durationMinutes,
      updatedAt: now,
    })
    .where(eq(sessionConfigTable.workshopId, workshopId));
  await setWorkshopSessionStatusByRuntimeCode(code, "ready");
}
