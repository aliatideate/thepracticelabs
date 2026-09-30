# Rehearsal results

## Production Creator rehearsal — 2026-09-30

Promoted `production` ← `main` (Ali OK). Tip **`5a2e218`**. Client: **Prod Rehearsal Co**.

| Session | Code | Exercise |
| --- | --- | --- |
| Prod Rehearsal — Demand Spike | `6SZHRJ` | The Demand Spike → Prod Rehearsal Beverages |
| Prod Rehearsal — Week in the Field | `Q7X2TU` | A Week in the Field → Harbor Mart |

| Item | Result |
| --- | --- |
| Production deploy | live (`allowFacilitatorToken` in bundle) |
| 7 team joins | Mart ×4 + Demand ×3 |
| Mid-flow refresh | ok |
| Co-facilitator `?token=` UI | **pass** (boards load without Creator login) |
| CSV / archive / Demand print | ok |
| Broke | none |

Links: https://practicelabs.up.railway.app/s/6SZHRJ · https://practicelabs.up.railway.app/s/Q7X2TU

---

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
| Co-facilitator `?token=` on board | **fixed + retested** — boards load without Creator login (`9fbed96`) |
| Attention / nudge | not exercised |
| Submit / reveal | Mart: 2 teams to reveal |
| CSV shared prefix | ok for both engines |
| Archive save / list | ok (Mart + Demand after teams joined) |
| Demand `/print` | ok (HTML loads with Rehearsal Beverages) |
| Production rehearsal | **done** — see section above |

### What broke (staging)

1. **Co-facilitator UI links redirected to `/login`.**  
   **Fix:** `AuthGate` gains `allowFacilitatorToken`; `/s/:code/facilitate` uses it. Retested on staging + production.

2. Demand join API requires `workshopCode` in the **body** (query alone is not enough). Not a product bug for the UI join flow.

### Links (staging)

- Demand: `/s/H72DJ7`, `/s/H72DJ7/try`, `/s/H72DJ7/print`
- Mart: `/s/AXQKUC`, `/s/AXQKUC/try`

### Results log

| When | Env | Broke | Fixed |
| --- | --- | --- | --- |
| 2026-09-30 | staging Creator | Co-facilitator `?token=` UI → login | AuthGate `allowFacilitatorToken` |
| 2026-09-30 | staging Creator | (otherwise) multi-team, CSV, archive, print OK | — |
| 2026-09-30 | production | none | promote `production` ← `main` @ `5a2e218`; 7-team pass OK |
