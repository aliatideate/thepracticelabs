# Handoff — continue Ali’s 2026-10-01 build list

Pick up here. User is moving to another Cursor agent. Code root: `0406-0305-scenario-simulator-snapshot/`. Repo: `aliatideate/thepracticelabs`.

**Progress (2026-10-01):** Steps 1–6 advanced — see agent store `internal/continue-build-progress-2026-10-01.md`. Join implement + Mart attention fix + archive build wait on Ali.

---

## Snapshot

| Item | Value |
| --- | --- |
| Staging | https://app-staging-78f4.up.railway.app ← branch `main` |
| Production | https://practicelabs.up.railway.app ← branch `production` |
| Tip (both) | `f74aaf2` — Merge PR #36 (Mart open-slots fix) |
| Open drafts | [#37](https://github.com/aliatideate/thepracticelabs/pull/37) status · [#38](https://github.com/aliatideate/thepracticelabs/pull/38) this handoff · [#39](https://github.com/aliatideate/thepracticelabs/pull/39) join plan · [#40](https://github.com/aliatideate/thepracticelabs/pull/40) `{stops}` · [#41](https://github.com/aliatideate/thepracticelabs/pull/41) promote-via-PR rule |
| Working branch | Start new work from `main` as `cursor/<name>-5dc1` |
| Deploy rule | Staging first via `main`. **Promote production only by PR `main` → `production`**, list session impact, wait for Ali’s explicit “yes” in chat before merging. **Never** push `production` directly. **Never** `railway up` prod. Details: `docs/deploy-staging-first.md`. |

**Ali’s standing rules for this pass**

- Everything ships through staging first.
- Nothing beyond #36 goes to production without Ali’s approval. (#36 promote **was** approved and done.)
- From now on, rehearse on **staging** unless Ali asks otherwise (prod rehearsal clients can’t be deleted → clutter).
- Production promote = open PR from `main` into `production` → describe changes / existing-session impact → wait for Ali “yes” in chat → merge that PR. No direct `git push` to `production`.
---

## Ali’s ordered work list — status

Paste of intent (paraphrased). **Do in this order.**

### 1. Promote #36 + production smoke — PROMOTE DONE, SMOKE NOT DONE

**Done**

- Ali approved FF `production` ← `main` for open-slots only.
- Executed: `production` fast-forwarded `8f37ba1` → `f74aaf2` and pushed.
- Prod + staging both serve `assets/index-BBJe_emp.js` with Open slots using `teamSlots.length` (not `TEAM_NAMES.length`).

**Not done — finish first**

Smoke production (Ali asked):

1. Join a Mart room — slot count matches cards (e.g. `Q7X2TU` is `teamCount` 6, expect **N of 6** not 10).  
   https://practicelabs.up.railway.app/s/Q7X2TU
2. Co-facilitator board loads with `?token=` (no Creator login).
3. One Demand happy path — https://practicelabs.up.railway.app/s/6SZHRJ
4. One Mart happy path — claim/play briefly on Mart room.

Then record outcome in `docs/rehearsal-results.md` (or the status doc).

Note: `Q7X2TU` clock already expired (`startedAt` 2026-09-30); join may show red **00:00** — that’s the pre-start timer bug Ali wants fixed in §4, not a failed open-slots deploy. Open slots meta is the #36 check.

---

### 2. Update the status doc — DONE (PR #37)

Files:

- Agent store: `/cursor/stores/bc-d7eb7618-447c-4026-b766-74399be44cfc/docs/practice-labs-status-for-review-2026-09-30.md`
- Repo (PR #37): `0406-0305-scenario-simulator-snapshot/docs/practice-labs-status-for-review-2026-09-30.md` + `docs/media/status-2026-09-30-sem/`
- Branch: `cursor/sem-status-doc-5dc1` @ `72be200`

**Edits Ali wants**

1. Reframe around getting the tool into **good overall shape**, not “before the next live workshop”.
2. **§2.4 Lacehouse:** add caveat — import passed cleanly, but JSON was written from the Mart v2 template, so it proves import accepts well-formed content; it does **not** yet prove a hand-authored exercise gets in without engineering help.
3. **§3:** raise attention/nudge from Medium → **High**.
4. **§7:** replace open questions with Ali’s answers:
   - Keep staging-first. Add branch protection on `production` (block force pushes + deletion, require a PR, **no** approval requirement). **Tell Ali exactly what to click in GitHub.**
   - Accept Mart’s shape constraints until an exercise actually hits one.
   - Join polish is **not** a pre-workshop must-have.
   - Roles, audit log, multi-org don’t block while this is a one-operator tool.

Also update tip table: staging + production both at `f74aaf2` after promote; open-slots no longer “staging only”.

Push updates on `cursor/sem-status-doc-5dc1` and refresh PR #37 (or new branch if cleaner).

---

### 3. Test attention/nudge + “Ask Moderator” on staging — DONE (report; Mart clear bug)

**Do on staging.** Run a session, trigger both, confirm board shows them and signals reach the team. **Report what works / doesn’t before fixing anything.**

#### What the code actually has (no separate “nudge” API)

| Direction | Mechanism |
| --- | --- |
| Player → facilitator | Button label **“Ask Moderator to Join”** → `POST …/sessions/:id/flag` `{ flagged: true }` → `flaggedForDebrief` |
| Board | Attention column pulses red; phone ring on new flag (`playPhoneRing`) |
| Facilitator clear | Click attention control → `{ flagged: false }` |
| Facilitator → player “nudge” | **No outbound nudge endpoint found.** Player blinks locally after asking (`setBlink` 15s) and while `session.flaggedForDebrief` stays true. Clearing flag on board is the facilitator action. |

Key files:

- Demand player: `artifacts/scenario-simulator/src/simulation/SimulationApp.tsx` (`askModerator`, `attentionBlinking`)
- Mart player: `artifacts/scenario-simulator/src/pages/MartApp.tsx` (`askModerator` → `${apiBase}/sessions/${id}/flag` with `apiBase=/api/mart`)
- Demand board: `…/pages/facilitate.tsx` (`clearAttention`, `playPhoneRing`)
- Mart board: `…/pages/mart-facilitate.tsx` (Attention column + clear)
- API: `artifacts/api-server/src/routes/sessions.ts` + `mart.ts` `POST …/flag`

Suggested staging rooms:

- Mart: https://app-staging-78f4.up.railway.app/s/AXQKUC (+ `/facilitate`, `/try`)
- Demand: https://app-staging-78f4.up.railway.app/s/H72DJ7
- Lacehouse (imported): https://app-staging-78f4.up.railway.app/s/HD6Y2S/try

Creator login needed for facilitator board unless you have a co-facilitator `?token=` from session detail. Agent env often lacks `CREATOR_*` — may need Ali’s credentials or token from an already-open Creator session.

**Watch for:** Mart flag path is `/api/mart/sessions/:id/flag` (via `apiBase`). Confirm live path works end-to-end; if board never sees the flag, that’s a finding for the report.

---

### 4. Join screen fixes — PLAN DELIVERED (PR #39); wait for Ali before implement

Ali asked for a **file-by-file plan first** (no design examples needed). One item is report-only.

| Change | Intent | Likely files (for the plan) |
| --- | --- | --- |
| Team callout copy | “Discuss each choice… pick a door…” is Mart-specific on a shared join screen. Move into exercise `chrome` (Mart default fallback); Demand/imports can set own line or none. | `mart-join.tsx`, `join.tsx`, `decisionGame` / chrome schema + `content/decision-game*.json`, Demand scenario if needed |
| Timer red 00:00 before start | Show **full duration or nothing** until start. Today: `Header` in `simulation/components.tsx` shows `"Not started"` when `!startedAt`, and red `"00:00"` when started + expired (`timer.ts` `isExpired`). Join often hits expired clocks on old rehearsal rooms. | `components.tsx` (`timerLabel` / `timerClass`), maybe join pages’ `configPath` / clock wiring |
| Duplicate session/scenario | Session name + scenario in **header and** MetaGrid info card — remove repetition. | `mart-join.tsx`, `join.tsx` (MetaGrid items vs `Header` `sessionLabel` / `titleOverride`) |
| Copy | “This table already has a slot” → **“This team already has a slot”** | `mart-join.tsx`, `join.tsx` (error string ×2 each) |
| Device switch (report only) | If a team switches devices (not just refresh), how do they reclaim? Is facilitator **Release** the only route, and does it lose progress? | See findings below — put in the plan doc, **no code yet** |

#### Device-switch findings (already traced — include in plan report)

- Resume identity is **browser `localStorage`** (`teamStorage.ts`: `MART_STORAGE_KEY` / Demand key) storing `{ sessionId, teamName }`.
- Same browser refresh: join matches stored id → resume into play. Copy on join already says refresh returns to same team.
- **New device / cleared storage:** slot still claimed server-side; UI shows “Slot taken”. Claiming again fails (“already in the session” / “This table already has a slot…”).
- Facilitator **Release** = `DELETE` session row (`/api/mart/sessions/:id` or Demand `/api/sessions/:id`) → **slot frees, progress gone**. Then they claim fresh.
- There is **no** code-entry / transfer / magic-link reclaim path. Facilitator release is the only recovery, and it **does** lose progress.

Deliverable for §4: a short plan markdown (store `docs/` or repo `docs/`) Ali can approve before implementation.

---

### 5. Rename `{branches}` → engine-neutral (e.g. `{stops}`) — DONE on PR #40 (staging only)

After §3/§4 plan. Same reasoning as `stopOne` / `stopTwo` / `stopMany`.

- Add new token name with **fallback** so existing content keeps working.
- Search tag templates / scoring / chrome for `{branches}` and any `branches` interpolation stubs.
- Lacehouse notes already called out that tag templates still use `{branches}` as the stub name.

Do not promote to production without Ali.

---

### 6. Production test-data / archive-hide clients — PROPOSAL WRITTEN (PR #40), HOLD

Ali: rehearse on staging unless asked otherwise. **Propose (don’t build)** a simple way to archive or hide clients so prod rehearsals don’t leave permanent undeletable clutter (delete blocked when sessions exist).

Hold until Ali has seen the proposal.

---

## Useful links

| Purpose | URL |
| --- | --- |
| Staging Mart rehearsal | https://app-staging-78f4.up.railway.app/s/AXQKUC |
| Staging Demand | https://app-staging-78f4.up.railway.app/s/H72DJ7 |
| Staging Lacehouse try | https://app-staging-78f4.up.railway.app/s/HD6Y2S/try |
| Prod Mart | https://practicelabs.up.railway.app/s/Q7X2TU |
| Prod Demand | https://practicelabs.up.railway.app/s/6SZHRJ |
| Creator staging | https://app-staging-78f4.up.railway.app/login |
| Creator prod | https://practicelabs.up.railway.app/login |
| SEM status doc (store) | `docs/practice-labs-status-for-review-2026-09-30.md` in agent store |
| SEM status PR | https://github.com/aliatideate/thepracticelabs/pull/37 |
| Deploy rules | `docs/deploy-staging-first.md` |
| Prior rehearsal log | `docs/rehearsal-results.md` |
| Lacehouse import notes (store internal) | `internal/lacehouse-import-test.md` |
| Open-slots fix notes (store internal) | `internal/mart-open-slots-fix.md` |

---

## Content locked (do not reopen)

Unilever Session 1 content decisions (Rohini Q3 events-only, SKU snapshot, etc.). Do not restore removed demo screens. Join **visual redesign** still waits on Ali examples; the §4 items above are **copy/structure fixes**, not that redesign.

---

## Waiting on Ali

- Merge/review drafts #37–#41 as desired (staging only until promote PR).
- Branch protection on `production` (agent cannot apply — see chat for payload / click path).
- Approve join-plan implement (#39); green-light Mart attention clear fix; feedback on archive proposal.
- Any production promote: PR `main` → `production` + explicit “yes” in chat. Never push `production`.

Branch prefix required: `cursor/<descriptive-name>-5dc1`.
