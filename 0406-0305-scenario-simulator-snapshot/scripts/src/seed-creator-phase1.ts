/**
 * Idempotent Phase 1 creator seed.
 *
 * Requires CREATOR_EMAIL. Optional CREATOR_PASSWORD (bcrypt hash only if set).
 * Does not create workshop_sessions, briefs, or assets rows.
 *
 * Usage:
 *   DATABASE_URL=… CREATOR_EMAIL=you@example.com \
 *     pnpm --filter @workspace/scripts run seed:creator
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import {
  clientCopiesTable,
  clientsTable,
  exerciseVersionsTable,
  exercisesTable,
  organisationsTable,
  usersTable,
} from "@workspace/db/schema";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, "..", "..", "content");

const ORG_NAME = "Ideate";
const CLIENT_NAME = "Unilever UAE";
const DISPLAY_NAME = "Ali";

const DEMAND_TITLE = "The Demand Spike";
const MART_TITLE = "A Week in the Field";

type Json = unknown;

function loadJson(filename: string): Json {
  const path = resolve(contentDir, filename);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function demandDefaultAssets(content: Json): Record<string, unknown> {
  const c = content as {
    company?: { logo?: string };
    stakeholders?: Array<{ id?: string; avatar?: string }>;
  };
  return {
    logo: c.company?.logo ? `/content/media/${c.company.logo}` : null,
    avatars: Object.fromEntries(
      (c.stakeholders ?? [])
        .filter((s) => s.id && s.avatar)
        .map((s) => [s.id!, `/content/media/${s.avatar}`]),
    ),
  };
}

function martDefaultAssets(content: Json): Record<string, unknown> {
  const c = content as {
    assets?: {
      sceneImage?: string;
      doorImage?: string;
      phoneImage?: string;
      sceneImages?: string[];
      travelImages?: string[];
    };
  };
  return {
    sceneImage: c.assets?.sceneImage ?? null,
    doorImage: c.assets?.doorImage ?? null,
    phoneImage: c.assets?.phoneImage ?? null,
    sceneImages: c.assets?.sceneImages ?? [],
    travelImages: c.assets?.travelImages ?? [],
  };
}

async function upsertOrganisation(): Promise<string> {
  const existing = await db
    .select()
    .from(organisationsTable)
    .where(eq(organisationsTable.name, ORG_NAME))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [row] = await db
    .insert(organisationsTable)
    .values({ name: ORG_NAME })
    .returning();
  return row.id;
}

async function upsertUser(orgId: string, email: string, passwordHash: string | null): Promise<string> {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing[0]) {
    const [row] = await db
      .update(usersTable)
      .set({
        orgId,
        displayName: DISPLAY_NAME,
        ...(passwordHash !== null ? { passwordHash } : {}),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, existing[0].id))
      .returning();
    return row.id;
  }

  const [row] = await db
    .insert(usersTable)
    .values({
      orgId,
      email,
      passwordHash,
      displayName: DISPLAY_NAME,
    })
    .returning();
  return row.id;
}

async function upsertClient(orgId: string, createdBy: string): Promise<string> {
  const existing = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.orgId, orgId), eq(clientsTable.name, CLIENT_NAME)))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [row] = await db
    .insert(clientsTable)
    .values({
      orgId,
      name: CLIENT_NAME,
      notes: null,
      createdBy,
    })
    .returning();
  return row.id;
}

async function upsertExercise(input: {
  orgId: string;
  createdBy: string;
  title: string;
  category: "problem-framing" | "decision-making";
  format: "investigation" | "branching";
}): Promise<string> {
  const existing = await db
    .select()
    .from(exercisesTable)
    .where(and(eq(exercisesTable.orgId, input.orgId), eq(exercisesTable.title, input.title)))
    .limit(1);

  if (existing[0]) {
    const [row] = await db
      .update(exercisesTable)
      .set({
        category: input.category,
        format: input.format,
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(exercisesTable.id, existing[0].id))
      .returning();
    return row.id;
  }

  const [row] = await db
    .insert(exercisesTable)
    .values({
      orgId: input.orgId,
      title: input.title,
      category: input.category,
      format: input.format,
      status: "published",
      createdBy: input.createdBy,
    })
    .returning();
  return row.id;
}

async function upsertVersion(input: {
  orgId: string;
  exerciseId: string;
  createdBy: string;
  content: Json;
  defaultAssets: Record<string, unknown>;
}): Promise<string> {
  const existing = await db
    .select()
    .from(exerciseVersionsTable)
    .where(
      and(
        eq(exerciseVersionsTable.exerciseId, input.exerciseId),
        eq(exerciseVersionsTable.version, 1),
      ),
    )
    .limit(1);

  if (existing[0]) {
    // Immutable after insert — re-seed keeps the existing v1 row.
    return existing[0].id;
  }

  const [row] = await db
    .insert(exerciseVersionsTable)
    .values({
      orgId: input.orgId,
      exerciseId: input.exerciseId,
      version: 1,
      content: input.content,
      facilitatorNotes: null,
      variables: [],
      defaultAssets: input.defaultAssets,
      createdBy: input.createdBy,
    })
    .returning();
  return row.id;
}

async function upsertClientCopy(input: {
  orgId: string;
  clientId: string;
  exerciseId: string;
  exerciseVersionId: string;
  createdBy: string;
}): Promise<string> {
  const existing = await db
    .select()
    .from(clientCopiesTable)
    .where(
      and(
        eq(clientCopiesTable.clientId, input.clientId),
        eq(clientCopiesTable.exerciseId, input.exerciseId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const [row] = await db
      .update(clientCopiesTable)
      .set({
        exerciseVersionId: input.exerciseVersionId,
        variableValues: {},
        logoAssetId: null,
        updatedAt: new Date(),
      })
      .where(eq(clientCopiesTable.id, existing[0].id))
      .returning();
    return row.id;
  }

  const [row] = await db
    .insert(clientCopiesTable)
    .values({
      orgId: input.orgId,
      clientId: input.clientId,
      exerciseId: input.exerciseId,
      exerciseVersionId: input.exerciseVersionId,
      variableValues: {},
      logoAssetId: null,
      createdBy: input.createdBy,
    })
    .returning();
  return row.id;
}

async function main(): Promise<void> {
  const email = process.env.CREATOR_EMAIL?.trim();
  if (!email) {
    console.error("CREATOR_EMAIL is required (not committed; set in env).");
    process.exit(1);
  }

  const password = process.env.CREATOR_PASSWORD;
  const passwordHash =
    password && password.length > 0 ? await bcrypt.hash(password, 12) : null;

  if (!passwordHash) {
    console.log("CREATOR_PASSWORD unset — seeding user with password_hash = null");
  }

  const demandContent = loadJson("scenario.json");
  const martContent = loadJson("decision-game.json");

  const orgId = await upsertOrganisation();
  const userId = await upsertUser(orgId, email, passwordHash);
  const clientId = await upsertClient(orgId, userId);

  const demandExerciseId = await upsertExercise({
    orgId,
    createdBy: userId,
    title: DEMAND_TITLE,
    category: "problem-framing",
    format: "investigation",
  });
  const martExerciseId = await upsertExercise({
    orgId,
    createdBy: userId,
    title: MART_TITLE,
    category: "decision-making",
    format: "branching",
  });

  const demandVersionId = await upsertVersion({
    orgId,
    exerciseId: demandExerciseId,
    createdBy: userId,
    content: demandContent,
    defaultAssets: demandDefaultAssets(demandContent),
  });
  const martVersionId = await upsertVersion({
    orgId,
    exerciseId: martExerciseId,
    createdBy: userId,
    content: martContent,
    defaultAssets: martDefaultAssets(martContent),
  });

  await upsertClientCopy({
    orgId,
    clientId,
    exerciseId: demandExerciseId,
    exerciseVersionId: demandVersionId,
    createdBy: userId,
  });
  await upsertClientCopy({
    orgId,
    clientId,
    exerciseId: martExerciseId,
    exerciseVersionId: martVersionId,
    createdBy: userId,
  });

  console.log("creator Phase 1 seed complete:");
  console.log(`  organisation: ${ORG_NAME} (${orgId})`);
  console.log(`  user: ${email} (${userId}) password_hash=${passwordHash ? "set" : "null"}`);
  console.log(`  client: ${CLIENT_NAME} (${clientId})`);
  console.log(`  exercises: ${DEMAND_TITLE}, ${MART_TITLE} (v1 each)`);
  console.log("  client_copies: 2");
  console.log("  workshop_sessions / briefs / assets: none (by design)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
