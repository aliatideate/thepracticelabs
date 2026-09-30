# Creator Studio — build status handoff (2026-09-30)

Written for the next agent (or human) picking up the build. Prefer this over the 2026-09-29 status doc for current state; that older file is historical context.

**Companion briefs (repo `docs/`):** `creator-side-v1-brief.md`, `creator-side-clarifications.md`, phase plans, `practice-labs-llm-brief.md`.

---

## 0. Snapshot (read this first)

| Item | Value |
| --- | --- |
| **Live app** | https://practicelabs.up.railway.app |
| **Creator home** | https://practicelabs.up.railway.app/create (after `/login`) |
| **Repo** | `aliatideate/thepracticelabs` |
| **Code root** | `0406-0305-scenario-simulator-snapshot/` |
| **Production tip** | `860234b` — *Center client-card delete with flex instead of absolute offset* |
| **Railway deploy** | SUCCESS `477a8352` (GitHub → Railway from `main`) |
| **Staging** | https://app-staging-78f4.up.railway.app |
| **Auth** | Email/password → httpOnly cookie; env `CREATOR_EMAIL` / `CREATOR_PASSWORD` on Railway |
| **Open PRs** | None (as of this write) |

**Phases on production:** 1 (data) · 2 (auth) · 3 (session instances) · 4 (tokenisation v2 seeded) · 5 (Creator screens) · 7 (facilitator notes panel).  
**Not built:** Phase 6 exercise **import** (briefs exist; JSON upload does not).

**Deploy today:** Pushing `main` auto-deploys production via GitHub → Railway. Root directory must be `0406-0305-scenario-simulator-snapshot`. Fallback: `railway up ./0406-0305-scenario-simulator-snapshot --path-as-root` with prod token.

---

## 1. Product intent (unchanged)

Internal tool for **one Ideate user** to:

1. Manage **clients**
2. Pick a **published exercise** from **Activities**
3. **Customise** light fields (company / chain / branches / logo)
4. Create an **isolated workshop session** (own join / facilitate / try / print links)
5. Capture **briefs** for exercises still “in design” (intake only; no generation)

Not an exercise generator. Player/facilitator pedagogy for Demand & Mart stays outside Creator redesign scope unless Ali supplies examples.

---

## 2. What’s live in Creator UI (with screenshots)

Screenshots for this handoff are in the Cursor agent store:  
`/cursor/stores/bc-d7eb7618-447c-4026-b766-74399be44cfc/media/creator-status-2026-09-30/`  
(Also described in prose under each section.)

### 2.1 Clients list — `/create`

- Two-column cards: name, notes, modified ago, nested session list or “No sessions yet”
- **New client** opens a **lightbox** (drifts down from top); Create → client detail
- Empty clients: **trash icon** bottom-right of card **on hover** → confirm dialog → `DELETE /api/create/clients/:id`
- Clients **with sessions**: no trash on card; status tags (Ended etc.) flush right


> **Screenshot:** Empty client card with hover trash  
> File (agent store): `media/creator-status-2026-09-30/hover_trash_telenor.webp`


*Hover trash on an empty client (Telenor).*


> **Screenshot:** New client lightbox  
> File (agent store): `media/creator-status-2026-09-30/prod_new_client_modal.webp`


*New client modal over the Clients grid.*


> **Screenshot:** Delete confirm  
> File (agent store): `media/creator-status-2026-09-30/client_card_delete_confirm.webp`


*Delete confirmation lightbox.*


> **Screenshot:** Unilever card with sessions, no delete  
> File (agent store): `media/creator-status-2026-09-30/prod_unilever_no_delete.webp`


*Unilever UAE has sessions → no delete control; Ended tags flush to the edge.*

### 2.2 Client detail — `/create/clients/:id`

- Trail breadcrumbs: `Clients › {name}` (last crumb active blue `#301CA0`)
- **Delete** text under the title when `sessions.length === 0` (same API rules)
- Upcoming & Past: session cards, or **Activity-style empty boxes** with copy


> **Screenshot:** Client detail empty states and Delete under name  
> File (agent store): `media/creator-status-2026-09-30/prod_empty_client_delete_and_boxes.webp`


*Falaj Bank detail: Delete under name; empty Upcoming/Past boxes.*

