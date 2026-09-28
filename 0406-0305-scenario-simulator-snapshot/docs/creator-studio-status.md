# Creator Studio — status for review (2026-09-29)

Detailed inventory of what exists today, what landed where, and what is still open. Written so you (or anyone) can suggest changes without re-reading every PR.

**Companion briefs:** `creator-side-v1-brief.md`, `creator-side-clarifications.md`, phase plans in this same `docs/` folder.

---

## 1. What Creator Studio is (product intent)

Internal tool for **one Ideate user** (you) to:

1. Manage **clients**
2. Pick a **published exercise** from the **Library**
3. **Customise** light fields (company / chain / branches / logo — Phase 4)
4. Create an **isolated workshop session** with its own join / facilitate / try / print links
5. Capture **briefs** for exercises that are still “in design” (intake only; no generation)

It is **not** an exercise generator. Exercises are still authored outside the tool and imported as JSON. Player and facilitator pedagogy for Demand / Mart stay as in `practice-labs-llm-brief.md`.

**UI home:** `/create` (after `/login`).  
**Working names in UI:** Clients · Library · Boards · Sessions · Briefs. Header shows **Creator Studio** + signed-in profile chip.

---

## 2. Environments and delivery

| Environment | URL | What’s on it |
| --- | --- | --- |
| **Production** | https://practicelabs.up.railway.app | Phases **1–3 + 5** merged to `main` and deployed. Creator UI works. Exercises still **v1** (no rename tokens in prod DB yet). |
| **Staging** | https://app-staging-78f4.up.railway.app | Phase **4 branch deployed + seeded**. Renames work. Unilever `DEFAULT` / `MART` still frozen Gulf Beverages. |
| **Repo** | `aliatideate/thepracticelabs` | Code root: `0406-0305-scenario-simulator-snapshot/` |

### PRs

