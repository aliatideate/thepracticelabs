# Rehearsal results

Pre-check (2026-09-30, before staging deploy of rest-of-build):

| Env | Health |
| --- | --- |
| Staging `https://app-staging-78f4.up.railway.app/api/healthz` | ok |
| Production `https://practicelabs.up.railway.app/api/healthz` | ok |

Full six-window Creator rehearsal is blocked until:

1. This PR is merged and staging has the new build
2. Railway staging-first wiring is applied ([deploy-staging-first.md](./deploy-staging-first.md)) so production is not hit by the merge
3. Ali runs (or authorizes) the multi-window pass on staging, then production

Use [rehearsal-checklist.md](./rehearsal-checklist.md). Log outcomes in the table there.