### 2.3 Session detail — `/create/sessions/:id`

- Trail: `Clients › {client} › {session title}`
- Join / facilitator board / co-facilitator (`?token=`) / try / print rows with copy icons
- “Regenerate” as text under co-facilitator flow
- Variable values + archives


> **Screenshot:** Session breadcrumb trail  
> File (agent store): `media/creator-status-2026-09-30/prod_trail_breadcrumb_session.webp`


*Amazon-style trail on session page (gray ancestors, blue current).*

### 2.4 New session wizard — `/create/clients/:id/new`

- Trail grows with steps; ancestors use `onClick` to jump back (no inline Back buttons)
- Example deep trail: `Clients › Unilever UAE › Categories › Problem framing`


> **Screenshot:** Wizard breadcrumb trail  
> File (agent store): `media/creator-status-2026-09-30/trail_breadcrumb_wizard.webp`


### 2.5 Activities / briefs — `/create/library`, `/create/briefs/:id`

- Trail on briefs: `Activities › {title}`
- Creator-styled dropdowns (Radix), not native selects
- In design pencil status tag; New activity → brief editor


> **Screenshot:** Brief breadcrumb  
> File (agent store): `media/creator-status-2026-09-30/trail_breadcrumb_brief.webp`


### 2.6 Sessions tab — `/create/boards`

- All sessions Live / Ready / Ended; open facilitator board in **new tab**

### 2.7 Facilitator boards (Phase 7)

- Collapsible Markdown notes from `resolved_facilitator_notes` on Demand + Mart boards
- Auth: logged-in org user **or** `?token=` co-facilitator link
- Hidden when notes empty (legacy v1 Unilever often empty)

---

## 3. Chrome / design tokens (Creator)

| Token | Value |
| --- | --- |
| Page bg | `#F8F6EF` |
| Active / brand purple | `#301CA0` |
| Muted gray | `#6C6975` |
| Soft border | `#E7E4DD` |
| Cards | `bg-white border border-[#E7E4DD] rounded-xl p-5` |
| Nav tabs | Clients · Activities · Sessions (pill switcher) |
| Dialog enter | `.tpl-dialog-panel` / `tpl-dialog-drift-in` in `src/index.css` (top → center) |

Key files:

- `artifacts/scenario-simulator/src/pages/create-shell.tsx` — tabs, `Breadcrumbs`, status tags
- `create-clients.tsx` — list, lightbox, hover delete
- `create-client.tsx` — detail, empty boxes, Delete under title
- `create-session.tsx` / `create-new-session.tsx` / `create-brief.tsx` / `create-library.tsx` / `create-boards.tsx`
- `create-select.tsx` — styled selects
- `artifacts/api-server/src/routes/create.ts` — creator API including `DELETE /create/clients/:id`

---

## 4. API (creator) — note deletes

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `logout`, `GET /auth/me`, `GET /auth/check` |
| Clients | `GET/POST /create/clients`, `GET/PATCH/DELETE /create/clients/:id` |
| Exercises | `GET /create/exercises`, `GET /create/exercises/:id` |
| Briefs | `GET/POST/PATCH /create/briefs…` |
| Assets | `POST /create/assets`, `GET /create/assets/:id` |
| Sessions | `GET/POST /create/sessions`, preview, `GET …/:id` |
| Prefill | `GET /create/clients/:clientId/copies/:exerciseId` |
| Facilitator token | `POST /workshop-sessions/:id/facilitator-token` |
| Facilitator notes | `GET /workshop-sessions/by-code/:code/facilitator-notes` |

**Delete client rules:** 409 if any `workshop_sessions` row exists for that client; clears `briefs.client_id` first; `client_copies` cascade.

---

## 5. Data model (short)

```
organisation → users, clients, exercises→versions, briefs, assets
client → client_copies (per exercise), workshop_sessions (frozen resolved_content + notes)
workshop_sessions → runtime workshops / teams / archives
```

**Rule:** old rooms never rewrite when copies or exercise versions change later.  
**Unilever legacy:** `DEFAULT` / `MART` stay on **v1** Gulf snapshots. New sessions use **latest published** version (v2 on prod after Phase 4 seed).

---

## 6. Recent polish shipped (2026-09-30) — PRs

