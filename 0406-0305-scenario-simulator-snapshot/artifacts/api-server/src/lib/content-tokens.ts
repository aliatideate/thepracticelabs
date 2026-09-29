import type { ExerciseVariableDef } from "@workspace/db";

export type VariableValidationError = { error: string; status: 400 };

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/** Collect unique `{{token}}` keys from JSON / Markdown content. */
export function extractContentTokens(content: unknown): string[] {
  const found = new Set<string>();
  walk(content, (s) => {
    TOKEN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TOKEN_RE.exec(s)) !== null) {
      found.add(m[1]!);
    }
    return s;
  });
  return [...found].sort();
}

/**
 * Replace `{{path.to.key}}` tokens in JSON / strings using flat/dotted variable values.
 * Unknown / empty tokens left as-is (caller must reject unresolved leftovers).
 */
export function resolveContentTokens(
  content: unknown,
  values: Record<string, unknown>,
): unknown {
  const flat = flattenValues(values);
  return walk(content, (s) =>
    s.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, key: string) => {
      const v = flat[key];
      if (v === undefined || v === null || v === "") return match;
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

/** Keys still present as `{{…}}` after resolution. */
export function findUnresolvedTokens(content: unknown): string[] {
  return extractContentTokens(content);
}

/**
 * Every `{{token}}` in content + notes must be declared; every declared
 * variable must appear at least once. Fail closed — never ship frozen tokens.
 */
export function validateTokenDeclarations(
  definitions: ExerciseVariableDef[],
  content: unknown,
  notes?: string | null,
): VariableValidationError | null {
  const declared = new Set(definitions.map((d) => d.key));
  const used = new Set([
    ...extractContentTokens(content),
    ...extractContentTokens(notes ?? ""),
  ]);

  const undeclared = [...used].filter((k) => !declared.has(k)).sort();
  if (undeclared.length > 0) {
    return {
      error: `Undeclared content tokens: ${undeclared.map((k) => `{{${k}}}`).join(", ")}. Declare them as variables or remove them from content/notes.`,
      status: 400,
    };
  }

  const unused = [...declared].filter((k) => !used.has(k)).sort();
  if (unused.length > 0) {
    return {
      error: `Unused declared variables: ${unused.join(", ")}. Remove them from the variable schema or use them in content/notes.`,
      status: 400,
    };
  }

  return null;
}

/**
 * Merge declared defaults, derive chain.namePlural from chain.name when empty,
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
      if (def.default !== undefined && def.default !== "") {
        setByKey(out, def.key, def.default);
      }
    }
  }
  const chainName = getByKey(out, "chain.name");
  if (typeof chainName === "string" && chainName.trim()) {
    const plural = getByKey(out, "chain.namePlural");
    if (plural === undefined || plural === null || String(plural).trim() === "") {
      setByKey(out, "chain.namePlural", `${chainName.trim()}s`);
    }
  }
  if (opts.logoAssetId) {
    setByKey(out, "company.logo", `/api/create/assets/${opts.logoAssetId}`);
  }
  return out;
}

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
