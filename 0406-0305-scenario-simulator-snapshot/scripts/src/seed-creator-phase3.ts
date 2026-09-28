/**
 * Idempotent Phase 3 seed: Unilever workshop_sessions linked to DEFAULT/MART(/TRY),
 * plus archive backfill.
 *
 * Requires Phase 1 creator seed first (org, user, client, exercises, copies).
 *
 *   DATABASE_URL=… pnpm --filter @workspace/scripts run seed:creator:phase3
 */

import { and, eq } from "drizzle-orm";
import {
  clientCopiesTable,
  clientsTable,
  db,
  exercisesTable,
  exerciseVersionsTable,
  pool,
  sessionArchivesTable,
  workshopSessionsTable,
  workshopsTable,
} from "@workspace/db";
const WORKSHOP_CODE = "DEFAULT";
const MART_WORKSHOP_CODE = "MART";
const DEMAND_TRY_WORKSHOP_CODE = "DEMAND-TRY";
const MART_TRY_WORKSHOP_CODE = "MART-TRY";

type SeedSpec = {
  workshopCode: string;
  runtimeCode: string;
  exerciseTitle: string;
  title: string;
  durationMinutes: number;
  teamCount: number;
  isPreview: boolean;
};

const SPECS: SeedSpec[] = [
  {
    workshopCode: WORKSHOP_CODE,
    runtimeCode: WORKSHOP_CODE,
    exerciseTitle: "The Demand Spike",
    title: "Unilever Session 1 — The Demand Spike",
    durationMinutes: 30,
    teamCount: 10,
    isPreview: false,
  },
  {
    workshopCode: MART_WORKSHOP_CODE,
    runtimeCode: MART_WORKSHOP_CODE,
    exerciseTitle: "A Week in the Field",
    title: "Unilever Session 2 — A Week in the Field",
    durationMinutes: 15,
    teamCount: 10,
    isPreview: false,
  },
  {
    workshopCode: DEMAND_TRY_WORKSHOP_CODE,
    runtimeCode: DEMAND_TRY_WORKSHOP_CODE,
    exerciseTitle: "The Demand Spike",
    title: "Session 1 try-out",
    durationMinutes: 30,
    teamCount: 10,
    isPreview: true,
  },
  {
    workshopCode: MART_TRY_WORKSHOP_CODE,
    runtimeCode: MART_TRY_WORKSHOP_CODE,
    exerciseTitle: "A Week in the Field",
    title: "Session 2 try-out",
    durationMinutes: 15,
    teamCount: 10,
    isPreview: true,
  },
];

async function workshopId(code: string): Promise<string> {
  const rows = await db
    .select()
    .from(workshopsTable)
    .where(eq(workshopsTable.code, code))
    .limit(1);
  if (!rows[0]) throw new Error(`workshop ${code} missing — run app bootstrap first`);
  return rows[0].id;
}

async function main(): Promise<void> {
  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.name, "Unilever UAE"))
    .limit(1);
  const client = clients[0];
  if (!client) {
    throw new Error("Unilever UAE client missing — run seed:creator first");
  }

  for (const spec of SPECS) {
    const exercises = await db
      .select()
      .from(exercisesTable)
      .where(
        and(eq(exercisesTable.orgId, client.orgId), eq(exercisesTable.title, spec.exerciseTitle)),
      )
      .limit(1);
    const exercise = exercises[0];
    if (!exercise) throw new Error(`exercise missing: ${spec.exerciseTitle}`);

    const versions = await db
      .select()
      .from(exerciseVersionsTable)
      .where(
        and(
          eq(exerciseVersionsTable.exerciseId, exercise.id),
          eq(exerciseVersionsTable.version, 1),
        ),
      )
      .limit(1);
    const version = versions[0];
    if (!version) throw new Error(`v1 missing for ${spec.exerciseTitle}`);

    const copies = await db
      .select()
      .from(clientCopiesTable)
      .where(
        and(
          eq(clientCopiesTable.clientId, client.id),
          eq(clientCopiesTable.exerciseId, exercise.id),
        ),
      )
      .limit(1);
    const copy = copies[0];
    if (!copy) throw new Error(`client_copy missing for ${spec.exerciseTitle}`);

    const runtimeWorkshopId = await workshopId(spec.runtimeCode);
    const existing = await db
      .select()
      .from(workshopSessionsTable)
      .where(eq(workshopSessionsTable.workshopCode, spec.workshopCode))
      .limit(1);

    if (existing[0]) {
      await db
        .update(workshopSessionsTable)
        .set({
          runtimeWorkshopId,
          exerciseVersionId: version.id,
          clientCopyId: copy.id,
          resolvedContent: version.content,
          title: spec.title,
          durationMinutes: spec.durationMinutes,
          teamCount: spec.teamCount,
          isPreview: spec.isPreview,
          previewExpiresAt: spec.isPreview
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(workshopSessionsTable.id, existing[0].id));
      console.log(`updated workshop_session ${spec.workshopCode} (${existing[0].id})`);
    } else {
      const [row] = await db
        .insert(workshopSessionsTable)
        .values({
          orgId: client.orgId,
          clientId: client.id,
          clientCopyId: copy.id,
          exerciseVersionId: version.id,
          variableValues: {},
          title: spec.title,
          durationMinutes: spec.durationMinutes,
          teamCount: spec.teamCount,
          mode: "in_person",
          workshopCode: spec.workshopCode,
          runtimeWorkshopId,
          resolvedContent: version.content,
          resolvedFacilitatorNotes: version.facilitatorNotes,
          status: "ready",
          isPreview: spec.isPreview,
          previewExpiresAt: spec.isPreview
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : null,
          createdBy: client.createdBy,
        })
        .returning();
      console.log(`created workshop_session ${spec.workshopCode} (${row.id})`);
    }
  }

  // Backfill archives → workshop_sessions
  for (const runtimeCode of [WORKSHOP_CODE, MART_WORKSHOP_CODE] as const) {
    const wid = await workshopId(runtimeCode);
    const sessions = await db
      .select()
      .from(workshopSessionsTable)
      .where(eq(workshopSessionsTable.runtimeWorkshopId, wid))
      .limit(1);
    const sid = sessions[0]?.id;
    if (!sid) continue;
    const result = await db
      .update(sessionArchivesTable)
      .set({ workshopSessionId: sid })
      .where(and(eq(sessionArchivesTable.workshopId, wid)));
    console.log(`backfilled archives for ${runtimeCode} → ${sid}`);
    void result;
  }

  console.log("creator Phase 3 seed complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
