/**
 * Idempotent seed for in-design brief rows (Activities intake placeholders).
 *
 *   DATABASE_URL=… pnpm --filter @workspace/scripts run seed:creator:briefs
 */

import { and, eq } from "drizzle-orm";
import {
  briefsTable,
  clientsTable,
  db,
  organisationsTable,
  pool,
  usersTable,
} from "@workspace/db";

type BriefSeed = {
  title: string;
  category: "problem-framing" | "decision-making" | "ideation" | "prototyping";
  clientName: string | null;
  audience: string;
  skill: string;
  debriefFocus: string;
  setting: string;
  durationMinutes: number;
  teamCount: number;
  mode: "in_person" | "remote" | "hybrid";
};

const BRIEFS: BriefSeed[] = [
  {
    title: "The Quiet Exit",
    category: "problem-framing",
    clientName: "Falaj Bank",
    audience: "Mid-level retail banking managers",
    skill:
      "Separate symptoms from causes when the loudest data points the wrong way",
    debriefFocus: "Which evidence teams trusted and why",
    setting: "Retail bank, UAE",
    durationMinutes: 45,
    teamCount: 5,
    mode: "in_person",
  },
  {
    title: "The Stalled Rollout",
    category: "problem-framing",
    clientName: null,
    audience: "Operations and HR leads",
    skill: "Frame an adoption problem before proposing fixes",
    debriefFocus: "Whether teams framed it as training or workflow",
    setting: "Government services entity, GCC",
    durationMinutes: 40,
    teamCount: 4,
    mode: "hybrid",
  },
  {
    title: "Seven Days to Launch",
    category: "decision-making",
    clientName: null,
    audience: "Product and delivery managers",
    skill: "Tell reversible calls from irreversible ones under a deadline",
    debriefFocus: "Which calls teams escalated and which they owned",
    setting: "Consumer app company, UAE",
    durationMinutes: 30,
    teamCount: 5,
    mode: "remote",
  },
  {
    title: "The Empty Aisle",
    category: "ideation",
    clientName: "Qanat Foods",
    audience: "Sales and trade marketing teams",
    skill: "Generate widely before converging",
    debriefFocus: "How early teams killed ideas, and on what grounds",
    setting: "Food manufacturer and retail partners, UAE",
    durationMinutes: 45,
    teamCount: 6,
    mode: "in_person",
  },
];

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

  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.orgId, org.id));
  const clientByName = new Map(clients.map((c) => [c.name, c.id]));

  for (const seed of BRIEFS) {
    const clientId = seed.clientName ? clientByName.get(seed.clientName) ?? null : null;
    if (seed.clientName && !clientId) {
      throw new Error(`client "${seed.clientName}" missing — rename clients first`);
    }

    const existing = await db
      .select()
      .from(briefsTable)
      .where(and(eq(briefsTable.orgId, org.id), eq(briefsTable.title, seed.title)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(briefsTable)
        .set({
          clientId,
          category: seed.category,
          audience: seed.audience,
          skill: seed.skill,
          debriefFocus: seed.debriefFocus,
          setting: seed.setting,
          durationMinutes: seed.durationMinutes,
          teamCount: seed.teamCount,
          mode: seed.mode,
          status: "in_design",
          updatedAt: new Date(),
        })
        .where(eq(briefsTable.id, existing[0].id));
      console.log(`updated brief: ${seed.title}`);
      continue;
    }

    await db.insert(briefsTable).values({
      orgId: org.id,
      createdBy: user.id,
      clientId,
      title: seed.title,
      category: seed.category,
      audience: seed.audience,
      skill: seed.skill,
      debriefFocus: seed.debriefFocus,
      setting: seed.setting,
      durationMinutes: seed.durationMinutes,
      teamCount: seed.teamCount,
      mode: seed.mode,
      status: "in_design",
    });
    console.log(`created brief: ${seed.title}`);
  }
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
