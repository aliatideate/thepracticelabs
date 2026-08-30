# Cursor kickoff prompt

Paste this as your first message in Cursor, with the spec and the exported Replit project both in the workspace.

---

I'm building a live workshop tool that has to run a real client session on **Wednesday 2 September 2026**. I have three evenings. This is not a prototype — six teams of real participants at a paying client will use it. Reliability matters more than completeness.

## What's in this workspace

- `scenario-simulator-build-spec-v2.md` — **the specification. This is the source of truth.** Read it fully before doing anything else. Where it conflicts with the existing code, the spec wins.
- The exported Replit project — an existing partial build of this tool. It is a working demo, not a working exercise. See below.
- `the_Practice_Labs_Logo___Horizontal.svg` and `the_Practice_Labs_Logo-20.svg` — brand assets.
- A palette reference image.

## Do this first, and only this

1. Read the spec end to end.
2. Read the existing codebase, particularly `artifacts/scenario-simulator/src/data/data.ts`, `artifacts/scenario-simulator/src/simulation/`, `artifacts/api-server/src/routes/`, and `lib/db/src/schema/`.
3. Come back to me with:
   - A file-by-file plan of what you'll keep, change, and delete
   - Anything in the spec that's ambiguous, contradictory, or that the existing code can't support
   - Anything you think is a bad idea, and why

**Do not write or modify any code until I've approved that plan.** I'd rather spend twenty minutes agreeing on the approach than discover on Tuesday night that we built the wrong thing.

## Four things in the existing code that are broken and must not be preserved

These look intentional. They aren't.

1. **`functional: true/false` flags** in `data.ts`. Only Rohini and Retailer Complaints are live; the other three stakeholders and two evidence sources render as disabled cards. Remove the flag. All four stakeholders and all three evidence sources must work — this choice is the entire point of the exercise.
2. **The interview choices are cosmetic.** Each question has three options with one marked `happy`, but `handleSelect` fires the same authored response regardless of which is picked. This is being replaced entirely — see §6 of the spec.
3. **The flow tells participants the answer.** The per-question `learning` fields, plus `interviewInsights`, `retailerInsights`, `synthesis`, and the `insights` screen, state the conclusions before teams write their problem statement. Delete all of them. Teams must reach different conclusions independently.
4. **The timer is a hardcoded string** (`timeRemaining: "42:06"` in `data.ts`). A real shared countdown is needed.

## Non-negotiable requirements

- **Content is fully external.** No scenario content hard-coded anywhere. Everything loads from `content/scenario.json` at boot. The acceptance test: I replace that file, restart, and every screen changes with no code edit. I'm writing the real content in parallel and will hand it over later this week.
- **Build against a complete placeholder scenario** with the full shape from §9 — four stakeholders, four questions each with distinct answers, three evidence documents using every block type. Filler text is fine, stubs are not. Every code path must be exercised before real content arrives.
- **Refresh resilience.** A team reloading mid-exercise returns to their exact state — choices and interview history intact. Session state lives server-side, not in the browser.
- **No external API calls during a live session.** All content loaded at boot. No runtime AI of any kind.

## How I want you to work

- Work in the order set out in §14 of the spec — deployability first, then mechanics, then styling, then content.
- Small, reviewable changes. Tell me what you're about to do, do it, tell me what changed. Don't refactor several areas in one pass.
- If something in the spec would take significantly longer than it appears to, say so before starting rather than partway through.
- If you're uncertain about a product decision, ask. Don't pick a reasonable-looking default and move on.
- Flag anything you delete that you think I might want back.

Start with the plan.
