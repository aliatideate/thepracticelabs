/**
 * Idempotent Phase 4 seed: insert exercise_versions v2 (tokenised) for
 * Demand Spike + Week in the Field. Leaves v1 rows immutable.
 *
 * Requires Phase 1 creator seed first.
 *
 *   DATABASE_URL=… pnpm --filter @workspace/scripts run seed:creator:phase4
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import {
  db,
  exerciseVersionsTable,
  exercisesTable,
  organisationsTable,
  pool,
  usersTable,
  type ExerciseVariableDef,
} from "@workspace/db";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, "..", "..", "content");

const DEMAND_TITLE = "The Demand Spike";
const MART_TITLE = "A Week in the Field";

const DEMAND_NOTES = `# Facilitator notes — The Demand Spike

Session company: **{{company.name}}** (short: {{company.shortName}}), plant in **{{company.plantCity}}**.

Markets stay UAE / KSA / Qatar. Watch for teams blaming the plant without reading retailer evidence.

Evidence download labels use a slug of the short name (fallback: session code), e.g. \`gulf-beverages-W35-availability.xlsx\`.
`;

const MART_NOTES = `# Facilitator notes — A Week in the Field

Company: **{{company.name}}**. Retail chain: **{{chain.name}}** (plural **{{chain.namePlural}}**).

Branches: {{branches.alNahda}}, {{branches.muwaileh}}, {{branches.alMajaz}}, {{branches.ajmanCorniche}}, {{branches.alRashidiya}}, {{branches.universityCity}}.

Door teaching and playbook rules stay the same; only names change. Renames are UAE + beverage/FMCG only for now.
`;

const DEMAND_VARIABLES: ExerciseVariableDef[] = [
  {
    key: "company.name",
    label: "Company name",
    type: "text",
    default: "Gulf Beverages Co.",
    maxLength: 48,
    required: true,
  },
  {
    key: "company.shortName",
    label: "Company short name",
    type: "text",
    default: "Gulf Beverages",
    maxLength: 32,
    required: true,
  },
  {
    key: "company.plantCity",
    label: "Plant city",
    type: "text",
    default: "Dubai",
    maxLength: 28,
    required: true,
  },
  {
    key: "company.logo",
    label: "Company logo",
    type: "image",
    default: "gulf-logo.png",
    required: false,
  },
];

const MART_VARIABLES: ExerciseVariableDef[] = [
  {
    key: "company.name",
    label: "Company name",
    type: "text",
    default: "Gulf Beverages",
    maxLength: 40,
    required: true,
  },
  {
    key: "chain.name",
    label: "Retail chain name",
    type: "text",
    default: "Saha Mart",
    maxLength: 32,
    required: true,
  },
  {
    key: "branches.alNahda",
    label: "Branch — Al Nahda",
    type: "text",
    default: "Al Nahda",
    maxLength: 28,
    required: true,
  },
  {
    key: "branches.muwaileh",
    label: "Branch — Muwaileh",
    type: "text",
    default: "Muwaileh",
    maxLength: 28,
    required: true,
  },
  {
    key: "branches.alMajaz",
    label: "Branch — Al Majaz",
    type: "text",
    default: "Al Majaz",
    maxLength: 28,
    required: true,
  },
  {
    key: "branches.ajmanCorniche",
    label: "Branch — Ajman Corniche",
    type: "text",
    default: "Ajman Corniche",
    maxLength: 32,
    required: true,
  },
  {
    key: "branches.alRashidiya",
    label: "Branch — Al Rashidiya",
    type: "text",
    default: "Al Rashidiya",
    maxLength: 28,
    required: true,
  },
  {
    key: "branches.universityCity",
    label: "Branch — University City",
    type: "text",
    default: "University City",
    maxLength: 32,
    required: true,
  },
];

function loadJson(filename: string): unknown {
  return JSON.parse(readFileSync(resolve(contentDir, filename), "utf8"));
}

function demandDefaultAssets(content: unknown): Record<string, unknown> {
  const c = content as { company?: { logo?: string } };
  return {
    logo: c.company?.logo?.includes("{{")
      ? "/content/media/gulf-logo.png"
      : c.company?.logo
        ? `/content/media/${c.company.logo}`
        : null,
  };
}

function martDefaultAssets(content: unknown): Record<string, unknown> {
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

async function upsertV2(input: {
  exerciseId: string;
  orgId: string;
  createdBy: string;
  content: unknown;
  variables: ExerciseVariableDef[];
  facilitatorNotes: string;
  defaultAssets: Record<string, unknown>;
}): Promise<string> {
  const existing = await db
    .select()
    .from(exerciseVersionsTable)
    .where(
      and(
        eq(exerciseVersionsTable.exerciseId, input.exerciseId),
        eq(exerciseVersionsTable.version, 2),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const [row] = await db
      .update(exerciseVersionsTable)
      .set({
        content: input.content,
        variables: input.variables,
        facilitatorNotes: input.facilitatorNotes,
        defaultAssets: input.defaultAssets,
      })
      .where(eq(exerciseVersionsTable.id, existing[0].id))
      .returning();
    return row.id;
  }

  const [row] = await db
    .insert(exerciseVersionsTable)
    .values({
      orgId: input.orgId,
      exerciseId: input.exerciseId,
      version: 2,
      content: input.content,
      facilitatorNotes: input.facilitatorNotes,
      variables: input.variables,
      defaultAssets: input.defaultAssets,
      createdBy: input.createdBy,
    })
    .returning();
  return row.id;
}

async function main(): Promise<void> {
  const orgs = await db.select().from(organisationsTable).limit(1);
  const org = orgs[0];
  if (!org) throw new Error("organisation missing — run seed:creator first");

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.orgId, org.id))
    .limit(1);
  const user = users[0];
  if (!user) throw new Error("user missing — run seed:creator first");

  const demandContent = loadJson("scenario.v2.json");
  const martContent = loadJson("decision-game.v2.json");

  for (const spec of [
    {
      title: DEMAND_TITLE,
      content: demandContent,
      variables: DEMAND_VARIABLES,
      notes: DEMAND_NOTES,
      assets: demandDefaultAssets(demandContent),
    },
    {
      title: MART_TITLE,
      content: martContent,
      variables: MART_VARIABLES,
      notes: MART_NOTES,
      assets: martDefaultAssets(martContent),
    },
  ] as const) {
    const exercises = await db
      .select()
      .from(exercisesTable)
      .where(and(eq(exercisesTable.orgId, org.id), eq(exercisesTable.title, spec.title)))
      .limit(1);
    const exercise = exercises[0];
    if (!exercise) throw new Error(`exercise missing: ${spec.title}`);

    const id = await upsertV2({
      exerciseId: exercise.id,
      orgId: org.id,
      createdBy: user.id,
      content: spec.content,
      variables: spec.variables,
      facilitatorNotes: spec.notes,
      defaultAssets: spec.assets,
    });
    console.log(`v2 ready for ${spec.title} (${id})`);
  }

  console.log("creator Phase 4 seed complete (v2 tokenised; v1 untouched).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
