# Shell vs engine coupling audit

Written 2026-09-30 as Step 2 of the rest-of-build plan. **Report only — share before large refactors.** Priority fixes from this audit are applied in small follow-up PRs; do not turn this into a plugin framework.

**Scope:** `0406-0305-scenario-simulator-snapshot/`  
**Engines today:** investigation (Demand / The Demand Spike) · branching (Mart / A Week in the Field)  
**Shell (intended):** clients, sessions, links, joining, teams, customisation variables, facilitator notes, archives, facilitator board frame (team list, status, nudges, timer)  
**Engine (intended):** content schema, player UX, detailed per-team view on facilitator board

---

## Verdict

The Creator shell (clients → customise → create → `/s/:code` room) is mostly format-agnostic. Runtime and facilitator surfaces are still two parallel Demand/Mart stacks glued together by hard-coded format switches, legacy codes (`DEFAULT` / `MART` / `*-TRY`), and shared modules that know exercise-specific variable keys. Dual runtime tables (`sessions` vs `decision_sessions`) are a clean engine boundary; almost everything that *uses* them is still product-named and duplicated.

---

## Already cleanly separated

| Area | Where | Why it’s clean |
| ---- | ----- | -------------- |
| Content schemas | `artifacts/api-server/src/lib/content.ts`, `decision-game.ts` | Separate Zod/loaders for investigation vs branching JSON |
| Player experiences | `simulation/SimulationApp.tsx` + `screens.tsx` vs `pages/MartApp.tsx` | Distinct UIs; not mixed in one player |
| Branching scoring | `lib/decision-engine.ts` | Engine-only |
| Runtime team tables | `lib/db/.../sessions.ts` vs `decision-sessions.ts` | Different columns/state machines per engine |
| Investigation play API | `routes/sessions.ts` (team CRUD/patch/submit) | Owns investigation progress |
| Branching play API | `routes/mart.ts` (`/mart/sessions`, choices, reveal) | Owns branching progress |
| Facilitator notes panel (session Markdown) | `FacilitatorNotesPanel.tsx` + `GET .../facilitator-notes` | Format-agnostic shell chrome |
| Download menu chrome | `facilitatorDownload.tsx` | Pure UI; engines pass their own `onDownload` |
| Token resolve core | `content-tokens.ts` walk/extract/resolve | Generic `{{token}}` machinery |
| Workshop session row | `workshop_sessions` + create resolve freeze | Shell stores opaque `resolvedContent` + notes |
| Room summary API | `GET /workshop-sessions/by-code/:code` | Returns `format` for dispatch without loading content |
| Print gate | `App.tsx` `SessionPrintInner` | Investigation-only is correct engine capability |
| Seed content | `content/scenario*.json`, `decision-game*.json` | Engine content, not shell |

---

## Leaks (by area)

Severity legend: **H** = blocks a third engine or breaks renamed rooms · **M** = duplicated shell or hard-coded product · **L** = naming / legacy / cosmetic

---

### 1. Facilitator boards

#### L1 — Parallel full boards instead of shell frame + engine slot
- **Files:** `artifacts/scenario-simulator/src/pages/facilitate.tsx` (~entire file, esp. 415–520) · `mart-facilitate.tsx` (~238–570)
- **Leak:** Timer adjust/restart, Save Session, Reset, End, archives list/modal, try-out table, attention/nudge handling, `DownloadMenu` wiring are copy-pasted. Only team-detail cards differ (`TeamProgressCard` vs `MartResultsTable`).
- **Belongs in:** Frame → **shell**; team detail → **engine**
- **Move:** Extract `FacilitatorBoardShell` (timer, actions, archives, notes panel, team list chrome). Register `investigation` / `branching` plugins that render detail + export/archive serializers.

