# Practice Labs — build status for review (2026-09-30)

Audience: senior engineering manager + LLM reviewers.  
Ask for: comments on product completeness, risk, and what to test before the next live workshop.

**Screenshots in this doc:** [`./media/status-2026-09-30-sem/`](./media/status-2026-09-30-sem/)  
**Code root:** `0406-0305-scenario-simulator-snapshot/` · Repo: `aliatideate/thepracticelabs`

---

## 1. Snapshot

| | Staging | Production |
| --- | --- | --- |
| URL | https://app-staging-78f4.up.railway.app | https://practicelabs.up.railway.app |
| Git branch | `main` | `production` |
| Tip (as of this doc) | `f74aaf2` (includes open-slots fix) | `8f37ba1` (**1 commit behind** `main`) |
| Creator | `/login` → `/create` | same |

**Deploy model (hard rule):** merge → staging only. Production updates only by fast-forward `production` ← `main` when Ali explicitly approves. No `railway up` to production. Details: repo `docs/deploy-staging-first.md`.

**Product intent:** one Ideate operator manages **clients**, picks a **published exercise**, lightly customises tokens (company / chain / locations / logo), creates an **isolated workshop session** (join / facilitate / try / print), and captures **briefs** for exercises still in design. Not an exercise generator.

**Engines today:**

| Engine | Player experience | Example exercise |
| --- | --- | --- |
| `investigation` (Demand) | Stakeholder interviews → recommendation | The Demand Spike |
| `branching` (Mart) | Field decisions → reveal / manager review | A Week in the Field; Lacehouse buying week (imported) |

---

## 2. What we have built

### 2.1 Creator Studio (Phases 1–5 + 7)

Live end-to-end: auth → clients → activities/briefs → new-session wizard → session links → facilitator boards with notes.

| Capability | Notes |
| --- | --- |
| Email/password Creator auth | httpOnly cookie; Railway `CREATOR_*` |
| Clients list + detail | Nested sessions; empty-state boxes |
| New client lightbox | Modal drifts from top |
| Delete empty clients only | Hover trash on card; blocked if any session exists |
| Amazon-style trail breadcrumbs | Clients › … › current |
| Creator-styled selects | Replaced native `<select>` |
| Activities + brief editor | Intake only; no generation |
| Session create | Frozen `resolved_content` + notes per room |
| Co-facilitator `?token=` links | Board loads without Creator login (fixed 2026-09-30) |
| Facilitator notes panel | Markdown from resolved notes (Phase 7) |
| Shared CSV export prefix | Demand + Mart |

![New client lightbox over Clients grid](./media/status-2026-09-30-sem/01-creator-new-client-lightbox.webp)

*New client lightbox on Creator home.*

![Hover trash on empty client card](./media/status-2026-09-30-sem/02-creator-hover-delete-empty-client.webp)

*Empty client: trash appears on hover → confirm delete.*

![Client card with sessions, no delete](./media/status-2026-09-30-sem/03-creator-client-with-sessions.webp)

*Client with sessions: no delete control; status tags flush right.*

![Session page trail breadcrumbs](./media/status-2026-09-30-sem/04-creator-session-trail.webp)

*Session detail trail: Clients › client › session title.*

### 2.2 Rest-of-build (PR #33) — engine contract, import, CSV

| Piece | Status |
| --- | --- |
| Engine contract (progress / board helpers) | Shipped |
| Category ≠ engine in UI | Shipped (wizard/Activities no longer conflate them) |
| Shared CSV export | Shipped |
| Exercise import API + CLI + Activities UI | Shipped |
| Token / placeholder safeguards on import + session create | Shipped |
| Staging-first Railway wiring | Live |

Import entry points: `POST /api/create/exercises/import`, `pnpm import:exercise`, Activities → Import. Branching imports **require** a `chrome` block (player UI strings); runtime falls back to Mart defaults for older frozen content.

### 2.3 Mart player chrome in content (PR #34)

Player chrome strings (e.g. “Start the week”, progress “Branch N of M”, travel overlay, manager-review copy, closing line) lift into exercise `chrome` so imported stories are not stuck on Harbor Mart wording.

![Manager review chrome block](./media/status-2026-09-30-sem/11-mart-manager-review-chrome.webp)

*Reveal manager-review block — wording can come from content `chrome`.*

