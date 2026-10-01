# Deploy: staging first, then production

**Status:** Live. Staging tracks `main`; production tracks `production`.

## Goal

Merges to `main` must not update production. Production is promoted deliberately after staging looks right.

## Railway setup

| Environment | Branch | URL |
| --- | --- | --- |
| Staging | `main` | https://app-staging-78f4.up.railway.app |
| Production | `production` | https://practicelabs.up.railway.app |

Project: **the-practice-labs**. Same project, two environments. Separate Postgres per environment.

### One-time setup (Railway dashboard)

1. **Staging → `app`** — Connect GitHub `aliatideate/thepracticelabs`, branch **`main`**, root directory **`0406-0305-scenario-simulator-snapshot`**, auto-deploy on. Match production deploy settings (healthcheck `/api/healthz`, Dockerfile builder via `railway.toml`).
2. **Production → `app`** — Change watch branch from `main` to **`production`**. Keep root directory **`0406-0305-scenario-simulator-snapshot`**.
3. GitHub branch `production` already exists (tip matches live at setup time).

### Daily flow

1. Open a PR into `main`.
2. Merge → Railway deploys **staging** only.
3. Smoke staging (Creator login, new session, join, facilitate, CSV).
4. **Promote to production only via PR — never push `production` directly:**

   1. Open a PR with **base = `production`**, **head = `main`** (GitHub: compare `production`...`main`, or `gh pr create --base production --head main`).
   2. In the PR body, list:
      - What commits / merged PRs are included
      - Anything that could change behavior for **existing** sessions (frozen `resolved_content`, join/board UI, APIs, content loaded at boot)
   3. **Wait for Ali’s explicit “yes” in chat** before merging.
   4. Merge the PR (merge commit or GitHub’s merge button — do **not** `git push origin production`).
   5. Railway deploys **production** from the new `production` tip.

### Hard rules (agents and humans)

- **Never** deploy to production with `railway up` or any Railway CLI command.
- **Never** push directly to `production` (`git push origin production` is forbidden).
- **Never** merge a `main` → `production` PR without Ali’s explicit “yes” in chat for that PR.
- There is no CLI fallback for production. If GitHub→Railway is broken, stop and ask Ali.

### Notes

- Root directory on both environments must stay `0406-0305-scenario-simulator-snapshot`.
- Content is loaded at API boot from `content/` and from frozen `workshop_sessions.resolved_content`; a deploy does not rewrite existing sessions.
- Schema: `bootstrapDatabase()` runs on API start (`CREATE … IF NOT EXISTS`). Seeds are separate CLI scripts — not auto on deploy.
- Env vars (`DATABASE_URL`, `CREATOR_EMAIL`, `CREATOR_PASSWORD`, etc.) stay per-environment; do not share staging DB with production.