#### L2 — ActivityTabs hard-codes Demand / Mart legacy hub
- **File:** `pages/activityTabs.tsx` ~5–62
- **Leak:** Options are `"demand" | "mart"` with product labels; navigates to `/facilitate?tab=…`. Rendered on both boards even for `/s/:code/facilitate` Creator sessions.
- **Belongs in:** Legacy Unilever hub only (or remove); not shell for Creator rooms
- **Move:** Hide when `useSessionRoom()` is set; or replace with session title from room summary. Keep only on `/facilitate` legacy route.

#### L3 — Hard-coded board titles and try links
- **Files:** `facilitate.tsx` ~418–425, 372–379, 512–516, 574 · `mart-facilitate.tsx` ~388–393
- **Leak:** H1 `"Demand Spike"` / `"Mart"`; try link always `/demand/try`; print always `/print` (not `/s/:code/print`).
- **Belongs in:** Display title → shell (from room/content); try/print paths → engine capability map
- **Move:** Use `room.title` / content title; engine declares `tryPath`, `printPath` (null for branching).

#### L4 — Mart client-side snapshot export beside server export
- **File:** `mart-facilitate.tsx` `downloadMartSnapshot` ~84–144, used ~727–807
- **Leak:** Branching CSV/JSON rebuilt in the board for archives/try views, while live download hits `/api/mart/export`.
- **Belongs in:** **engine** (one serializer)
- **Move:** Single branching export helper used by API + board; or archive download always via API.

#### L5 — Shared Header still Session-1/2 aware
- **File:** `simulation/components.tsx` `Header` ~111–225
- **Leak:** Default `SESSION_LABEL` (Demand); `sessionLabel.startsWith("Session 2")` sets document title; flow nav uses investigation `FLOW_STEPS` / `Screen`.
- **Belongs in:** Timer/brand → **shell**; flow steps → **engine**
- **Move:** Shell header props: `title`, `configPath`, timer only. Engine supplies optional step nav component.

#### L6 — DesktopGate path heuristics
- **File:** `pages/DesktopGate.tsx` ~6–50
- **Leak:** `isMart(path)` on `/mart`, `/try`, `?tab=mart`; copy and styling fork Demand vs Mart; `/s/:code` falls through to Demand defaults.
- **Belongs in:** **shell** with room format, or **engine** copy strings
- **Move:** For `/s/:code/*`, read format from room (or skip gate content fork). Register engine mobile-block messages.

---

### 2. Session creation & content resolve

#### L7 — Print path branched in create API
- **File:** `artifacts/api-server/src/routes/create.ts` ~847–854, ~949–954
- **Leak:** `paths.print` set only when `format === "investigation"`.
- **Belongs in:** **engine capability** (shell should ask registry)
- **Move:** `engineCapabilities(format).printPath(code)`; create.ts stays format-blind except calling registry.

#### L8 — Duration default by format in wizard
- **File:** `pages/create-new-session.tsx` ~179
- **Leak:** `ex.format === "branching" ? 15 : 30` on pick.
- **Belongs in:** **engine** (or exercise metadata)
- **Move:** Store `defaultDurationMinutes` on exercise/version; wizard reads it.

#### L9 — Wizard hard-codes Demand/Mart variable keys
- **File:** `create-new-session.tsx` ~60–65, 154–196, 270–325, 530–587, 296–297
- **Leak:** `company.*`, `chain.name` / `chain.namePlural`, logo gated on `company.logo`, “Demand only” comment, LONG_NAME_SAMPLES keyed to those paths.
- **Belongs in:** **engine** variable UI hints / derived fields; shell should render from `variables[]` schema only
- **Move:** Variable defs gain `deriveFrom`, `previewGroup`, `hideInForm`. Logo = any `type: "image"`. Plural derive stays server-side via def metadata, not key literals in the page.

#### L10 — `formatFromCategory` maps pedagogy → engine
- **File:** `pages/create-shell.tsx` ~138–145
- **Leak:** `problem-framing` → `"Investigation"`, `decision-making` → `"Branching"` (and ideation/prototyping labels with no engines).
- **Belongs in:** Display helper OK for briefs, but couples category to format names
- **Move:** Briefs either store format, or library shows category only until an exercise exists.

