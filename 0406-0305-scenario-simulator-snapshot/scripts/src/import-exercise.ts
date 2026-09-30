/**
 * Import a content JSON (+ optional notes) via the Creator import API.
 * The API validates against the engine schema and never writes on failure.
 *
 * Usage:
 *   BASE_URL=https://app-staging-78f4.up.railway.app \
 *   CREATOR_EMAIL=… CREATOR_PASSWORD=… \
 *   pnpm --filter @workspace/scripts run import:exercise -- \
 *     --engine investigation \
 *     --category problem-framing \
 *     --title "My exercise" \
 *     --content ../../content/my.json \
 *     [--notes ../../content/my-notes.md] \
 *     [--variables ../../content/my-variables.json] \
 *     [--exercise-id <uuid>]
 *
 * Do not treat scenario.v2.json / decision-game.v2.json alone as proof —
 * ask for a real draft exercise to validate against.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

function printUsage() {
  console.error(`Usage: import:exercise --engine <investigation|branching> --category <…> --content <file.json>
  [--title <name>] [--exercise-id <uuid>] [--notes <file.md>] [--variables <file.json>]
  Env: BASE_URL, CREATOR_EMAIL, CREATOR_PASSWORD`);
}

function pickCookie(res: Response): string | null {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length > 0) {
    return raw.map((c) => c.split(";")[0]).join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (!single) return null;
  return single.split(",").map((p) => p.split(";")[0].trim()).filter(Boolean).join("; ");
}

async function main() {
  const engine = argValue("--engine");
  const category = argValue("--category");
  const title = argValue("--title");
  const exerciseId = argValue("--exercise-id");
  const contentPath = argValue("--content");
  const notesPath = argValue("--notes");
  const variablesPath = argValue("--variables");
  const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const email = process.env.CREATOR_EMAIL;
  const password = process.env.CREATOR_PASSWORD;

  if (!engine || !category || !contentPath || (!title && !exerciseId)) {
    printUsage();
    process.exit(1);
  }
  if (!email || !password) {
    console.error("CREATOR_EMAIL and CREATOR_PASSWORD are required");
    process.exit(1);
  }

  const content = JSON.parse(readFileSync(resolve(contentPath), "utf8"));
  const facilitatorNotes = notesPath
    ? readFileSync(resolve(notesPath), "utf8")
    : null;
  const variables = variablesPath
    ? JSON.parse(readFileSync(resolve(variablesPath), "utf8"))
    : [];

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    console.error(`Login failed (${loginRes.status})`);
    process.exit(1);
  }
  const cookie = pickCookie(loginRes);
  if (!cookie) {
    console.error("Login succeeded but no session cookie returned");
    process.exit(1);
  }

  const importRes = await fetch(`${base}/api/create/exercises/import`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      title: title ?? undefined,
      exerciseId: exerciseId ?? undefined,
      category,
      engine,
      content,
      facilitatorNotes,
      variables,
    }),
  });
  const body = (await importRes.json().catch(() => ({}))) as {
    error?: string;
    errors?: { path: string; message: string }[];
    id?: string;
    version?: { version: number; id: string };
  };

  if (!importRes.ok) {
    console.error("Validation/import failed — nothing written (or request rejected).");
    console.error(`  ${body.error ?? importRes.status}`);
    for (const e of body.errors ?? []) {
      console.error(`  ${e.path}: ${e.message}`);
    }
    process.exit(1);
  }

  console.log(`Imported exercise ${body.id} version ${body.version?.version} (${body.version?.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
