/**
 * Token declaration / resolve tests.
 *
 * Would have blocked seeding v2 content while the create path still froze
 * unresolved `{{tokens}}` into sessions (status doc §7 A).
 *
 *   pnpm --filter @workspace/api-server run test:tokens
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import type { ExerciseVariableDef } from "@workspace/db";
import {
  extractContentTokens,
  findUnresolvedTokens,
  prepareVariableValues,
  resolveContentTokens,
  resolveFacilitatorNotes,
  validateTokenDeclarations,
} from "./content-tokens";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, "../../../../content");

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
    key: "chain.namePlural",
    label: "Plural (if different)",
    type: "text",
    maxLength: 40,
    required: false,
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

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(resolve(contentDir, name), "utf8"));
}

describe("v2 content token coverage (seed must match resolve)", () => {
  it("Demand v2: every token declared and every variable used", () => {
    const content = loadJson("scenario.v2.json");
    const err = validateTokenDeclarations(DEMAND_VARIABLES, content, DEMAND_NOTES);
    assert.equal(err, null, err?.error);
  });

  it("Mart v2: every token declared and every variable used", () => {
    const content = loadJson("decision-game.v2.json");
    const err = validateTokenDeclarations(MART_VARIABLES, content, MART_NOTES);
    assert.equal(err, null, err?.error);
  });

  it("resolving Demand defaults leaves no {{ tokens (would catch pre-resolve freeze)", () => {
    const content = loadJson("scenario.v2.json");
    const values = prepareVariableValues({
      definitions: DEMAND_VARIABLES,
      values: {},
    });
    const resolved = resolveContentTokens(content, values);
    const notes = resolveFacilitatorNotes(DEMAND_NOTES, values);
    const leftover = [
      ...findUnresolvedTokens(resolved),
      ...findUnresolvedTokens(notes ?? ""),
    ];
    assert.deepEqual(leftover, [], `frozen tokens: ${leftover.join(", ")}`);
    const blob = JSON.stringify(resolved) + (notes ?? "");
    assert.equal(blob.includes("{{"), false);
    assert.equal(blob.includes("Gulf Beverages"), true);
  });

  it("resolving Mart defaults leaves no {{ tokens and derives plural", () => {
    const content = loadJson("decision-game.v2.json");
    const values = prepareVariableValues({
      definitions: MART_VARIABLES,
      values: {},
    });
    assert.equal(values["chain.namePlural"], "Saha Marts");
    const resolved = resolveContentTokens(content, values);
    const notes = resolveFacilitatorNotes(MART_NOTES, values);
    const leftover = [
      ...findUnresolvedTokens(resolved),
      ...findUnresolvedTokens(notes ?? ""),
    ];
    assert.deepEqual(leftover, [], `frozen tokens: ${leftover.join(", ")}`);
    const blob = JSON.stringify(resolved) + (notes ?? "");
    assert.equal(blob.includes("{{"), false);
    assert.equal(blob.includes("Saha Marts"), true);
  });

  it("storing tokenised content without resolve would freeze tokens (regression guard)", () => {
    const content = loadJson("scenario.v2.json");
    // Simulates old create path: persist version.content as resolvedContent.
    const leftover = findUnresolvedTokens(content);
    assert.ok(leftover.length > 0, "v2 content must contain tokens to make this guard meaningful");
    assert.ok(leftover.includes("company.name"));
  });
});

describe("validateTokenDeclarations", () => {
  it("rejects undeclared tokens", () => {
    const err = validateTokenDeclarations(
      [{ key: "company.name", label: "Company", type: "text", required: true }],
      "Hello {{company.name}} and {{mystery.key}}",
      null,
    );
    assert.ok(err);
    assert.match(err!.error, /Undeclared/);
    assert.match(err!.error, /mystery\.key/);
  });

  it("rejects unused declared variables", () => {
    const err = validateTokenDeclarations(
      [
        { key: "company.name", label: "Company", type: "text", required: true },
        { key: "orphan.key", label: "Orphan", type: "text", required: false },
      ],
      "Hello {{company.name}}",
      null,
    );
    assert.ok(err);
    assert.match(err!.error, /Unused/);
    assert.match(err!.error, /orphan\.key/);
  });

  it("accepts custom plural override", () => {
    const values = prepareVariableValues({
      definitions: MART_VARIABLES,
      values: { "chain.name": "Souk", "chain.namePlural": "Souks" },
    });
    assert.equal(values["chain.namePlural"], "Souks");
  });
});

describe("extractContentTokens", () => {
  it("dedupes nested JSON tokens", () => {
    const tokens = extractContentTokens({
      a: "{{company.name}}",
      b: ["{{company.name}}", "{{chain.name}}"],
    });
    assert.deepEqual(tokens, ["chain.name", "company.name"]);
  });
});
