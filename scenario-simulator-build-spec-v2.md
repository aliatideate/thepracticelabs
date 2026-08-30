# Scenario Simulator — Build Specification v2

**Session:** Wednesday 2 September 2026 — "Session 1: Foundations + Problem Framing", Unilever, remote.
**Build window:** three evenings.
**Built by:** Ali in Cursor, with Muhammad Raahim on architecture.
**Supersedes:** v1. Changes are marked ⚠ where they reverse an earlier decision.

---

## 1. The constraint that shapes everything

Six teams of five, one shared screen per team, in Zoom or Meet breakout rooms, for a 30-minute activity. Everything before and after the breakout happens on the main call with slides and Miro.

There are three evenings to build this and write the content. **The content is the critical path, not the code.** Every scope decision below is made to protect writing time.

### In scope

Participant flow for problem framing · one authored scenario loaded from a file · team join without accounts · countdown timer · a read-only facilitator list · outputs export · printable fallback pack.

### Out of scope — do not build

Scenario Studio as an interface · other exercise types · multiple sessions or organisations · accounts or authentication · participant names · in-product debrief · facilitator↔team messaging · scoring or AI evaluation of submissions · any runtime AI call · attention-threshold logic · nudges, notes, or access-request flows.

⚠ The existing codebase has working moderator notes and access requests. **Leave them in the backend, remove them from the UI.** Deleting them costs time; exposing them costs testing time. They stay dormant.

---

## 2. Port, don't rebuild

The existing Replit project is a pnpm monorepo with a genuinely good backend and a demo-grade front end. Import it into Cursor whole, then work package by package.