| PR | Phase | State |
| --- | --- | --- |
| [#2](https://github.com/aliatideate/thepracticelabs/pull/2) | 1 Data model + seed | Merged |
| [#3](https://github.com/aliatideate/thepracticelabs/pull/3) | 2 Cookie auth | Merged |
| [#4](https://github.com/aliatideate/thepracticelabs/pull/4) | 3 Session instances | Merged |
| [#5](https://github.com/aliatideate/thepracticelabs/pull/5) | 5 Creator screens | Merged → prod |
| [#6](https://github.com/aliatideate/thepracticelabs/pull/6) | 4 Tokenisation (v2) | **Open** — staging smoked; awaiting your sign-off before prod |

Deploy pattern today: `railway up ./0406-0305-scenario-simulator-snapshot --path-as-root` (GitHub → Railway auto-deploy still optional / not required).

---

## 3. Built by phase

### Phase 1 — Data model + seed ✅ (prod)

Additive Postgres tables (all carry `org_id` / `created_by` where relevant):

- `organisations`, `users`
- `clients`
- `exercises`, `exercise_versions` (immutable version rows; `variables`, `facilitator_notes`, `default_assets`)
- `client_copies` (one per client + exercise; `variable_values`, `logo_asset_id`)
- `workshop_sessions` (creator “run”; frozen `resolved_content` + `resolved_facilitator_notes`)
- `briefs`, `assets` (logo bytes in Postgres; PNG/JPEG/WebP ≤ 500 KB)
- `auth_sessions` (added with Phase 2)

Seed (`pnpm --filter @workspace/scripts run seed:creator`):

- Org **Ideate**
- User from `CREATOR_EMAIL` (+ optional bcrypt from `CREATOR_PASSWORD`)
- Client **Unilever UAE**
- Exercises **The Demand Spike** (`investigation`) and **A Week in the Field** (`branching`) as **v1** from `content/scenario.json` / `content/decision-game.json`
- Two `client_copies` pointing at those v1 rows

Live Demand/Mart rooms were **not** changed in this phase.

### Phase 2 — Auth ✅ (prod)

- `/login` — email + password → httpOnly session cookie
- `/api/auth/login|logout|me|check`
- Creator + facilitator APIs go through cookie / session-token auth
- Hardcoded facilitator password `3108` and `x-facilitator-secret` **removed** from the client bundle
- Per-session facilitator token (hashed); can be regenerated from the session page
- Logged-in org user can facilitate any session; token link works logged-out for that session only

### Phase 3 — Session instances ✅ (prod)

- Runtime can load **per-session** resolved content via workshop code
- Routes: `/s/:code` join · `/s/:code/play/...` · `/s/:code/facilitate` · `/s/:code/try` · `/s/:code/print` (investigation only)
- Legacy `/demand`, `/mart`, `/facilitate`, `/print` still work, backed by seeded Unilever sessions (`DEFAULT`, `MART`, try codes)
- Phase 3 seed attaches Unilever archives / live rooms to `workshop_sessions`
- Team count, clock, archives, try-outs scoped by runtime workshop

### Phase 5 — Creator screens ✅ (prod; polish pass also on prod)

Shipped **before** Phase 4 in practice (brief order was 4 then 5; rename fields were stubbed until tokenisation).

| Route | What you see |
| --- | --- |
| `/login` | Sign in → defaults to `/create` |
| `/create` | **Clients** list — name, modified ago, nested session chips, New client |
| `/create/clients/:id` | Client detail — notes; Upcoming & live / Past; **New session** |
| `/create/clients/:id/new` | Wizard: category → published exercise → customise → Preview / Create |
| `/create/sessions/:id` | Session page — codes & links (join / facilitate / try / print), regenerate facilitator token, variable values, resolved notes (when present), archives |
| `/create/library` | Exercises + briefs by category; expand exercise for versions / variables / notes; **New activity** → brief |
| `/create/briefs/:id` | Brief editor (create / edit); “In design” status |
| `/create/boards` | All sessions grouped Live / Ready / Ended → open facilitator board |

**Chrome / polish already shipped:**

- Header: brand-only Creator Studio (two-line), profile chip when signed in
- Nav tabs: Clients · Library · Boards
- Status tags capitalised (Ready / Live / Ended / Published / In design)
- Empty variables list hidden in Library detail
- Boards copy is session-centric (not client-specific marketing)

### Phase 4 — Tokenisation 🟡 (staging only; PR #6 open)

**On staging (not prod yet):**

- `content/scenario.v2.json` + `content/decision-game.v2.json`
- Seed `seed:creator:phase4` inserts **exercise_versions v2** with `variables` + Markdown facilitator notes (v1 rows untouched)
- Session create merges defaults, validates, resolves tokens into `resolved_content` **and** `resolved_facilitator_notes`
- Customise UI shows declared fields, UAE + beverage/FMCG note, “The ” ban on company names, derived chain plural (`name` + `s`), logo upload with dark/light + wide/square preview, “Preview long names”
- Evidence download labels: `{shortSlug}-W35-…` (short name → slug; session code fallback)
- Exports (Demand CSV/JSON, Mart CSV/JSON) use **session-resolved** content
- Mart play / facilitate pass `workshopCode` so renamed rooms don’t fall back to global MART file content

**Check (a) — default v2 vs v1:**

| | Text |
| --- | --- |
| Demand | Byte-identical to v1 after ignoring new optional `company.shortName` |
| Mart | Identical except intro (intentional) |

| Intro | Text |
| --- | --- |
| v1 | You're a Gulf Beverages field rep. |
| v2 default | You're a field rep for Gulf Beverages. |

**Staging smoke (Qanat Foods client):**

- Mart `FPARE7` — Qanat Refreshments / Souk Mart / Souk Marts
- Demand `5PH6RJ` — plant Abu Dhabi; notes resolved (no leftover `{{`)
- `The …` company name → 400
- `DEFAULT` / `MART` still Gulf Beverages + old Mart intro

**Locked (not tokenised):** UAE / KSA / Qatar markets, long weekend, Sharjah & Ajman dateline, playbook rules body, scoring / door types, “across the Gulf” (geography).

---

## 4. Customise variables (v2 schema)

### The Demand Spike

| Key | Default | Type | maxLength |
| --- | --- | --- | --- |
| `company.name` | Gulf Beverages Co. | text | 48 |
| `company.shortName` | Gulf Beverages | text | 32 |
| `company.plantCity` | Dubai | text | 28 |
| `company.logo` | gulf-logo.png | image | — |

### A Week in the Field

| Key | Default | Type | maxLength |
| --- | --- | --- | --- |
| `company.name` | Gulf Beverages | text | 40 |
| `chain.name` | Saha Mart | text | 32 |
| `branches.alNahda` … `universityCity` | (six UAE areas) | text | 28–32 |

- **Plural:** `chain.namePlural` is **derived** as `{chain.name}s` (not a separate form field).
- **Validation:** `company.name` / `company.shortName` must not start with `The ` (playbook title is `The {{company.name}} Playbook`).
- **Product note on customise:** renames are **UAE-only** and **beverage/FMCG-only** for now (scene art implies drinks).

---

## 5. Data / runtime model (how a run is isolated)

```
organisation
  └─ users
  └─ clients
       └─ client_copies  (client × exercise → values + logo)
  └─ exercises
       └─ exercise_versions  (v1 immutable Gulf; v2 tokenised on staging)
  └─ workshop_sessions
       ├─ frozen resolved_content
       ├─ frozen resolved_facilitator_notes
       ├─ variable_values + exercise_version_id at create time
       └─ runtimeWorkshopId → workshops + session_config + teams/archives
```

**Rule:** archives and live play always read the session snapshot. Editing a later client copy or publishing v3 must not rewrite what an old room saw.

**Legacy Unilever:** `DEFAULT` / `MART` (+ try codes) stay on **v1** snapshots with Gulf Beverages. New sessions after v2 seed use **latest published version** (v2).

---

## 6. API surface (creator)

All under cookie auth (`/api/create/*` + `/api/auth/*`):

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `logout`, `GET /auth/me`, `GET /auth/check` |
| Clients | `GET/POST /create/clients`, `GET/PATCH /create/clients/:id` |
| Exercises / library | `GET /create/exercises`, `GET /create/exercises/:id` |
| Briefs | `GET/POST/PATCH /create/briefs…` |
| Assets | `POST /create/assets`, `GET /create/assets/:id` |
| Sessions | `GET/POST /create/sessions`, `POST …/preview`, `GET …/:id` |
| Prefill | `GET /create/clients/:clientId/copies/:exerciseId` (variables from **latest published** version) |
| Facilitator token | `POST /workshop-sessions/:id/facilitator-token` |

---

## 7. What’s left (ordered)

### A. Finish Phase 4 on production (next when you resume)

1. Your sign-off on v2 diff + long-name behaviour (staging already proves renames).
2. Merge PR #6 → deploy production app.
3. Run `seed:creator:phase4` on **production** Postgres (adds v2 only; does not rewrite Unilever v1 sessions).
4. Smoke on prod: rename under a non-Unilever client; confirm `DEFAULT`/`MART` unchanged.
5. Optional: delete/expire staging preview sessions.

**Do not seed v2 on prod before the Phase 4 app code is live** — old create path would freeze unresolved `{{tokens}}` into sessions.

### B. Phase 6 — New exercise (brief already partially done)

**Already built (ahead of brief numbering):**

- Brief intake UI + API + Library “In design” cards
- Seeded placeholder briefs (e.g. Quiet Exit, Stalled Rollout, Seven Days to Launch, Empty Aisle)

**Still missing vs brief §7 “New exercise”:**

- **Import exercise files** — upload content JSON + optional notes Markdown; pick format/category/title (or add version to existing exercise); zod-validate against engine schema; clear path errors; no row on failure
- Format picker with disabled “Coming soon” for ideation / prototyping engines
- Wizard step “New exercise” entry on every category (Library has New activity → brief; import path not wired)
- Brief → “first draft shared for review” is copy-only today; **no** draft exercise object, generation, or review workflow (correct per brief — just confirm that stays)

### C. Phase 7 — Facilitator notes panel

- Brief: collapsible Markdown panel on **each session’s facilitator board** from `resolved_facilitator_notes`
- Mart’s existing per-decision “Show facilitator notes” stays
- Today: notes resolve into DB and show on the **Creator session page**; they are **not** yet a panel on `/s/:code/facilitate` / legacy facilitate boards

### D. Gaps vs brief “Done means” (§9) — open product calls

| Done-means item | Status |
| --- | --- |
| Login → client → Demand → rename → logo → 20 min / 4 teams → preview → create | **Staging yes**; prod after Phase 4 merge/seed |
| Four windows join + play | Manual dress rehearsal still owed |
| Facilitator link in logged-out window | Mechanism exists; re-verify after prod Phase 4 |
| Board shows renamed content | Yes via resolved content; **notes panel** still Phase 7 |
| Unilever unchanged with Gulf names | Verified on staging; keep verifying after prod seed |
| Mart rename chain + branches | Staging yes |
| Brief write / edit / In design | Yes |
| Malformed import rejected with paths | **Not built** (Phase 6 import) |
| No secrets in client bundle | Yes (Phase 2) |

### E. Explicitly out of scope (still)

- AI content generation
- Editing questions / options / stakeholders / evidence / scoring in-product
- New engines (ideation, prototyping)
- Multi-user roles / permissions (data model ready; UI is single-user)
- Player/facilitator visual redesign (separate track; wait for your examples)
- Mobile creator or player (desktop gate unchanged)
- Cross-country / currency / weekend packs (locked until a later “region pack”)

### F. Hardening / ops (nice-to-have, not phase-gated)

- GitHub → Railway auto-deploy
- Preview session cleanup job (24h expiry exists on row; sweeper?)
- Stricter create-time validation: every `{{token}}` declared and every declared variable used
- Upgrade path when client_copy sits on v1 values and exercise moves to v3 (prefill already shows latest schema; value migration/flagging not fully productised)
- Six-window dress rehearsal on production after Phase 4
- Save `/print` PDF fallback for breakouts (workshop ops, not Creator Studio)

---

## 8. Suggested review questions for you

1. **Phase 4 prod:** happy to merge #6 + seed prod after another look at staging, or any variable / copy change first?
2. **Chain plural:** is `name + "s"` enough, or do you want an optional override field later?
3. **Logo on Mart:** v2 Mart has no logo variable (Demand does). Should Mart show a logo anywhere, or stay scene-only?
4. **Facilitator notes panel (Phase 7) vs import (Phase 6):** which next after Phase 4 lands?
5. **Boards tab:** is “all sessions across clients” the right mental model, or should it be filtered / client-scoped?
6. **Library “New activity”:** brief-only is correct for now — confirm import should be the next Library action.
7. **Rename policy copy** on customise (UAE + beverage/FMCG): wording OK, or sharper?
8. Anything in the Creator chrome (tabs, status tags, profile chip, two-line Creator Studio) to reverse or tighten?

---

## 9. Quick “where to click” map

```
/login
  → /create                    Clients
       → /create/clients/:id   Client sessions
            → …/new            New session wizard (+ rename on staging)
            → /create/sessions/:id   Links + archives
  → /create/library            Published exercises + In design briefs
       → /create/briefs/new    Brief intake
  → /create/boards             Facilitator boards by status
/s/:CODE                       Player join for that session
/s/:CODE/facilitate            Facilitator board for that session
/demand · /mart                Legacy Unilever rooms (still live)
```

---

## 10. Related artifacts

| Doc | Purpose |
| --- | --- |
| `docs/creator-side-v1-brief.md` | Original build brief |
| `docs/creator-side-clarifications.md` | Status/preview/code answers |
| `docs/creator-side-phase-*-plan.md` | Per-phase plans |
| `0406-…/docs/creator-side-phase-4-*.md` | Occurrence report, Ali decisions, plan (in repo) |
| `internal/phase4-tokenisation-diff-proof.md` | v1 vs default-v2 + long-name samples |
| `internal/phase4-staging-smoke.md` | Staging rename smoke notes |

---

*Last updated: 2026-09-29 — after Phase 4 staging deploy/seed/smoke; production still on Phases 1–3 + 5 without v2 content.*
