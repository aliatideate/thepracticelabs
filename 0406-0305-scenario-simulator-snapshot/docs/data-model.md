# Data model

All schema definitions live in [`lib/db/src/schema/`](../lib/db/src/schema).
Run `pnpm --filter @workspace/db run push` to apply changes locally.

## ER overview

```
workshops 1 ──< sessions 1 ──< moderator_notes
                         └──< access_requests
```

Cascade deletes flow from `workshops → sessions → notes/access_requests`.

## `workshops`

| Column      | Type           | Notes |
| ----------- | -------------- | ----- |
| `id`        | `uuid` PK      | `defaultRandom()` |
| `code`      | `text` UNIQUE  | Short share code (e.g. `ABCD`) |
| `label`     | `text`         | Human label |
| `created_at`| `timestamptz`  | `defaultNow()` |

A `DEFAULT` workshop is seeded by the bootstrap so legacy sessions
always have a parent.

## `sessions`

One row per `(workshop_id, team_name)`. The `unique("sessions_workshop_team_unique")`
constraint enforces this.

| Column                       | Type           | Notes |
| ---------------------------- | -------------- | ----- |
| `id`                         | `uuid` PK      | |
| `workshop_id`                | `uuid` FK → `workshops.id` (cascade) | |
| `team_name`                  | `text`         | UNIQUE with `workshop_id` |
| `current_screen`             | `text`         | Drives the participant state machine. Default `"company"`. |
| `selected_stakeholder`       | `text` nullable | |
| `selected_evidence_source`   | `text` nullable | |
| `answers`                    | `jsonb` `AnswerRecord[]` | `{ questionId, selected: "A" \| "B" \| "C" }[]` |
| `problem_statement`          | `text`         | default `""` |
| `confidence`                 | `text` enum `Low \| Medium \| High` nullable | |
| `assumption`                 | `text`         | default `""` |
| `flagged_for_debrief`        | `boolean`      | default `false` |
| `submitted_at`               | `timestamptz` nullable | Set by `POST /sessions/:id/submit` |
| `created_at` / `updated_at`  | `timestamptz`  | `updated_at` is bumped on every mutation; the moderator dashboard derives "time on step" from it. |

## `moderator_notes`

| Column         | Type           | Notes |
| -------------- | -------------- | ----- |
| `id`           | `uuid` PK      | |
| `session_id`   | `uuid` FK → `sessions.id` (cascade) | |
| `message`      | `text`         | |
| `template_id`  | `text` nullable | One of the preset ids in `moderatorData.ts` |
| `created_at`   | `timestamptz`  | |
| `dismissed_at` | `timestamptz` nullable | Set when participant dismisses |

## `access_requests`

| Column         | Type           | Notes |
| -------------- | -------------- | ----- |
| `id`           | `uuid` PK      | |
| `session_id`   | `uuid` FK → `sessions.id` (cascade) | |
| `status`       | `text` enum `pending \| granted \| declined` | default `pending` |
| `created_at`   | `timestamptz`  | |
| `responded_at` | `timestamptz` nullable | |

Has a **partial unique index**:

```sql
CREATE UNIQUE INDEX access_requests_pending_per_session
  ON access_requests (session_id) WHERE status = 'pending';
```

This guarantees at most one pending request per session even under
concurrent writes. The `POST` endpoint relies on it via
`INSERT … ON CONFLICT DO NOTHING` plus a re-fetch.
