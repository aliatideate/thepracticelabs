# Rebuilding the app from scratch

A future you (or another agent) should be able to follow this list in
order, end-to-end, and end up with a working copy of Scenario Simulator.
Each step references the file(s) it produces or modifies.

## 0. Prerequisites

- Node.js 24, pnpm, Postgres 16 (a hosted Replit DB is fine).
- A `DATABASE_URL` environment variable.

## 1. Bootstrap the monorepo

1. `pnpm init` at the root, set `private: true`, add the `typecheck` /
   `build` scripts described in the root `package.json`.
2. Create `pnpm-workspace.yaml` with:
   - `packages: [artifacts/*, lib/*, scripts]`
   - The `catalog:` section pinning shared versions (`react`, `vite`,
     `tailwindcss`, `@tanstack/react-query`, `drizzle-orm`, `zod`,
     etc.).
   - `minimumReleaseAge: 1440` (supply-chain defense).
3. Add `tsconfig.base.json` (strict TS defaults) and `tsconfig.json`
   (solution file with `references` for the composite libs).

## 2. Add the database lib (`lib/db`)

1. Create `lib/db/package.json` with `drizzle-orm`, `pg`, `drizzle-zod`,
   `zod` as dependencies and `drizzle-kit`, `@types/pg`,
   `@types/node` as devDependencies.
2. `lib/db/src/index.ts` — pg `Pool` + `drizzle(pool, { schema })`.
3. `lib/db/src/schema/workshops.ts`, `sessions.ts`, `moderator.ts`
   matching `docs/data-model.md`.
4. `lib/db/drizzle.config.ts` pointing at `src/schema/index.ts`.

## 3. Define the API contract (`lib/api-spec`)

1. Create `lib/api-spec/openapi.yaml` — keep `info.title: Api` (the
   filename of generated outputs depends on it).
2. Add `lib/api-spec/orval.config.ts` with two outputs:
   - **client** target → `@workspace/api-client-react` (React Query).
   - **zod** target → `@workspace/api-zod`.
3. Add the `codegen` script: `orval --config orval.config.ts`.

## 4. Build the API server (`artifacts/api-server`)

1. Create the artifact via the artifacts skill so an `artifact.toml`
   with `kind = "api"`, `paths = ["/api"]`, and a startup health probe
   (`/api/healthz`) is generated.
2. Add the Express + Drizzle dependencies (see
   `artifacts/api-server/package.json`).
3. Wire `src/index.ts` (read `PORT`, run `bootstrapDatabase()`,
   `app.listen`), `src/app.ts` (pino-http, CORS, JSON), and a
   `src/routes/index.ts` mounting health, workshops, sessions, events,
   moderator routers.
4. Implement each route, validating inputs with the generated Zod
   schemas, and emit events through `submissionsBus.emitSubmission(...)`
   for every mutation that the moderator UI cares about.
5. Implement the SSE handler exactly as in `routes/events.ts` — heartbeat
   every 25 s, optional `workshopCode` filter.
6. Implement `bootstrapDatabase()` so the app self-heals on first boot.

## 5. Generate the client + Zod packages

```sh
pnpm --filter @workspace/api-spec run codegen
```

This populates `lib/api-client-react/src` and `lib/api-zod/src`. They are
generated; do not hand-edit.

## 6. Build the frontend (`artifacts/scenario-simulator`)

1. Create the artifact (kind `web`, base path `/`). The react-vite
   integrated skill bootstraps Vite + Tailwind + Radix + the standard
   `src/components/ui/*` set.
2. Implement `src/App.tsx` with the wouter routes listed in
   `DOCUMENTATION.md` §4.
3. Add `src/data/data.ts` (scenario copy, stakeholder names, assets) and
   `src/data/moderatorData.ts` (status enums, note templates, types).
4. Implement the participant flow in `src/simulation/SimulationApp.tsx`
   driven by `current_screen`.
5. Implement the moderator dashboard (`src/pages/moderator.tsx`):
   - Subscribe to `/api/events?workshopCode=...` via `EventSource`.
   - On each event, invalidate the matching React Query keys.
   - Group teams by status (Attention → Slow → On track → Complete →
     Not started), show a 6-step progress bar with explicit "x/6"
     count, and a "time on step" derived from `updated_at`.
   - Drawer with full live session payload, notes history, access
     requests, and moderator actions.
   - Activity ticker with per-event icons, relative auto-updating
     timestamps, and chip filters (incl. "Submissions only"). Clicking
     a row opens the relevant team drawer scrolled to the relevant
     section.
6. Implement `src/pages/results.tsx` — read-only debrief over
   `/api/submissions?workshopCode=...`.

## 7. Wire workflows + deployment

1. Add Replit workflows for each artifact (the artifacts skill does
   this automatically when you create the artifact).
2. Add `scripts/post-merge.sh` — runs `pnpm --filter @workspace/db run
   push --force` after task merges so schema changes always land in the
   live DB.
3. The deployment is Autoscale (`router = "application"`) — no extra
   config required, the artifact tomls drive the build/serve commands.

## 8. Verify

```sh
pnpm run typecheck
pnpm --filter @workspace/db run push
# Restart workflows
```

Open the scenario-simulator preview, create a workshop, join it from
another tab, and watch the moderator dashboard update in real time.
