# Facilitator View Remotion Video

Standalone Remotion project for a silent facilitator-dashboard animation of the Demand Spike exercise.

## Commands

```bash
npm install
npm run studio
npm run stills
npm run render:16x9
npm run render:1x1
```

The 16:9 composition is the primary deliverable:

- `FacilitatorView-16x9`: 1920x1080, 30fps, 28 seconds
- `FacilitatorView-1x1`: 1080x1080, 30fps, 28 seconds

## What The Video Shows

- A tall, fixed Practice Labs header with the supplied logo.
- Demand Spike facilitator dashboard with teams joining the exercise.
- Team progress through Brief, Stakeholder, Interview, Evidence, Define, and Submit.
- A focused attention-request moment for The Wizards.
- Final problem-statement comparison across all teams.

## Data Used

The animation is deterministic and hardcoded for video. It uses representative names, progress timing, emojis from the app's allowed set, and drafted problem statements.

Source references:

- `0406-0305-scenario-simulator-snapshot/artifacts/scenario-simulator/src/index.css`
- `0406-0305-scenario-simulator-snapshot/artifacts/scenario-simulator/src/simulation/components.tsx`
- `0406-0305-scenario-simulator-snapshot/artifacts/scenario-simulator/src/pages/facilitate.tsx`
- `0406-0305-scenario-simulator-snapshot/artifacts/scenario-simulator/src/lib/constants.ts`
- `0406-0305-scenario-simulator-snapshot/artifacts/scenario-simulator/src/lib/engineContract.ts`
- `0406-0305-scenario-simulator-snapshot/content/scenario.json`
- `0406-0305-scenario-simulator-snapshot/content/media/*`
- User-supplied logo asset: `/Users/alimurtaza/Downloads/logo-practice-labs.png`

## Simplifications

- No live app state, API calls, or auth are required.
- Team activity is generated from scripted timeline data in `src/data/demoData.ts`.
- Team cards are simplified from the app's full table view to keep the animation readable at video scale.
- The 1:1 composition is included for square/social exports, but the first required render is the 16:9 MP4.
