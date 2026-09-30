/**
 * Minimal engine contract for the Creator shell.
 * Each engine exposes only: steps (board progress), done, and submission summary.
 * Player UI, scoring, and content schemas stay inside the engine modules.
 */

export type ExerciseEngine = "investigation" | "branching";

export type EngineStep = {
  key: string;
  label: string;
};

export type TeamProgressInput = {
  currentScreen?: string | null;
  submittedAt?: Date | string | null;
  /** Branching: reveal screen means done. Investigation: submittedAt. */
};

export type TeamSubmissionSummary = {
  done: boolean;
  /** Short human label for board / CSV progress column. */
  progress: string;
  /** Opaque summary for CSV / archives; engine-specific fields live elsewhere. */
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
    return {
      done,
      progress,
      summary: done ? "submitted" : progress,
    };
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
    return {
      done,
      progress,
      summary: done ? "reveal" : progress,
    };
  },
};

const REGISTRY: Record<ExerciseEngine, EngineDescriptor> = {
  investigation: investigationEngine,
  branching: branchingEngine,
};

export function engineOf(format: string): EngineDescriptor {
  if (format === "branching") return branchingEngine;
  if (format === "investigation") return investigationEngine;
  return investigationEngine;
}

export function isExerciseEngine(value: string): value is ExerciseEngine {
  return value === "investigation" || value === "branching";
}

export function allEngines(): EngineDescriptor[] {
  return Object.values(REGISTRY);
}

/** Shared CSV columns — same order/names for every engine export. */
export const SHARED_CSV_COLUMNS = [
  "client",
  "session",
  "exercise",
  "category",
  "engine",
  "team",
  "slot",
  "started_at",
  "ended_at",
  "progress",
  "submitted",
] as const;

export type SharedCsvContext = {
  client: string;
  session: string;
  exercise: string;
  category: string;
  engine: ExerciseEngine;
};

export type SharedCsvTeam = {
  team: string;
  slot: string;
  startedAt: string;
  endedAt: string;
  progress: string;
  submitted: "yes" | "no";
};

export function sharedCsvPrefix(
  ctx: SharedCsvContext,
  team: SharedCsvTeam,
): string[] {
  return [
    ctx.client,
    ctx.session,
    ctx.exercise,
    ctx.category,
    ctx.engine,
    team.team,
    team.slot,
    team.startedAt,
    team.endedAt,
    team.progress,
    team.submitted,
  ];
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
