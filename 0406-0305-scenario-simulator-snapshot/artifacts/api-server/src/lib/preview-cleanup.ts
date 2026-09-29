import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db, workshopSessionsTable, workshopsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Delete expired preview workshop_sessions (24h) and their runtime workshops.
 * Safe to call at startup and on a schedule.
 */
export async function sweepExpiredPreviewSessions(): Promise<number> {
  const now = new Date();
  const expired = await db
    .select({
      id: workshopSessionsTable.id,
      runtimeWorkshopId: workshopSessionsTable.runtimeWorkshopId,
      workshopCode: workshopSessionsTable.workshopCode,
    })
    .from(workshopSessionsTable)
    .where(
      and(
        eq(workshopSessionsTable.isPreview, true),
        isNotNull(workshopSessionsTable.previewExpiresAt),
        lt(workshopSessionsTable.previewExpiresAt, now),
      ),
    );

  if (expired.length === 0) return 0;

  const runtimeIds = expired
    .map((r) => r.runtimeWorkshopId)
    .filter((id): id is string => !!id);

  for (const row of expired) {
    await db.delete(workshopSessionsTable).where(eq(workshopSessionsTable.id, row.id));
  }

  for (const workshopId of runtimeIds) {
    // Only delete if no other workshop_session still points at it.
    const stillLinked = await db
      .select({ id: workshopSessionsTable.id })
      .from(workshopSessionsTable)
      .where(eq(workshopSessionsTable.runtimeWorkshopId, workshopId))
      .limit(1);
    if (stillLinked[0]) continue;

    const workshop = await db
      .select({ code: workshopsTable.code })
      .from(workshopsTable)
      .where(eq(workshopsTable.id, workshopId))
      .limit(1);
    const code = workshop[0]?.code ?? "";
    // Never touch permanent Unilever codes.
    if (["DEFAULT", "MART", "MART-TRY", "DEMAND-TRY"].includes(code)) continue;

    await db.delete(workshopsTable).where(eq(workshopsTable.id, workshopId));
  }

  logger.info(
    { count: expired.length, codes: expired.map((e) => e.workshopCode) },
    "Swept expired preview sessions",
  );
  return expired.length;
}

/** Run once at boot, then every hour. */
export function startPreviewSessionSweeper(): void {
  const run = () => {
    void sweepExpiredPreviewSessions().catch((err) => {
      logger.error({ err }, "Preview session sweep failed");
    });
  };
  run();
  const hourMs = 60 * 60 * 1000;
  setInterval(run, hourMs).unref?.();
}
