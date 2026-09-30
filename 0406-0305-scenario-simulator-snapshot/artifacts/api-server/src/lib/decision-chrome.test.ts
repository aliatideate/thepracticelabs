/**
 * Chrome lift: optional on frozen content, required on import.
 *
 *   pnpm --filter @workspace/api-server run test:chrome
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  DEFAULT_MART_CHROME,
  chromeOf,
  parseDecisionGameContent,
} from "./decision-game";
import { formatStopList } from "./decision-engine";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, "../../../../content");

describe("decision chrome", () => {
  it("falls back to Mart wording when chrome is absent", () => {
    assert.deepEqual(chromeOf({}), DEFAULT_MART_CHROME);
    assert.equal(formatStopList([3]), "Branch 3");
    assert.equal(formatStopList([1, 4]), "Branches 1 and 4");
    assert.equal(formatStopList([1, 2, 5]), "Branches 1, 2 and 5");
  });

  it("uses stop templates from chrome", () => {
    const chrome = {
      ...DEFAULT_MART_CHROME,
      stopOne: "Stop {n}",
      stopTwo: "Stops {a} and {b}",
      stopMany: "Stops {list} and {last}",
    };
    assert.equal(formatStopList([2], chrome), "Stop 2");
    assert.equal(formatStopList([2, 6], chrome), "Stops 2 and 6");
    assert.equal(formatStopList([1, 3, 6], chrome), "Stops 1, 3 and 6");
  });

  it("parses content without chrome (frozen/legacy)", () => {
    const raw = JSON.parse(readFileSync(resolve(contentDir, "decision-game.v2.json"), "utf8"));
    const { chrome: _drop, ...without } = raw;
    const parsed = parseDecisionGameContent(without);
    assert.equal(parsed.chrome, undefined);
    assert.equal(chromeOf(parsed).startCta, "Start the week");
  });

  it("requires chrome on import", () => {
    const raw = JSON.parse(readFileSync(resolve(contentDir, "decision-game.v2.json"), "utf8"));
    const { chrome: _drop, ...without } = raw;
    assert.throws(
      () => parseDecisionGameContent(without, { requireChrome: true }),
      /chrome/,
    );
    const withChrome = parseDecisionGameContent(raw, { requireChrome: true });
    assert.equal(withChrome.chrome?.startCta, "Start the week");
  });
});
