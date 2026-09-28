import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, workshopSessionsTable, workshopsTable } from "@workspace/db";

/** Human join codes: no O/0/I/1/L. */
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateWorkshopCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length]!;
  }
  return out;
}

export async function allocateUniqueWorkshopCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateWorkshopCode();
    const [inWorkshops, inSessions] = await Promise.all([
      db
        .select({ id: workshopsTable.id })
        .from(workshopsTable)
        .where(eq(workshopsTable.code, code))
        .limit(1),
      db
        .select({ id: workshopSessionsTable.id })
        .from(workshopSessionsTable)
        .where(eq(workshopSessionsTable.workshopCode, code))
        .limit(1),
    ]);
    if (!inWorkshops[0] && !inSessions[0]) return code;
  }
  throw new Error("could not allocate workshop code");
}

/**
 * Replace `{{path.to.key}}` tokens in JSON using flat/dotted variable values.
 * Unknown tokens left as-is (caller should validate in Phase 4).
 */
export function resolveContentTokens(
  content: unknown,
  values: Record<string, unknown>,
): unknown {
  const flat = flattenValues(values);
  return walk(content, (s) =>
    s.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key: string) => {
      const v = flat[key];
      if (v === undefined || v === null) return match;
      return String(v);
    }),
  );
}

function flattenValues(
  values: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenValues(v as Record<string, unknown>, key));
    } else if (v !== undefined && v !== null) {
      out[key] = String(v);
      out[k] = String(v);
    }
  }
  return out;
}

function walk(value: unknown, mapString: (s: string) => string): unknown {
  if (typeof value === "string") return mapString(value);
  if (Array.isArray(value)) return value.map((v) => walk(v, mapString));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, mapString);
    }
    return out;
  }
  return value;
}
