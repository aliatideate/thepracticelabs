import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  CreateWorkshopBody,
  GetWorkshopParams,
} from "@workspace/api-zod";
import { db, workshopsTable, type WorkshopRow } from "@workspace/db";
import { randomBytes } from "node:crypto";

const router: IRouter = Router();

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  const buf = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  }
  return out;
}

function serialize(row: WorkshopRow) {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/workshops", async (_req, res) => {
  const rows = await db
    .select()
    .from(workshopsTable)
    .orderBy(desc(workshopsTable.createdAt));
  return res.json(rows.map(serialize));
});

router.post("/workshops", async (req, res) => {
  const parsed = CreateWorkshopBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const label = parsed.data.label.trim();
  if (!label) return res.status(400).json({ error: "label required" });

  let code = parsed.data.code?.trim().toUpperCase() ?? "";
  if (!code) {
    // Generate a unique code, retrying a few times on the rare collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode();
      const existing = await db
        .select({ id: workshopsTable.id })
        .from(workshopsTable)
        .where(eq(workshopsTable.code, candidate))
        .limit(1);
      if (!existing[0]) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return res.status(500).json({ error: "could not allocate workshop code" });
    }
  } else {
    const existing = await db
      .select({ id: workshopsTable.id })
      .from(workshopsTable)
      .where(eq(workshopsTable.code, code))
      .limit(1);
    if (existing[0]) {
      return res.status(409).json({ error: "workshop code already exists" });
    }
  }

  const inserted = await db
    .insert(workshopsTable)
    .values({ code, label })
    .returning();
  const row = inserted[0];
  if (!row) {
    req.log.error("failed to insert workshop");
    return res.status(500).json({ error: "insert failed" });
  }
  return res.json(serialize(row));
});

router.get("/workshops/:code", async (req, res) => {
  const parsed = GetWorkshopParams.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const code = parsed.data.code.toUpperCase();
  const rows = await db
    .select()
    .from(workshopsTable)
    .where(eq(workshopsTable.code, code))
    .limit(1);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "not found" });
  return res.json(serialize(row));
});

export default router;
