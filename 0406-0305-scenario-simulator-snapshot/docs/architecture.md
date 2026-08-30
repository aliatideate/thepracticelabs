# Architecture

```
┌────────────────────────┐         HTTPS (path-routed proxy)
│  Browser (React SPA)   │ ─────────────────────────────────────────┐
│  scenario-simulator    │                                          │
│  - wouter router       │                                          ▼
│  - React Query cache   │                          ┌──────────────────────────────┐
│  - EventSource(/api/   │ ◄──── SSE events ──────  │   Express API (api-server)   │
│      events?workshop=) │                          │   - /api/* routes            │
└────────┬───────────────┘                          │   - submissionsBus           │
         │ fetch (REST)                             │   - bootstrapDatabase()      │
         ▼                                          └──────────────┬───────────────┘
   /api/* handlers                                                 │
                                                                   │ SQL (pg pool)
                                                                   ▼
                                                       ┌────────────────────────┐
                                                       │   PostgreSQL 16        │
                                                       │   workshops            │
                                                       │   sessions             │
                                                       │   moderator_notes      │
                                                       │   access_requests      │
                                                       └────────────────────────┘
```

## Live update loop

1. A participant submits a screen → `PATCH /api/sessions/:id` (or `POST
   /api/sessions/:id/submit`).
2. The route handler writes to Postgres, then calls
   `submissionsBus.emitSubmission({ type: "submission.updated", … })`.
3. Every connected `/api/events` SSE client receives the event (filtered
   by `workshopCode`).
4. The moderator dashboard listens for the event in
   `pages/moderator.tsx` and calls `queryClient.invalidateQueries(...)`
   on the affected query key (e.g. `getListSessionsQueryKey({ workshopCode })`).
5. React Query refetches, the moderator UI re-renders.

The same pattern is used for moderator notes (`note.created`,
`note.dismissed`), debrief flags (`flag.changed`), and screen-access
requests (`access.requested`, `access.responded`).

## Why SSE instead of WebSockets

SSE is one-way (server → client), automatically reconnects, works over
plain HTTP/2, and needs no extra dependencies in either Node or the
browser. The moderator and participant clients only need to *react* to
server changes; they push their own state through normal REST calls.

## Why contract-first (OpenAPI + Orval)

`lib/api-spec/openapi.yaml` is the single source of truth.

- The server validates inbound requests against generated Zod schemas
  (`@workspace/api-zod`).
- The client never hand-writes `fetch` calls — it uses the generated
  React Query hooks (`@workspace/api-client-react`) which gives every
  endpoint typed inputs/outputs and consistent query keys.

This means renaming an endpoint, adding a field, or tightening a
validation is a one-file change followed by `pnpm --filter
@workspace/api-spec run codegen`. TypeScript then surfaces every
caller that needs to be updated.
