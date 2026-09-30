/**
 * Client mirror of api-server engine-contract.
 * Shell reads steps / done / progress; engines own player + detail UI.
 */

export type ExerciseEngine = "investigation" | "branching";

export type EngineStep = { key: string; label: string };

export type TeamProgressInput = {
  currentScreen?: string | null;
  submittedAt?: string | null;
};

export type TeamSubmissionSummary = {
  done: boolean;
  progress: string;
  summary: string;
};

export type EngineDescriptor = {
  format: ExerciseEngine;
  label: string;
  defaultDurationMinutes: number;
  steps: EngineStep[];
  printPath: (workshopCode: string) => string | null;
  progressOf: (team: TeamProgressInput) => TeamSubmissionSummary;
};

const INVESTIGATION_STEPS: EngineStep[] = [
  { key: "brief", label: "Brief" },
  { key: "stakeholder", label: "Stakeholder" },
  { key: "interview", label: "Interview" },
  { key: "evidence", label: "Evidence" },
  { key: "define", label: "Define" },
  { key: "submit", label: "Submit" },
];

const BRANCHING_STEPS: EngineStep[] = [
  { key: "intro", label: "Intro" },
  { key: "play", label: "Decisions" },
  { key: "reveal", label: "Reveal" },
];

function screenLabel(steps: EngineStep[], screen: string | null | undefined): string {
  if (!screen) return steps[0]?.label ?? "—";
  const hit = steps.find((s) => s.key === screen);
  if (hit) return hit.label;
  return screen.charAt(0).toUpperCase() + screen.slice(1);
}

export const investigationEngine: EngineDescriptor = {
  format: "investigation",
  label: "Investigation",
  defaultDurationMinutes: 30,
  steps: INVESTIGATION_STEPS,
  printPath: (code) => `/s/${code}/print`,
  progressOf(team) {
    const done = Boolean(team.submittedAt);
    const progress = done
      ? "Submitted"
      : screenLabel(INVESTIGATION_STEPS, team.currentScreen);
    return { done, progress, summary: done ? "submitted" : progress };
  },
};

export const branchingEngine: EngineDescriptor = {
  format: "branching",
  label: "Branching",
  defaultDurationMinutes: 15,
  steps: BRANCHING_STEPS,
  printPath: () => null,
  progressOf(team) {
    const screen = team.currentScreen ?? "intro";
    const done = screen === "reveal" || Boolean(team.submittedAt);
    const progress = done ? "Reveal" : screenLabel(BRANCHING_STEPS, screen);
    return { done, progress, summary: done ? "reveal" : progress };
  },
};

export function engineOf(format: string): EngineDescriptor {
  if (format === "branching") return branchingEngine;
  return investigationEngine;
}

export function formatEngineLabel(format: string): string {
  return engineOf(format).label;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "problem-framing": "Problem framing",
  "decision-making": "Decision-making",
  ideation: "Ideation",
  prototyping: "Prototyping",
};

export function formatCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** Engines that have player + facilitator code today. */
export const BUILT_ENGINES: ExerciseEngine[] = ["investigation", "branching"];
