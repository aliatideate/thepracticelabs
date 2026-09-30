# Deploy: staging first, then production

**Status:** documented for Ali to apply in Railway. App code does not change deploy targets.

## Goal

Merges to `main` must not update production. Production is promoted deliberately after staging looks right.

## Recommended Railway setup

| Service | Branch | URL |
| --- | --- | --- |
| Staging | `main` | https://app-staging-78f4.up.railway.app |
| Production | `production` | https://practicelabs.up.railway.app |

### One-time setup (Railway dashboard)

1. **Staging service** — Settings → Source: watch branch `main`. Root directory: `0406-0305-scenario-simulator-snapshot`. Auto-deploy on.
2. **Production service** — Settings → Source: change watch branch from `main` to `production`. Disconnect `main` before the next merge so a push cannot hit live clients.
3. Long-lived `production` branch — **created on GitHub** (tip = `main` as of rest-of-build PR). Point the Railway **production** service at branch `production`, and point **staging** at `main`.

### Daily flow

1. Open a PR into `main`.
2. Merge → Railway deploys **staging** only.
3. Smoke staging (Creator login, new session, join, facilitate, CSV).
4. Promote:

   ```bash
   git fetch origin
   git checkout production
   git merge --ff-only origin/main
   git push origin production
   ```

5. Railway deploys **production** from the `production` branch tip.

### Fallback (no `production` branch)

- Staging tracks `main` (auto).
- Production stays manual: after staging is good, `railway up ./0406-0305-scenario-simulator-snapshot --path-as-root` against the **production** project/token for that SHA.

Prefer the branch method so git history shows what is live.

### Notes

- Root directory on both services must stay `0406-0305-scenario-simulator-snapshot`.
- Content is loaded at API boot from `content/` and from frozen `workshop_sessions.resolved_content`; a deploy does not rewrite existing sessions.
- Env vars (`DATABASE_URL`, `CREATOR_EMAIL`, `CREATOR_PASSWORD`, etc.) stay per-service; do not share staging DB with production.
