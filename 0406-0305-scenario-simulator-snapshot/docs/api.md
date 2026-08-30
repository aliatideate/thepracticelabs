# API reference

All endpoints are mounted under `/api`. The single source of truth is
[`lib/api-spec/openapi.yaml`](../lib/api-spec/openapi.yaml). Use that
spec (or the generated React hooks / Zod schemas) for exact field
shapes; this file is a high-level summary.

## Health

| Method | Path        | Purpose |
| ------ | ----------- | ------- |
| GET    | `/healthz`  | Returns `{ ok: true }`. Used by the deployment startup probe. |

## Workshops

| Method | Path                  | Purpose |
| ------ | --------------------- | ------- |
| GET    | `/workshops`          | List all workshops, newest first. |
| POST   | `/workshops`          | Create a workshop. `code` is auto-generated when omitted. Returns `409` on collision. |
| GET    | `/workshops/{code}`   | Look up a workshop by its short code. |

## Sessions

| Method | Path                              | Purpose |
| ------ | --------------------------------- | ------- |
| GET    | `/sessions`                       | List all team sessions, ordered by team name. Accepts `?workshopCode=` to scope. |
| POST   | `/sessions`                       | Create or resume a session by `(workshopCode, teamName)`. Idempotent. |
| GET    | `/sessions/{id}`                  | Read full session row. |
| PATCH  | `/sessions/{id}`                  | Partial update. Bumps `updated_at`. Emits `submission.updated`. |
| DELETE | `/sessions/{id}`                  | Delete a session. Emits `submission.deleted`. |
| POST   | `/sessions/{id}/reset`            | Reset progress while keeping the team. |
| POST   | `/sessions/{id}/submit`           | Mark `submitted_at`. Emits `submission.created`. |
| POST   | `/sessions/{id}/flag`             | Toggle `flagged_for_debrief`. Emits `flag.changed`. |

## Submissions

| Method | Path             | Purpose |
| ------ | ---------------- | ------- |
| GET    | `/submissions`   | List submitted sessions, oldest first. Used by `/results/:code`. |

## Moderator notes

| Method | Path                          | Purpose |
| ------ | ----------------------------- | ------- |
| GET    | `/sessions/{id}/notes`        | List notes for a team. |
| POST   | `/sessions/{id}/notes`        | Send a note to one team. Emits `note.created`. |
| POST   | `/notes/broadcast`            | Send the same note to every team in a workshop. |
| POST   | `/notes/{id}/dismiss`         | Participant marks a note as read. Emits `note.dismissed`. |

## Access requests

| Method | Path                                       | Purpose |
| ------ | ------------------------------------------ | ------- |
| GET    | `/sessions/{id}/access-requests`           | List access requests for a team. |
| POST   | `/sessions/{id}/access-requests`           | Moderator asks for screen access. Idempotent — returns the existing pending request if one already exists (enforced by a partial unique index). Emits `access.requested`. |
| POST   | `/access-requests/{id}/respond`            | Participant accepts or declines. Emits `access.responded`. |

## Events (SSE)

`GET /api/events?workshopCode=ABCD` opens a `text/event-stream` that
emits these event types:

| Event type             | Payload (in addition to `sessionId`, `at`, `workshopId`, `workshopCode`) |
| ---------------------- | ------------------------------------------------------------------------ |
| `submission.created`   | — |
| `submission.updated`   | — |
| `submission.deleted`   | — |
| `note.created`         | `noteId` |
| `note.dismissed`       | `noteId` |
| `flag.changed`         | `flagged: boolean` |
| `access.requested`     | `requestId`, `status` |
| `access.responded`     | `requestId`, `status` |

The server writes a `: heartbeat <ts>` comment every 25 s to keep
proxies from closing the connection. The client filters by
`workshopCode` so a moderator only receives events for their own
workshop.
