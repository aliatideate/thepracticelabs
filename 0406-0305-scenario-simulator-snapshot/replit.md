# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/scripts run snapshot` — produce `dist/scenario-simulator-snapshot.tar.gz`, a self-contained source archive for later recreation

## Documentation

- `DOCUMENTATION.md` — top-level product + tech overview, written so a future
  developer (or agent) can rebuild the app from scratch
- `docs/architecture.md` — system architecture and live-update flow
- `docs/api.md` — full HTTP + SSE surface
- `docs/data-model.md` — Postgres schema in detail
- `docs/rebuild-from-scratch.md` — ordered, step-by-step rebuild guide

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