#### L11 — Shared token prep knows Mart/Demand keys
- **File:** `api-server/src/lib/content-tokens.ts` ~87–146
- **Leak:** Auto `chain.namePlural` from `chain.name`; forces `company.logo` from upload; rejects leading “The ” on `company.name` / `company.shortName`.
- **Belongs in:** **engine** (or per-variable rules on defs)
- **Move:** Add `derive` / `validate` hooks on `ExerciseVariableDef`; keep `prepareVariableValues` generic.

#### L12 — `workshop-session.ts` dual content loaders + legacy aliases
- **File:** `api-server/src/lib/workshop-session.ts` ~102–140
- **Leak:** `scenarioForCode` / `decisionGameForCode` / `decisionGameFacilitatorForCode` branch on format; defaults to `WORKSHOP_CODE` / `MART_WORKSHOP_CODE` file fallbacks; `legacyAliasCodes()` exposes demand/mart product map.
- **Belongs in:** Content resolve → **engine registry**; aliases → legacy adapter
- **Move:** `getEngine(format).loadPublicContent(code)` / `loadFacilitatorContent(code)`. File fallback only in Unilever bootstrap adapter.

#### L13 — Session clock special-cases MART codes
- **File:** `api-server/src/lib/session-clock.ts` ~7–18
- **Leak:** `MART` / `MART-TRY` → `MART_DURATION_MINUTES`; else investigation `loadScenario().timing.defaultMinutes` or linked session duration.
- **Belongs in:** **shell** should use `workshop_sessions.durationMinutes` / `session_config` only
- **Move:** Drop code-name branches; always prefer linked workshop_session or config row. Seed Mart config at 15.

#### L14 — Investigation PATCH still uses global `loadScenario()`
- **File:** `api-server/src/routes/sessions.ts` ~368–377
- **Leak:** Ask-limit / question validation against file scenario, not `scenarioForCode(workshopCode)`.
- **Belongs in:** **engine** (investigation), but must use session-resolved content
- **Move:** Resolve workshop code → `scenarioForCode` before validating answers (bugfix + coupling fix).

---

### 3. Archives

#### L15 — Shared archive table, investigation-shaped API
- **Files:** `routes/archives.ts` (all; serialize ~21–42, POST ~98–142) · `lib/db/.../session-archives.ts` ~10–30
- **Leak:** `/api/archives` always reads `sessionsTable`, serializes investigation fields (`selectedStakeholder`, `problemStatement`, …), sets `scenarioId` from investigation scenario. Column/type name `scenarioId` / `ArchivePayload.scenarioId` is Demand-centric. Mart uses same table via `/api/mart/archives` with different payload.
- **Belongs in:** Table + list/summary → **shell**; payload serialize → **engine**
- **Move:** Rename to `contentId` (or keep opaque). Shell `POST /archives` dispatches `engine.archivePayload(workshopId)`. One route family with format from workshop_session.

#### L16 — Parallel Mart archive routes
- **File:** `routes/mart.ts` ~544–617
- **Leak:** Duplicate archive CRUD against same `session_archives` table.
- **Belongs in:** **shell** routes + **engine** payload builder
- **Move:** Merge into `/api/archives` with engine plugin; delete `/mart/archives*`.

---

### 4. CSV / export

#### L17 — Investigation owns generic `/api/export`
- **File:** `routes/export.ts` (entire; ~15–128)
- **Leak:** Path `/export` implies shell; implementation is Demand columns (stakeholder, evidence, Q1–3, problem_statement, step timings).
- **Belongs in:** **engine**
- **Move:** `/api/export` → shell dispatcher by format, or rename `/api/investigation/export` and keep `/api/mart/export` until unified `/api/sessions-by-code/:code/export`.

