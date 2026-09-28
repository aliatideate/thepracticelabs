import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, workshopSessionsTable, workshopsTable } from "@workspace/db";
import type { ExerciseVariableDef } from "@workspace/db";

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
 * Replace `{{path.to.key}}` tokens in JSON / strings using flat/dotted variable values.
 * Unknown tokens left as-is (caller should validate).
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

/** Resolve tokens in a Markdown / plain-text facilitator notes string. */
export function resolveFacilitatorNotes(
  notes: string | null | undefined,
  values: Record<string, unknown>,
): string | null {
  if (notes == null || notes === "") return notes ?? null;
  return resolveContentTokens(notes, values) as string;
}

/**
 * Merge declared defaults, derive chain.namePlural from chain.name,
 * and apply an uploaded logo asset URL when present.
 */
export function prepareVariableValues(opts: {
  definitions: ExerciseVariableDef[];
  values: Record<string, unknown>;
  logoAssetId?: string | null;
}): Record<string, unknown> {
  const out: Record<string, unknown> = { ...opts.values };
  for (const def of opts.definitions) {
    const cur = getByKey(out, def.key);
    if (cur === undefined || cur === null || cur === "") {
      if (def.default !== undefined) setByKey(out, def.key, def.default);
    }
  }
  const chainName = getByKey(out, "chain.name");
  if (typeof chainName === "string" && chainName.trim()) {
    const plural = getByKey(out, "chain.namePlural");
    if (plural === undefined || plural === null || plural === "") {
      setByKey(out, "chain.namePlural", `${chainName.trim()}s`);
    }
  }
  if (opts.logoAssetId) {
    setByKey(out, "company.logo", `/api/create/assets/${opts.logoAssetId}`);
  }
  return out;
}

export type VariableValidationError = { error: string; status: 400 };

/** Validate variable values against definitions (maxLength, The-prefix, required). */
export function validateVariableValues(
  definitions: ExerciseVariableDef[],
  values: Record<string, unknown>,
): VariableValidationError | null {
  for (const def of definitions) {
    const raw = getByKey(values, def.key);
    const str = raw == null ? "" : String(raw);
    if (def.required && !str.trim()) {
      return { error: `${def.label} is required`, status: 400 };
    }
    if (def.type === "text" && def.maxLength != null && str.length > def.maxLength) {
      return {
        error: `${def.label} must be ≤ ${def.maxLength} characters`,
        status: 400,
      };
    }
    if (
      def.type === "text" &&
      (def.key === "company.name" || def.key === "company.shortName") &&
      /^\s*the\s+/i.test(str)
    ) {
      return {
        error: `${def.label} can’t start with “The ” (titles already add the article)`,
        status: 400,
      };
    }
  }
  return null;
}

/** Lowercase ASCII slug for download filenames; empty if nothing usable. */
export function sanitiseFilenameSlug(input: string | null | undefined): string {
  if (!input) return "";
  const ascii = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return ascii.slice(0, 48);
}

function getByKey(values: Record<string, unknown>, key: string): unknown {
  if (key in values) return values[key];
  const parts = key.split(".");
  let cur: unknown = values;
  for (const p of parts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setByKey(values: Record<string, unknown>, key: string, value: unknown): void {
  values[key] = value;
  const parts = key.split(".");
  if (parts.length === 1) return;
  let cur: Record<string, unknown> = values;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const next = cur[p];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cur[p] = {};
    }
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
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
