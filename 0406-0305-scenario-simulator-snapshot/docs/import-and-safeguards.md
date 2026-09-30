# Exercise import and safeguards

## Import

- **API:** `POST /api/create/exercises/import` (auth cookie required)
- **CLI:** `pnpm --filter @workspace/scripts run import:exercise -- …` (calls the API; needs `BASE_URL`, `CREATOR_EMAIL`, `CREATOR_PASSWORD`)
- **UI:** Activities → Import exercise

Body fields: `title` or `exerciseId`, `category`, `engine` (`investigation` | `branching`), `content` (JSON), optional `facilitatorNotes`, `variables`, `defaultAssets`.

Validation order (fail closed — no DB write on failure):

1. Category and engine enums
2. Engine Zod schema (`scenarioSchema` or `parseDecisionGameContent`)
3. Path-level Zod issues returned as `{ path, message }[]`
4. `validateTokenDeclarations` — every `{{token}}` must be declared; every declared variable must appear in content or notes

## Placeholder check (Step 7)

Already enforced on:

- Session create (`createWorkshopSession` in `routes/create.ts`)
- Import (API above)

Participants must never see raw `{{…}}` text in a frozen session.

## Client-copy version upgrade

The new-session wizard already:

1. Loads the latest published variable schema
2. Prefills values from the client’s older copy
3. Flags `orphanKeys` and `missingRequired`
4. Writes a new `client_copies` row on the next session create (upsert)

That is enough to review before a workshop. No separate “upgrade copy” button in this pass. Existing `workshop_sessions.resolved_content` rows stay frozen.

## Testing import

Do **not** treat `content/scenario.v2.json` / `decision-game.v2.json` alone as proof — they were shaped for these schemas. Use a rough draft of a real new exercise from Ali. If it cannot load without code changes, report the break points.