| PR | Change |
| --- | --- |
| #14–#22 | Tabs rename, pencil, Sessions new tab, brief Back/Save, capitalize seeds, footer Back remove, etc. |
| #23 | Phase 7 facilitator notes panel |
| #24–#26 | Session copy icon, regenerate layout, split board vs co-facilitator links |
| #27–#28 | Back crumbs → trail precursors |
| #29 | Custom selects |
| #30 | Amazon-style trail breadcrumbs |
| #31 | New client lightbox + empty-client delete (detail) |
| #32 | Hover delete on empty client cards (+ follow-up align/center commits on `main`) |

Follow-up commits on `main` after #32 (no separate PR): tag flush (`b0e0f77`), icon center attempts, flex center (`860234b`).

---

## 7. What’s left / rest-of-build progress

Working plan docs:

- [`deploy-staging-first.md`](./deploy-staging-first.md) — Railway: `main` → staging, `production` → prod (**apply in Railway dashboard**)
- [`shell-engine-audit.md`](./shell-engine-audit.md) — Step 2 coupling report
- [`import-and-safeguards.md`](./import-and-safeguards.md) — Phase 6 import + token checks
- [`rehearsal-checklist.md`](./rehearsal-checklist.md) — Step 8 dress rehearsal

### Built in rest-of-build PR

- Engine contract (`engine-contract.ts` / `engineContract.ts`) — steps, done, progress
- Category vs engine labels in Activities + wizard (no more category→engine map)
- Shared CSV prefix on Demand + Mart exports
- Import API + CLI + Activities upload UI
- Token declaration checks on import; wizard copy upgrade path kept (no new button)
- Facilitator boards: hide legacy ActivityTabs on `/s/:code`; use session title + try path

### Still for Ali / ops

1. Apply Railway branch wiring from `deploy-staging-first.md`
2. Supply a draft new exercise to stress-test import (not only v2 fixtures)
3. Six-window dress rehearsal on staging then production ([checklist](./rehearsal-checklist.md))
4. Join-flow visual examples (Step 9 — **do not invent**)
5. Optional later: retire `/demand` `/mart`, preview cleanup, remove `FACILITATOR_SECRET`

### Explicitly out of scope (still)

- AI content generation
- Editing questions / options / stakeholders / evidence / scoring in-product
- New engines (ideation, prototyping)
- Multi-user roles UI
- Mobile creator/player
- Cross-country / currency packs
- Reopening locked Unilever Session 1 content (Rohini Q3 events-only, SKU W34 no synthesis callout, Rakesh Q4, Fatima/James, retailer + capacity memos, `askLimit` 3)

---

## 8. Where to click (map)

```
/login
  → /create                         Clients (cards, New client lightbox, hover delete)
       → /create/clients/:id        Detail (trail, Delete if empty, empty boxes, New session)
            → …/new                 Wizard + trail
            → /create/sessions/:id  Links + archives + trail
  → /create/library                 Activities
       → /create/briefs/:id|new     Brief editor + trail
  → /create/boards                  Sessions (boards, new tab)
/s/:CODE[/facilitate|/try|/print]   Player / facilitator for that session
/demand · /mart                     Legacy Unilever rooms
```

---

## 9. Agent operating notes

- Branch naming: `cursor/<descriptive-name>-c558`
- Prefer `main` + GitHub auto-deploy for production
- Local API needs `CONTENT_DIR` pointing at `…/content` and DB (Railway TCP proxy if using prod Postgres)
- Do not reopen locked content decisions (see §7.D)
- For Creator UI polish, match existing cream/purple system; avoid generic AI purple-gradient landing patterns on player redesign when that work starts
- Store internals from this run: `internal/client-delete-lightbox.md`, `client-card-hover-delete.md`, `trail-breadcrumbs-pr30.md`, `phase7-facilitator-notes.md`, `phase4-prod-deploy.md`

---

## 10. Suggested first questions for Ali (if unclear)

1. Phase 6 import next, or dress rehearsal / print PDF first?
2. Any more Creator chrome polish before import?
3. Ready with join-flow visual examples, or still waiting?
4. Delete clients with sessions ever (hard cascade), or keep “empty only”?

---

*Last updated: 2026-09-30 — production on Phases 1–5 + 4 + 7; tip `860234b`; GitHub→Railway auto-deploy confirmed working.*