![Production Mart try intro](./media/status-2026-09-30-sem/12-prod-mart-try-intro.webp)

*Production Mart try-out intro (Harbor Mart / Week in the Field).*

### 2.4 Lacehouse import stress test (PR #35 + staging import)

Real second Mart-engine exercise (not a schema fixture): Falaj Footwear buying week. Imported on **staging** with **zero validation errors** and **no code changes**.

| | |
| --- | --- |
| Client | Falaj Footwear |
| Code | `HD6Y2S` |
| Own variables | `company.name`, `influencer.name`, `locations.*` (not `branches.*`) |
| Playthrough | Intro → 6 stops → reveal; board + CSV/JSON export OK |

![Lacehouse intro](./media/status-2026-09-30-sem/08-lacehouse-intro.webp)

*Imported Lacehouse intro — chrome “Start the week” on a non-Mart story.*

![Lacehouse stop chrome](./media/status-2026-09-30-sem/09-lacehouse-stop-chrome.webp)

*Stop 1 of 6 at Al Quoz — progress chrome + location tokens resolved.*

**Still hardcoded for any branching story** (by design today): option ids `A \| B \| call`; four style keys (`operator|escalator|cowboy|bottleneck`); `{branches}` token name inside some tag templates; hotspot rectangles; travel “comma → area” parsing. Labels/copy can change; shape cannot without more engine work.

### 2.5 Join open-slots fix (PR #36) — on staging, not yet production

Mart join meta used `TEAM_NAMES.length` (10) while the grid used `room.teamCount` (e.g. 6). Fixed to `teamSlots.length`. Verified on staging `AXQKUC`: **1 of 6**.

![Staging open slots 1 of 6](./media/status-2026-09-30-sem/10-staging-open-slots-1-of-6.webp)

*Staging Mart join after #36: Open slots **1 of 6**, six cards — matches room `teamCount`.*

### 2.6 Rehearsals already run (2026-09-30)

| Env | Client | Sessions | Outcome |
| --- | --- | --- | --- |
| Staging | Rehearsal Co | Demand `H72DJ7`, Mart `AXQKUC` | 7 team joins; mid-flow refresh OK; CSV/archive/print OK |
| Production | Prod Rehearsal Co | Demand `6SZHRJ`, Mart `Q7X2TU` | Same shape; promote OK at tip `5a2e218`+ |

**Broke then fixed:** co-facilitator UI links hit Creator `/login` because `AuthGate` ignored `?token=`. Fix: `allowFacilitatorToken` on facilitate routes. Retested staging + production.

![Mart co-facilitator board](./media/status-2026-09-30-sem/05-cofacilitator-mart-board.webp)

*Mart board via co-facilitator token (no Creator login).*

![Demand co-facilitator board](./media/status-2026-09-30-sem/06-cofacilitator-demand-board.webp)

*Demand board via co-facilitator token.*

![Demand print](./media/status-2026-09-30-sem/07-demand-print.webp)

*Demand `/print` HTML with client-renamed company (breakout PDF fallback).*

---

## 3. What is left

| Item | Priority | Notes |
| --- | --- | --- |
| **Promote open-slots fix to production** | High (when Ali OK) | Staging has it; prod still shows “1 of 10” on 6-team rooms |
| **Join-flow visual polish** | Blocked | Waiting on Ali’s examples; do **not** invent a redesign |
| **Facilitator attention / nudge** | Medium | Built earlier; **never exercised** in rehearsals |
| **Six-window dress rehearsal (formal)** | Medium | Multi-team + mid-flow refresh done in Creator rehearsals; a timed 30‑min six-window pass may still be desired |
| **Save `/print` as PDF** | Low/ops | Process fallback for breakouts; Demand print HTML already works |
| **Loosen Mart engine shape** | Only if needed | Free option ids / style keys / `{branches}` token — not required for Lacehouse |
| **Branch protection on `production`** | Ops | Discussed; confirm in GitHub if desired |
| **Unilever Session 1 content** | Locked | Do not reopen decided content (Rohini Q3, SKU snapshot, etc.) |

Out of scope unless reopened: restoring removed demo screens; rewriting live Unilever pedagogy.

---

## 4. What matters most to test next

Ordered for a busy SEM / facilitator dry-run. Prefer **staging** until open-slots is promoted.

### P0 — before trusting staging tip / next promote