#### L18 — Branching export living under product router
- **File:** `routes/mart.ts` ~356–416
- **Leak:** Correctly engine-specific, wrong *namespace* (`mart` product vs `branching` engine).
- **Belongs in:** **engine**
- **Move:** `engines/branching/export.ts`; route `/api/branching/export` or format-dispatched `/api/export`.

---

### 5. App route dispatch

#### L19 — Hard-coded format switches in App
- **File:** `artifacts/scenario-simulator/src/App.tsx` ~52–64, 114–190, 221–243
- **Leak:** `FacilitateHub` tab demand/mart; `SessionJoinInner` / `Play` / `Facilitate` / `Try` / `Print` switch on `room.format === "branching"`. Legacy `/demand/*`, `/mart/*` routes.
- **Belongs in:** Thin **shell registry** (OK to branch once) — but components/imports are concrete engines
- **Move:** `engines/registry.ts` maps format → `{ Join, Play, Facilitate, Print? }`. App only looks up registry. Legacy aliases redirect to `/s/DEFAULT` etc.

#### L20 — Global `ScenarioProvider` wraps entire app
- **File:** `App.tsx` ~250–258
- **Leak:** Investigation provider always mounted; branching adds nested `DecisionGameProvider`. DesktopGate/Header call `useScenario()` even on Mart paths (file fallback titles).
- **Belongs in:** Providers scoped to engine routes
- **Move:** Mount content providers inside engine route wrappers only; shell header doesn’t depend on scenario.

---

### 6. Runtime tables & shared APIs

#### L21 — Dual team tables (correct split, product-coupled access)
- **Files:** `sessions.ts` schema · `decision-sessions.ts` schema · routes as above
- **Leak:** Separation is right for engines; shell APIs assume investigation (`/api/sessions`, moderator notes FK → `sessions` only). Branching has flags on `decision_sessions` but no moderator notes / access_requests.
- **Belongs in:** Per-engine runtime tables OK; nudges/notes FK → **shell** abstraction over “team run id”
- **Move:** Either polymorphic `team_run_id` for notes, or engine-local note tables with shared SSE contract. Document that `/api/sessions*` is investigation-only.

#### L22 — Moderator / access APIs investigation-only
- **Files:** `routes/moderator.ts` (joins `sessionsTable`) · `lib/db/.../moderator.ts` FK → `sessions`
- **Leak:** Shell-sounding “ask moderator” only works for Demand team rows.
- **Belongs in:** Feature is shell; storage must not FK only investigation
- **Move:** Generalise session id to engine team-run, or accept as investigation-only capability in registry.

#### L23 — Duplicate session-config under `/api/mart`
- **Files:** `routes/session-config.ts` · `mart.ts` ~127–173
- **Leak:** Clock is shell; Mart reimplements start/patch with default code `MART`.
- **Belongs in:** **shell** only
- **Move:** Branching clients call `/api/session-config?workshopCode=`; delete mart session-config routes.

#### L24 — Shared constants bag mixes shell + both engines
- **Files:** `scenario-simulator/src/lib/constants.ts` · `api-server/src/lib/workshop.ts`
- **Leak:** `TEAM_NAMES` / emojis (shell) beside `FLOW_STEPS`, `ALL_SCREENS`, `DEMAND_TRY_*`, `MART_*`, `evidenceFilename` W35 SKUs (investigation), `MART_DURATION_MINUTES`.
- **Belongs in:** Split packages
- **Move:** `shell/teams.ts`, `engines/investigation/constants.ts`, `engines/branching/constants.ts`, `legacy/unilever-codes.ts`.

#### L25 — Preview sweeper hard-codes Unilever codes
- **File:** `api-server/src/lib/preview-cleanup.ts` ~51–52
- **Leak:** Never delete `DEFAULT`/`MART`/`MART-TRY`/`DEMAND-TRY`.
- **Belongs in:** Legacy protection list (acceptable) but not in generic sweeper forever
- **Move:** `PROTECTED_WORKSHOP_CODES` in legacy module.

