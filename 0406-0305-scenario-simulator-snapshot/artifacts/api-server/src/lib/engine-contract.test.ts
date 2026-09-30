import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SHARED_CSV_COLUMNS,
  branchingEngine,
  csvEscape,
  engineOf,
  investigationEngine,
  sharedCsvPrefix,
} from "./engine-contract";

describe("engine contract", () => {
  it("investigation reports submitted when submittedAt set", () => {
    const p = investigationEngine.progressOf({
      currentScreen: "define",
      submittedAt: new Date().toISOString(),
    });
    assert.equal(p.done, true);
    assert.equal(p.progress, "Submitted");
  });

  it("branching reports done on reveal", () => {
    const p = branchingEngine.progressOf({ currentScreen: "reveal" });
    assert.equal(p.done, true);
    assert.equal(p.progress, "Reveal");
  });

  it("shared CSV prefix is stable", () => {
    const row = sharedCsvPrefix(
      {
        client: "Acme",
        session: "Acme — Demand",
        exercise: "The Demand Spike",
        category: "problem-framing",
        engine: "investigation",
      },
      {
        team: "Blue Team",
        slot: "Team 01",
        startedAt: "2026-01-01T00:00:00.000Z",
        endedAt: "2026-01-01T00:30:00.000Z",
        progress: "Submitted",
        submitted: "yes",
      },
    );
    assert.equal(SHARED_CSV_COLUMNS.length, 11);
    assert.equal(row.length, 11);
    assert.equal(row[0], "Acme");
    assert.equal(row[4], "investigation");
    assert.equal(row[10], "yes");
  });

  it("engineOf defaults unknown to investigation", () => {
    assert.equal(engineOf("mystery").format, "investigation");
  });

  it("csvEscape quotes commas", () => {
    assert.equal(csvEscape("a,b"), '"a,b"');
  });
});
