# Full multi-person rehearsal checklist

Run after Steps 1–7 on **staging**, then **production**. Use sessions **created through Creator**, not legacy `/demand` or `/mart`.

## Prep

- [x] Staging deploy is current tip of `main`
- [x] Log into Creator on staging
- [x] Create a non-Unilever client (e.g. “Rehearsal Co”)
- [x] New session: Demand Spike with renamed company/logo
- [x] New session: Week in the Field with renamed chain/branches
- [x] Open facilitator board + regenerate co-facilitator `?token=` link

## During (30 min)

- [x] Six or more windows join as different teams (mix of both sessions if time)
- [x] Refresh mid-activity on a player window
- [x] Refresh mid-activity on the facilitator board
- [ ] Facilitator (logged in) and co-facilitator (`?token=`) on the board together — **API ok; UI fix pending deploy**
- [ ] Attention / nudge if available
- [x] Submit / reach reveal on enough teams

## After

- [x] Download CSV — shared prefix columns present (`client, session, exercise, category, engine, team, slot, …`)
- [x] Save archive / open archive
- [x] Save `/print` (investigation) as PDF — HTML print pack loads (PDF save is manual)
- [x] Write up what broke and what was fixed below

## Results log

See [rehearsal-results.md](./rehearsal-results.md).

| When | Env | Broke | Fixed |
| --- | --- | --- | --- |
| 2026-09-30 | staging Creator | `?token=` facilitate → login | AuthGate `allowFacilitatorToken` |