#### L26 — teamStorage product keys
- **File:** `lib/teamStorage.ts` + constants storage keys
- **Leak:** Separate demand-try / mart / mart-try localStorage accessors.
- **Belongs in:** **shell** keyed by workshop code
- **Move:** `tpl-team:{workshopCode}` single helper.

---

### 7. Other shared format branches

| Location | Lines (approx) | Leak | Shell / engine | Move |
| -------- | -------------- | ---- | -------------- | ---- |
| `create.ts` response `format` field | ~840, ~930 | Passes format to client (needed for UI) | Shell OK | Keep; clients use registry not if-ladders |
| `sessionRoom.tsx` format union | ~9 | `"investigation" \| "branching"` closed union | Shell | Extend via registry type / string + plugin |
| `bootstrap.ts` format check | ~272–273 | DB CHECK only two formats | Shell schema | Same — extend enum with engine registration |
| `exercises.ts` `EXERCISE_FORMATS` | ~14–16 | Closed enum | Shell | Same |
| `app.ts` boot | ~11–12 | Loads both content files at boot | Acceptable | Engine `register()` on boot |
| OpenAPI `sessions` tag | `openapi.yaml` | Spec documents investigation sessions as the only “sessions” | Shell naming | Split specs per engine or clarify |

---

## Proposed target shape (concrete)

```
shell/
  clients, workshop_sessions, variables UI (schema-driven),
  session-config/timer, archives summary, facilitator board frame,
  /s/:code router + engine registry lookup

engines/investigation/
  content schema, player, TeamProgressCard, export/archive payload,
  runtime sessions table + /api/investigation/* (today’s /api/sessions)

engines/branching/
  content schema, Mart player, MartResultsTable, export/archive payload,
  runtime decision_sessions + /api/branching/* (today’s /api/mart)

legacy/
  DEFAULT/MART/DEMAND-TRY/MART-TRY codes, /demand /mart routes, ActivityTabs hub
```

Registry surface (minimal):

```ts
type EnginePlugin = {
  format: "investigation" | "branching" | string;
  defaultDurationMinutes: number;
  Join: Component; Play: Component; FacilitateDetail: Component;
  printPath?: (code: string) => string;
  exportAndArchive: { serializeTeam; csvColumns; contentId };
  runtime: { listTeams; resetAll; /* … */ };
};
```

---

## Priority order if extracting

1. **H:** Fix `sessions.ts` to use `scenarioForCode` (L14).  
2. **H:** Engine registry in `App.tsx` + hide `ActivityTabs` on `/s/:code` (L19, L2).  
3. **H:** Unify archives/export behind format dispatch (L15–L18).  
4. **M:** Facilitator board shell extraction (L1, L3).  
5. **M:** Strip key literals from wizard + `content-tokens` (L9, L11).  
6. **M:** Collapse mart session-config into shell (L23).  
7. **L:** Rename mart→branching routes/constants; split `constants.ts` (L24, L18).

---

## Source map (quick)

| Concern | Investigation today | Branching today | Shared leak host |
| ------- | ------------------- | --------------- | ---------------- |
| Player | `SimulationApp` | `MartApp` | `App.tsx` dispatch |
| Join | `join.tsx` | `mart-join.tsx` | `App.tsx` |
| Facilitate | `facilitate.tsx` | `mart-facilitate.tsx` | ActivityTabs, Header, NotesPanel |
| Team runtime | `sessions` + `/api/sessions` | `decision_sessions` + `/api/mart/*` | workshops, session_config |
| Archives | `/api/archives` | `/api/mart/archives` | `session_archives` table |
| Export | `/api/export` | `/api/mart/export` | — |
| Content | `scenario.json` / `content.ts` | `decision-game.json` | `workshop-session.ts` |
