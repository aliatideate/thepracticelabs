# Rehearsal results

## Staging Creator rehearsal — 2026-09-30

Client: **Rehearsal Co** (not Unilever). Sessions created through Creator.

| Session | Code | Exercise |
| --- | --- | --- |
| Rehearsal — Demand Spike | `H72DJ7` | The Demand Spike (company → Rehearsal Beverages) |
| Rehearsal — Week in the Field | `AXQKUC` | A Week in the Field (chain → Oasis Mart) |

### Checklist outcomes

| Item | Result |
| --- | --- |
| Staging tip / healthz | ok |
| Non-Unilever client | Rehearsal Co |
| Demand + Mart Creator sessions | created |
| 6+ team joins | **7** (Mart ×4 + Demand ×3) |
| Mid-activity player refresh | ok (Mart mid-decision GET; Demand stakeholder GET) |
| Mid-activity facilitator board refresh | ok (API) |
| Facilitator login on board | ok (API) |
| Co-facilitator `?token=` on board | **API ok; UI blocked** — `AuthGate` ignored token (fix in PR) |
| Attention / nudge | not exercised |
| Submit / reveal | Mart: 2 teams to reveal |
| CSV shared prefix | ok for both engines |
| Archive save / list | ok (Mart + Demand after teams joined) |
| Demand `/print` | ok (HTML loads with Rehearsal Beverages) |
| Production rehearsal | **not run** — staging first; promote only with Ali OK |

### What broke

1. **Co-facilitator UI links redirected to `/login`.**  
   Session facilitate routes wrap boards in `AuthGate`, which only checked the Creator cookie. APIs already accept `x-facilitator-token` from `?token=`, and Creator session detail already mints those links.  
   **Fix:** `AuthGate` gains `allowFacilitatorToken`; `/s/:code/facilitate` uses it.

2. Demand join API requires `workshopCode` in the **body** (query alone is not enough). Documented by the rehearsal script slip; not a product bug for the UI join flow.

### Links (staging)

- Demand join / try / print: `/s/H72DJ7`, `/s/H72DJ7/try`, `/s/H72DJ7/print`
- Mart join / try: `/s/AXQKUC`, `/s/AXQKUC/try`
- Facilitate (after fix): `/s/H72DJ7/facilitate?token=…`, `/s/AXQKUC/facilitate?token=…`

### Results log

| When | Env | Broke | Fixed |
| --- | --- | --- | --- |
| 2026-09-30 | staging + prod healthz | n/a — health ok; multi-window not run yet | — |
| 2026-09-30 | staging Creator | Co-facilitator `?token=` UI → login | AuthGate `allowFacilitatorToken` on session facilitate |
| 2026-09-30 | staging Creator | (otherwise) Demand/Mart multi-team, CSV, archive, print OK | — |
