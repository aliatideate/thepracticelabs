# Join screen fixes — plan (approve before implement)

**Status:** plan only — wait for Ali approval. Copy/structure only; not the blocked visual redesign.  
**Code root:** `0406-0305-scenario-simulator-snapshot/`  
**Date:** 2026-10-01

## Scope

| # | Change | Implement? |
| --- | --- | --- |
| A | Team callout copy → exercise chrome | Yes (after approve) |
| B | Timer red `00:00` before meaningful start / on expired join | Yes |
| C | Duplicate session/scenario (header + MetaGrid) | Yes |
| D | “This table already has a slot” → “This team…” | Yes |
| E | Device switch / reclaim | **Report only** — no code |

---

## A. Team callout → chrome

**Problem:** Shared join screens hardcode Mart-specific coaching.

| File | Current copy |
| --- | --- |
| `artifacts/scenario-simulator/src/pages/mart-join.tsx` (~148–150) | “Discuss each choice… Once you pick a door, you cannot undo it.” |
| `artifacts/scenario-simulator/src/pages/join.tsx` (~135+) | Demand variant (“goal is not to solve…”) still hardcoded |

**Plan:**

1. Extend `DecisionChrome` (schema + defaults + client type) with an optional join callout field, e.g. `joinTeamCallout` (and maybe `joinTeamKicker` defaulting to “Work as a team”).
   - Schema: `artifacts/api-server/src/lib/decision-game.ts` (`decisionChromeSchema`, `DEFAULT_MART_CHROME`)
   - Client mirror: `artifacts/scenario-simulator/src/lib/decisionGame.tsx`
   - Mart default fallback: door line stays in `DEFAULT_MART_CHROME` so Harbor Mart unchanged without content edits.
2. `mart-join.tsx`: render `TeamCallout` from `chromeOf(game).joinTeamCallout` (hide callout if empty string / null if we allow “none”).
3. Demand `join.tsx`: either keep Demand-specific hardcode for now, or add a Demand chrome/config string later — **prefer** a small Demand constant or scenario field so imports aren’t forced into Mart chrome. Recommend: Demand keeps its own line in `join.tsx` (or scenario JSON if one already exists); only Mart/branching uses `chrome.joinTeamCallout`.
4. Content: optional update `content/decision-game.v2.json` chrome block; Lacehouse / frozen sessions inherit Mart default until edited.

**Out of scope:** redesign of callout visuals.

---

## B. Timer red `00:00` before start / on expired rooms

**Problem:** Join on old rehearsal rooms (`startedAt` set, duration elapsed) shows red **00:00**. Ali wants **full duration or nothing** until a meaningful start — not a scary expired clock on join.

**Today:**

| File | Behavior |
| --- | --- |
| `artifacts/scenario-simulator/src/simulation/components.tsx` (`Header`) | `!startedAt` → `"Not started"`; `startedAt` + `isExpired` → red `"00:00"` |
| `artifacts/scenario-simulator/src/lib/timer.ts` | `isExpired` true when `endedAt` or remaining ≤ 0 |

**Plan (file-by-file):**

1. `components.tsx` — change `timerLabel` / `timerClass` policy for join-friendly display:
   - Preferred: if expired **and** facilitator has not “ended” the exercise in a workshop sense, show **full duration** (`formatCountdown(durationMinutes * 60_000)`) in neutral style, **or** hide the timer chip entirely on join routes.
   - Clarify product rule with Ali on approve: **(i)** show `MM:00` full duration until start, **(ii)** hide until start, **(iii)** keep “Not started” when `!startedAt` and only fix the expired-started case.
2. Likely no change to `timer.ts` math — only presentation in `Header` (and any board that should still show expired red after a real run).
3. Join pages pass `configPath` already (`mart-join.tsx`, `join.tsx`) — may add a prop e.g. `timerMode="join"` on `Header` so facilitate boards can keep red `00:00` when truly expired.

**Note:** Prod smoke `Q7X2TU` showed red `00:00` with Open slots **1 of 6** — open-slots OK; this is the timer item.

---

## C. Duplicate session / scenario

**Problem:** Header already shows session label + scenario title; MetaGrid repeats Session + Scenario.

| File | Header | MetaGrid |
| --- | --- | --- |
| `mart-join.tsx` | `MART_SESSION_LABEL` + `game.scenario.title` | Session “Session 2”, Scenario title |
| `join.tsx` | Demand session label + scenario | Same pattern |

**Plan:** Remove Session + Scenario rows from MetaGrid on both join pages; keep Duration + Open slots (and any unique meta). Optionally keep one of them if header is hidden on small breakpoints — check `Header` truncates titles below `md`; if so, keep a single scenario line in the page body instead of duplicating both.

---

## D. Copy: table → team

| File | Strings to change |
| --- | --- |
| `mart-join.tsx` | Error + inline: “This **table** already has a slot…” → “This **team** already has a slot…” (×2) |
| `join.tsx` | Same (×2) |

Also scan nearby “Other tables will see…” on name form (`mart-join.tsx` ~168) — change to “Other **teams**…” if Ali wants consistency (call out on approve).

---

## E. Device switch — report only (no code)

| Question | Finding |
| --- | --- |
| How does refresh resume? | `localStorage` via `teamStorage.ts` (`MART_STORAGE_KEY` / Demand key) stores `{ sessionId, teamName }`. Same browser → resume. |
| New device / cleared storage? | Slot still claimed server-side; UI “Slot taken”; reclaim fails (“already in the session” / table-already-has-slot error). |
| Facilitator Release? | `DELETE` session (`/api/mart/sessions/:id` or Demand `/api/sessions/:id`) → **slot frees, progress lost**. |
| Code-entry / transfer / magic link? | **None.** Release is the only recovery path today. |

No implementation in this pass unless Ali asks for a reclaim design later.

---

## Suggested implement order (after approve)

1. D (copy) — tiny  
2. C (MetaGrid dedupe)  
3. A (chrome field + mart-join)  
4. B (timer presentation + optional `timerMode`)  

Ship through **staging** (`main`) only; no production promote without Ali.

## Non-goals

- Join visual redesign (still waiting on Ali examples)  
- Device reclaim feature  
- Changing open-slots math (#36 done)