1. **Mart join open slots** — https://app-staging-78f4.up.railway.app/s/AXQKUC  
   Expect Open slots **N of 6** (not 10); card count = `teamCount`.
2. **Co-facilitator token** — open session’s co-facilitator link (incognito).  
   Board must load **without** Creator login (Mart + Demand).
3. **Creator → new session → join** — non-Unilever client; Demand + Mart; claim a slot; mid-flow refresh; confirm same team.

### P1 — import / multi-exercise confidence

4. **Lacehouse imported session** — https://app-staging-78f4.up.railway.app/s/HD6Y2S/try  
   Chrome (“Stop N of M”, “Next stop”), renamed locations, full path to reveal.
5. **Import UI or CLI** — Activities → Import (or CLI) with a rough third exercise if available; fail-closed validation should surface path errors, not write bad rows.
6. **CSV + archive** — after ≥1 team submits, export CSV (shared prefix) and save/list archive on both engines.

### P2 — workshop-day ops

7. **Demand `/print`** — https://app-staging-78f4.up.railway.app/s/H72DJ7/print (or fresh session); save PDF manually if needed for breakouts.
8. **Attention / nudge** on a live board (never rehearsed).
9. **Production smoke after promote** — only when Ali says so: join `Q7X2TU` (or new room) for open-slots; token board; one Demand + one Mart happy path.

### Explicitly lower urgency

- Join visual redesign (blocked on design input).  
- Engine shape generalisation (only if next imported exercise hits a wall).  
- Creator UI chrome polish already shipped (#28–#32).

---

## 5. Handy links

### Staging

| Purpose | URL |
| --- | --- |
| Creator | https://app-staging-78f4.up.railway.app/login |
| Mart rehearsal join | https://app-staging-78f4.up.railway.app/s/AXQKUC |
| Demand rehearsal join | https://app-staging-78f4.up.railway.app/s/H72DJ7 |
| Demand print | https://app-staging-78f4.up.railway.app/s/H72DJ7/print |
| Lacehouse try | https://app-staging-78f4.up.railway.app/s/HD6Y2S/try |
| Lacehouse facilitate | https://app-staging-78f4.up.railway.app/s/HD6Y2S/facilitate |

### Production

| Purpose | URL |
| --- | --- |
| Creator | https://practicelabs.up.railway.app/login |
| Mart rehearsal | https://practicelabs.up.railway.app/s/Q7X2TU |
| Demand rehearsal | https://practicelabs.up.railway.app/s/6SZHRJ |
| Legacy Unilever facilitate | https://practicelabs.up.railway.app/facilitate/unilever-s1 |

---

## 6. Recent merged PRs (context)

| PR | Topic |
| --- | --- |
| [#33](https://github.com/aliatideate/thepracticelabs/pull/33) | Rest of Creator build: engine contract, import, shared CSV |
| [#34](https://github.com/aliatideate/thepracticelabs/pull/34) | Mart player chrome → content |
| [#35](https://github.com/aliatideate/thepracticelabs/pull/35) | Lacehouse Mart-engine import stress-test content |
| [#36](https://github.com/aliatideate/thepracticelabs/pull/36) | Mart join open-slots count = `teamCount` (**staging only until promote**) |
| #28–#32 | Creator breadcrumbs, selects, client lightbox/delete |

---

## 7. Suggested questions for reviewers

1. Is staging-first + explicit promote the right long-term gate, or do we need branch protection / required checks on `production`?
2. Should attention/nudge be in the P0 workshop checklist, or can it wait?
3. For the next imported exercise: accept current Mart shape constraints, or schedule engine generalisation first?
4. Join visual polish: treat as pre-workshop must-have, or post-workshop once Ali supplies examples?
5. Any gap in Creator (roles, audit log, multi-org) that should block broader Ideate use?

---

## 8. Related docs (deeper / agent-oriented)

| Doc | Role |
| --- | --- |
| `docs/deploy-staging-first.md` | Deploy rules |
| `docs/import-and-safeguards.md` | Import validation |
| `docs/rehearsal-results.md` | Staging + prod rehearsal log |
| `docs/shell-engine-audit.md` | Shell vs engine boundary |
| `docs/creator-studio-status-2026-09-30.md` | Earlier Creator UI handoff (partly superseded) |
| `docs/handoff-2026-09-30.md` | Agent pick-up + Mart content-vs-code notes |