| Package | Action |
|---|---|
| `lib/db` | **Keep.** Schema is sound. One migration needed — see §5. |
| `artifacts/api-server` | **Keep.** Sessions, submit, reset, flag all work. Two new endpoints — see §5. |
| `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | **Keep the workflow.** Contract-first codegen. If it slows Cursor down on day one, collapsing to hand-written types in the server package is an acceptable retreat — Raahim's call. |
| `artifacts/scenario-simulator` | **Restyle and rework.** Structure survives, styling does not, interview logic does not. |
| `artifacts/mockup-sandbox` | **Delete entirely.** Two near-duplicate copies of a superseded mockup, plus the shadcn library twice. Dead weight. |
| `attached_assets` | **Keep** the four stakeholder portraits and the Gulf Beverages logo. Delete the pasted prompt text files and screenshots. |

### What is broken in the current build

Cursor must be told these explicitly, or it will preserve them:

1. **`functional: true/false` flags.** Only Rohini and Retailer Complaints are live; the other three stakeholders and two evidence sources render disabled. **Remove the flag entirely.** All four stakeholders and all three evidence sources must work.
2. **Interview choices do nothing.** Each question has three options with one marked `happy`, but the same authored response fires regardless of which is picked. Replaced entirely — see §6.
3. **The flow hands teams the answer.** Per-question `learning` fields, plus `interviewInsights`, `retailerInsights`, `synthesis`, and a dedicated `insights` screen, state the conclusions before teams write their problem statement. **Delete all of them.** Teams must arrive at the debrief with different reads. This is the whole point of the exercise and the current build destroys it.
4. **Screen count.** Current flow is thirteen screens (`company, scenario, investigate, intro, q1–q4, evidence, evidence_reveal, insights, problem, confirm`). New flow is five — see §7.
5. **The timer is a hardcoded string** (`timeRemaining: "42:06"`). Real timer needed.
6. **Team join is a free-text name field.** Replaced with a picker — see §4.
7. **No export, no fallback pack.** Both new.

---

## 3. Hosting

**Railway**, Hobby plan. One Node service plus a Postgres instance in the same project, deployed from GitHub. No spin-down, no cold starts, usage-based billing in the low single digits per month.

Set this up **first, before writing feature code.** Get a hello-world Express app deployed and reachable on the Railway URL on evening one. Deployment problems discovered on Tuesday night are fatal; discovered on Sunday they are an inconvenience.

Do a full dress rehearsal on the production URL on Tuesday: six browser windows, six teams, run the whole flow end to end.

---

## 4. Access and identity

No accounts, no authentication, no participant names.

**Join:** one link, posted in the main call chat before breakouts open. First screen shows six team buttons. A claimed team greys out. Team identity persists in local storage plus server-side, so a refresh returns the team to exactly where they were.

**Facilitator:** separate route, protected by a shared secret in the URL. Adequate for one scheduled session and nothing more.

---

## 5. Data model

Existing `sessions` table survives almost unchanged. Required changes:

- `answers` jsonb changes shape ⚠ — from `{ questionId, selected: "A"|"B"|"C" }[]` to `{ questionId, askedAt }[]`. Option A records *which* questions were asked and in what order; there are no A/B/C options any more.
- Add `session_config` — a single-row table or a JSON config: `startedAt`, `durationMinutes`, `endedAt`. Drives the shared timer.
- Drop nothing. `assumption`, `flagged_for_debrief`, `moderator_notes`, `access_requests` stay in the schema, unused.

New endpoints:

- `POST /api/session-config/start` — sets `startedAt`, returns config
- `PATCH /api/session-config` — adjusts `durationMinutes`
- `GET /api/session-config` — polled by all clients for the timer
- `GET /api/export?format=csv|json` — outputs export

Scenario content is **not** in the database. It loads from a file at boot (§9).

---

## 6. The interview mechanic ⚠

Replaces the A/B/C model entirely.

Each stakeholder has a **pool of four questions**, of which a team may ask **three**. Each question carries its own authored answer. Choosing a weak question genuinely costs the team information, because they have spent a slot they cannot recover.

⚠ v1 specified a pool of six with four askable. Reduced to protect writing time: Rohini's four existing answers carry over unchanged, and only twelve new answers are needed rather than twenty-four. **The schema must not hard-code these numbers** — pool size and ask limit are per-stakeholder fields in the content file, so the pool can grow after the session without a code change.

Screen behaviour:

- Question counter reads "Question 1 of 3"
- The full pool is visible; asked questions disappear from it
- Interview history accumulates above, scrollable
- A short "thinking" delay before the answer appears is worth keeping — it reads as conversation rather than lookup
- After the third answer, the primary action becomes **Continue to Evidence**
- A team may continue before asking all three

No free text. No runtime generation. All answers pre-authored.

---

## 7. Participant flow

Five screens. The sixth step in the workshop — the debrief — happens on the main call.

Persistent header: logo lockup, "Session 1: Foundations + Problem Framing", scenario title, countdown timer, team number.

Breadcrumb: 01 Brief · 02 Stakeholder · 03 Interview · 04 Evidence · 05 Define the Problem. Completed steps are re-visitable read-only. **Choices, once confirmed, are locked.** The brief is always re-readable.

**1 — Read the Brief.** Company profile: logo, name, descriptor, overview, fact grid. Then the situation. Action: Continue.

**2 — Pick Stakeholder.** Four cards, 2×2. States the constraint plainly: one stakeholder, one document, limited time. Select-then-confirm, because a mis-click costs the team their exercise. Below, the three evidence sources shown greyed and labelled locked — teams should see what they are trading away.

**3 — Interview.** Per §6. Stakeholder identity card, question counter, history, remaining pool. Right column carries the stakeholder's `sideNote` — a fixed framing cue, not a conclusion.

**4 — Review Evidence.** Completed interview shown at top. Three cards: title, subtitle, teaser. Same select-then-confirm. On confirm, the document opens (§8) and stays re-readable.

**5 — Define the Problem.** Text area, authored prompt above it, confidence selector (Low / Medium / High). Submit.

**Submitted.** Confirmation, read-only card showing team number, confidence, statement. Instruction text — ⚠ not a button — telling the team to return to the main workshop room when the facilitator calls time. No "Review Your Learnings".

---

## 8. Evidence documents

⚠ Not uploaded files. No PDF viewer, no spreadsheet embed. Each document is an ordered array of content blocks, rendered as a styled document panel.

| Block | Fields |
|---|---|
| `heading` | `text`, `level` |
| `paragraph` | `text` |
| `table` | `columns[]`, `rows[][]`, `caption?` |
| `keyValue` | `items[] {label, value}` |
| `callout` | `text`, `label?` |
| `list` | `items[]`, `ordered` |
| `quote` | `text`, `attribution` |

Header bar carries title, subtitle, source label. Renders on **white**, visually distinct from the tool around it, so it reads as a document extracted from a business rather than a page of the workshop app.

---

## 9. Content contract

The application ships with **no hard-coded scenario content.** Everything loads from `content/scenario.json` at boot.

```
scenario
├── id, title, exerciseType
├── timing.defaultMinutes                 30
├── company { name, descriptor, logo, overview, facts[] {label, value} }
├── situation                             string
├── stakeholders[]                        4
│   ├── id, name, role, blurb, avatar
│   ├── sideNote                          framing cue, not a conclusion
│   ├── askLimit                          3
│   └── questions[]                       4
│       └── { id, text, answer }          answer 60–120 words
├── evidence[]                            3
│   └── { id, title, subtitle, teaser, sourceLabel, blocks[] }
└── submission { prompt, placeholder, confidenceOptions[] }
```

### The build-first, write-later requirement

Cursor builds against a **complete placeholder scenario** — full shape, filler text. Four stakeholders, four questions each with distinct answers, three evidence documents exercising every block type in §8. Not a stub with a TODO.

**Acceptance test:** replacing `content/scenario.json` and restarting changes every screen, with no code edit and no component change. State this to Cursor as a hard requirement. "Leave room for content" reliably degrades into "hardcoded a demo and left a comment."

Rohini's four existing answers in `data.ts` are good and carry over verbatim into the new structure.

---

## 10. Facilitator view ⚠

Cut to a bare read-only list. v1 specified status pills, attention thresholds, nudges, and per-team controls. All removed.

A single table, polling every 5 seconds:

| Team | Current step | Stakeholder | Evidence | Submitted | Confidence |
|---|---|---|---|---|---|

Plus: **Start Exercise**, **Adjust timer**, **End Exercise**, **Download outputs**, and a **Release team slot** control for a mis-picked team.

Polling, not SSE, for this view. The SSE infrastructure exists and works — if it comes across for free, fine, but do not spend an evening on it.

Judgement about who is stuck happens the way it does now: over the call, in the rooms. The dashboard's job on Wednesday is to tell you who has submitted and what they chose, so the debrief is prepared.

---

## 11. Timer

Single shared countdown, started once by the facilitator. Not per-team on join, or the teams desynchronise.

Displayed in every header. Under five minutes remaining, it changes colour — no modal.

**At zero:** a banner appears on every participant screen — "Time's up. Please return to the main workshop room." Nothing locks. Nothing auto-submits. No navigation is blocked. A team told to keep going can dismiss it and continue. The facilitator can extend at any point, including after expiry.

Duration lives in the content file *and* is adjustable from the facilitator view.

---

## 12. Outputs and fallback

**Export**, from the facilitator view: CSV (one row per team — team, stakeholder, evidence, questions asked in order, problem statement, confidence, time per step) and JSON (full record). Data persists after the session and after a restart.

**Fallback pack.** The scenario must export as a single printable PDF: company brief, all four stakeholders with all authored questions and answers, all three evidence documents, submission prompt. Generated and tested **before Wednesday.**

If the app fails mid-session, drop the relevant pages into breakout rooms and continue on Miro. If PDF generation proves fiddly, produce the pack by hand in Google Docs — it must exist, it does not have to be automated.

**Refresh resilience.** A team reloading returns to their exact state, choices and interview history intact. Non-negotiable.

**No live external dependencies.** No API calls during the session. All content loaded at boot.

---

## 13. Visual system

Replaces the dark gradient theme entirely. Current styling is Tailwind classes, not architecture, so this is mechanical — but it is a real chunk of an evening.

**Typefaces.** DM Serif Display for headings, Figtree for body. Both from Google Fonts, self-hosted.

**Logo.** `the_Practice_Labs_Logo___Horizontal.svg` (487.7 × 51.3) for the header. Both logo files are white-only via a hardcoded `.st0 { fill: #fff }` in an embedded `<style>` block. **Strip the `<style>` block and set `fill="currentColor"`** so one asset serves purple-on-white and white-on-purple.

**Palette.**

| Token | Hex | Use |
|---|---|---|
| Deep Purple | `#301CA0` | Primary. Header, primary buttons, confirmed selections, links. |
| Deep Purple Dark | `#1A0F58` | Hover states, dark surfaces. |
| Soft Mint | `#84C5B1` | Secondary accent. |
| Pale Mint | `#E6F3EF` | Light fills, delicate accents. |
| Deep Teal | `#496C61` | Text on mint backgrounds. |
| Soft Lavender | `#EAE8F6` | Selection fills, section backgrounds. |
| Warm White | `#F8F6EF` | Page background. |
| White | `#FFFFFF` | Cards, evidence documents. |
| Charcoal | `#1D1D24` | Body text. |
| Muted Grey | `#6C6975` | Secondary text, metadata, icons. |
| Soft Grey | `#E7E4DD` | Borders, dividers. |
| Success | `#2E7D5B` | Submitted. |
| Warning | `#B7791F` | Timer under five minutes. |
| Error | `#B42318` | Time expired. |
| Info | `#3159C9` | Informational states. |

**Application.**

- App chrome — header, breadcrumb, facilitator view: Deep Purple on Warm White. **Solid, no gradients.**
- Participant working screens: Warm White page, White cards, Soft Grey borders, Charcoal body text.
- Selection states: Soft Lavender fill with Deep Purple border. Confirmed: solid Deep Purple.
- Evidence documents: pure White, tighter type, Muted Grey metadata.
- Buttons: primary is Deep Purple on White text; secondary is Pale Mint fill, Deep Purple text, Soft Mint border.

Reserve Soft Mint for meaningful states rather than decoration, or the signal weakens.

**Legibility over video.** Participants read someone else's shared screen through video compression. Nothing below 14px in participant-facing copy. Hold layouts at 1280px wide. Avoid thin weights at small sizes. Light-on-white survives Zoom encoding considerably better than the current dark theme, which is the practical argument on top of the brand one.

Header text: **The Practice Labs by Ideate Innovation**.

---

## 14. Three-evening plan

**Evening one — make it deployable and make it work.**
Import to Cursor, delete `mockup-sandbox`. Railway project up, Postgres attached, hello-world deployed and reachable. Move scenario content out of `data.ts` into `content/scenario.json` with the full placeholder shape. Remove the `functional` flags. Rebuild the interview to Option A. Cut to five screens; delete the insights screens and all `learning` fields.

**Evening two — restyle and finish the mechanics.**
Apply the visual system across all screens. Team picker. Real timer with soft expiry. Facilitator read-only list. First deploy of the real app to Railway.

**Evening three — content, export, rehearsal.**
Load real content. Export endpoints. Fallback pack. Full dress rehearsal on the production URL with six windows.

**If you fall behind, cut in this order:** CSV export (query the database afterwards instead) → automated PDF pack (make it by hand) → facilitator view (run the session blind and read the database after) → the fourth stakeholder.

**Do not cut:** the four working stakeholders and three evidence sources, refresh resilience, or the fallback pack in some form.

### The real risk

Twelve new stakeholder answers and three evidence documents is several hours of careful writing, and it is competing with the build for the same three evenings. Start the content now, in parallel — not after the tool works. The evidence documents come first, because they anchor what the stakeholders can plausibly say.

---

## Appendix — content design

Design intent, not final copy.

**Gulf Beverages Co.** — fast-growing regional beverage manufacturer. Markets: UAE, Saudi Arabia, Qatar. Lines: bottled juices, flavoured water, ready-to-drink teas. Channels: modern trade, convenience, hospitality, e-commerce.

**The situation.** Demand up roughly 40% year on year. Service levels falling, retailers threatening to delist two product lines within six weeks. The business is treating it as a demand spike it failed to forecast.

**The underlying problem.** Growth is not evenly distributed — it is concentrated in two product lines, mostly modern trade in UAE and KSA. Those lines run on equipment with long changeover times, so short runs are expensive and have been batched less often. Some SKUs move far faster than forecast while others sit close to plan. So this is not an aggregate forecasting failure; it is a planning process treating a concentrated SKU-level shift as a general uplift, colliding with a manufacturing constraint nobody surfaced.

Several defensible framings should be reachable depending on what a team looked at. There is no single correct answer. The differences between team statements are the substance of the debrief.

**Stakeholders.**

| Who | Surfaces | Misses |
|---|---|---|
| Rohini Agarwal — Demand Planner | Aggregate forecast accuracy looks acceptable; the miss is SKU and channel specific. Signals changed late and were read as promotional uplift. | No visibility of production constraints. |
| Fatima Al-Harbi — Procurement Lead | Supplier lead times stable, orders placed within agreed windows. No upstream shortage. | Assumes the issue is downstream; unaware of unconfirmed production slots. |
| James Okoro — Factory Manager | Line utilisation, changeover hours, batching decisions, minimum economic run length. | Frames it as capacity; unaware planning treats demand as uniform. |
| Rakesh Memon — Finance Manager | Working capital limits, stock-holding policy, cost of short runs. Wasn't consulted on emergency replenishment. | Sees symptoms financially, not operationally. |

Four questions each, three askable. Answers 60–120 words, in role voice — partial, occasionally defensive, never stating the conclusion. Individually plausible, collectively incomplete.

**Evidence documents.**

1. **Retailer Complaints Summary** — heading, paragraph, table of complaints by market and channel, three or four verbatim quotes. Reveals the shortage is concentrated and some accounts are unaffected.
2. **SKU Availability Snapshot** — heading, intro, table of SKU × market × channel against plan, callout on the two worst lines. Reveals which products, and where.
3. **Production Capacity & Changeover Memo** — heading, paragraph, table of line utilisation and changeover hours, callout on minimum economic run length. Reveals the manufacturing constraint.

Each credible on its own, useful on its own, and insufficient on its own.
