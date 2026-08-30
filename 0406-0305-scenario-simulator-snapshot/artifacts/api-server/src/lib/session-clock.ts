import { and, eq, isNull } from "drizzle-orm";
import { db, sessionConfigTable, workshopsTable } from "@workspace/db";
import { loadScenario } from "./content";
import { WORKSHOP_CODE } from "./workshop";

export async function defaultWorkshopId(): Promise<string> {
  const rows = await db
    .select({ id: workshopsTable.id })
    .from(workshopsTable)
    .where(eq(workshopsTable.code, WORKSHOP_CODE))
    .limit(1);
  const id = rows[0]?.id;
  if (!id) throw new Error("DEFAULT workshop missing");
  return id;
}

export async function getOrCreateConfig() {
  const workshopId = await defaultWorkshopId();
  const existing = await db
    .select()
    .from(sessionConfigTable)
    .where(eq(sessionConfigTable.workshopId, workshopId))
    .limit(1);
  if (existing[0]) return existing[0];
  const scenario = loadScenario();
  const inserted = await db
    .insert(sessionConfigTable)
    .values({
      workshopId,
      durationMinutes: scenario.timing.defaultMinutes,
    })
    .returning();
  return inserted[0];
}

/** Starts the shared clock once. Later teams join the same countdown. */
export async function startTimerIfIdle(now = new Date()) {
  await getOrCreateConfig();
  const workshopId = await defaultWorkshopId();
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
}
