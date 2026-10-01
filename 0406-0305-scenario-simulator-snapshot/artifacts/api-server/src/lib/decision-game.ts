import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { contentDir } from "./content";

const deferredSchema = z.object({
  headline: z.string(),
  standfirst: z.string(),
  weight: z.number(),
  outcome: z.enum(["good", "mixed", "bad"]).optional(),
});

const gradeKeySchema = z.enum(["best", "judgment", "okay", "poor", "worst"]);
const tagKeySchema = z.enum(["tooSlow", "tooFast"]);

const gradeSchema = z.object({
  grade: gradeKeySchema,
  tag: tagKeySchema.nullable(),
  rules: z.array(z.number().int().positive()),
  rationale: z.string(),
});

const optionSchema = z.object({
  id: z.enum(["A", "B", "call"]),
  label: z.string(),
  immediate: z.string(),
  deferred: deferredSchema,
  grade: gradeSchema,
  icon: z.string().optional(),
  facilitator: z
    .object({
      doorType: z.string(),
    })
    .optional(),
});

const decisionSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  location: z.object({ name: z.string() }),
  situation: z.string(),
  hotspot: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  options: z.array(optionSchema).length(3),
  facilitator: z
    .object({
      difficulty: z.string(),
      note: z.string(),
    })
    .optional(),
});

const gridSlotSchema = z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]);

const tagSchema = z.object({
  name: z.string(),
  zero: z.string(),
  withBranches: z.string(),
});

const styleLabelSchema = z.object({
  name: z.string(),
  grid: gridSlotSchema,
  description: z.string(),
  hover: z.string(),
  tip: z.string(),
  ideal: z.boolean().optional(),
  band: z.enum(["good", "mixed", "poor"]),
});

/** Player chrome — optional on stored/frozen content; required on import. */
export const decisionChromeSchema = z.object({
  startCta: z.string(),
  nextStopCta: z.string(),
  revealCta: z.string(),
  progress: z.string(),
  playbookButton: z.string(),
  travelOverlay: z.string(),
  managerHeading: z.string(),
  managerSubhead: z.string(),
  closing: z.string(),
  youChose: z.string(),
  discussLabel: z.string(),
  ruleLabel: z.string(),
  questionLine: z.string(),
  stopOne: z.string(),
  stopTwo: z.string(),
  stopMany: z.string(),
  /** Join-screen coaching; omit or "" to hide the callout. */
  joinTeamKicker: z.string().optional(),
  joinTeamCallout: z.string().optional(),
});

export type DecisionChrome = z.infer<typeof decisionChromeSchema>;

/** Current Mart wording — used when chrome is absent (legacy / frozen sessions). */
export const DEFAULT_MART_CHROME: DecisionChrome = {
  startCta: "Start the week",
  nextStopCta: "Next branch",
  revealCta: "See what happened",
  progress: "Branch {n} of {m}",
  playbookButton: "Playbook",
  travelOverlay: "On the road to {place}",
  managerHeading: "Your decisions and your manager's review of them",
  managerSubhead: "This is your manager's read, based on the company's field playbook.",
  closing: "When you are ready, return to the main workshop room ↗",
  youChose: "You chose",
  discussLabel: "Discuss",
  ruleLabel: "Rule {n}",
  questionLine: "Question {n} · {location}",
  stopOne: "Branch {n}",
  stopTwo: "Branches {a} and {b}",
  stopMany: "Branches {list} and {last}",
  joinTeamKicker: "Work as a team",
  joinTeamCallout:
    "Discuss each choice before you confirm. Once you pick a door, you cannot undo it.",
};

export function chromeOf(game: { chrome?: DecisionChrome | null }): DecisionChrome {
  return game.chrome ? { ...DEFAULT_MART_CHROME, ...game.chrome } : DEFAULT_MART_CHROME;
}

export const decisionGameSchema = z.object({
  scenario: z.object({
    id: z.string(),
    title: z.string(),
    exerciseType: z.literal("decision"),
  }),
  assets: z.object({
    sceneImage: z.string(),
    sceneImages: z.array(z.string()).min(1).optional(),
    travelImages: z.array(z.string()).min(1).optional(),
    doorImage: z.string(),
    phoneImage: z.string(),
  }),
  intro: z.object({
    role: z.string(),
    setting: z.string(),
    goal: z.string(),
  }),
  playbook: z.object({
    title: z.string(),
    rules: z.array(z.string()).min(1),
  }),
  decisions: z.array(decisionSchema).min(1),
  reveal: z.object({
    title: z.string(),
    masthead: z.string(),
    dateline: z.string(),
  }),
  /** Optional for frozen/legacy rows; import path requires it via parse opts. */
  chrome: decisionChromeSchema.optional(),
  scoring: z.object({
    grades: z.record(gradeKeySchema, z.object({ label: z.string(), points: z.number() })),
    maxPointsPerDecision: z.number(),
    tags: z.record(tagKeySchema, tagSchema),
    styles: z.object({
      operatorMaxLost: z.number(),
      bottleneckMinLostEach: z.number(),
      axes: z.object({
        columns: z.tuple([z.string(), z.string()]),
        rows: z.tuple([z.string(), z.string()]),
      }),
      labels: z.object({
        operator: styleLabelSchema,
        escalator: styleLabelSchema,
        cowboy: styleLabelSchema,
        bottleneck: styleLabelSchema,
      }),
    }),
    ui: z.object({
      styleHeading: z.string(),
      thisWeek: z.string(),
      weekBoth: z.string(),
      weekSlow: z.string(),
      weekFast: z.string(),
      weekClear: z.string(),
      suggestion: z.string(),
      yourStyle: z.string(),
      idealMarker: z.string(),
      resultMarker: z.string(),
      rightPlace: z.string(),
    }),
  }),
});

export type DecisionGame = z.infer<typeof decisionGameSchema>;
export type DecisionGamePublic = ReturnType<typeof stripHidden>;

function stripHidden(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripHidden);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === "facilitator" || key === "grade" || key === "scoring") continue;
      out[key] = stripHidden(nested);
    }
    return out;
  }
  return value;
}

let cached: DecisionGame | null = null;

export type ParseDecisionGameOptions = {
  /** When true (exercise import), chrome must be present and complete. */
  requireChrome?: boolean;
};

/** Parse + enforce branching invariants. Throws Error with path-ish messages. */
export function parseDecisionGameContent(
  raw: unknown,
  opts: ParseDecisionGameOptions = {},
): DecisionGame {
  const parsed = decisionGameSchema.parse(raw);
  if (opts.requireChrome) {
    const chromeResult = decisionChromeSchema.safeParse(
      raw && typeof raw === "object" ? (raw as { chrome?: unknown }).chrome : undefined,
    );
    if (!chromeResult.success) {
      const detail = chromeResult.error.issues
        .map((i) => `${["chrome", ...i.path].join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(detail || "chrome is required on import");
    }
  }
  const orders = parsed.decisions.map((d) => d.order);
  if (new Set(orders).size !== orders.length) {
    throw new Error("decisions[].order must be unique");
  }
  parsed.decisions = [...parsed.decisions].sort((a, b) => a.order - b.order);
  const ruleCount = parsed.playbook.rules.length;
  const gradeKeys = new Set(Object.keys(parsed.scoring.grades));
  for (const key of ["best", "judgment", "okay", "poor", "worst"] as const) {
    if (!gradeKeys.has(key)) throw new Error(`scoring.grades missing ${key}`);
  }
  for (const [tagKey, tag] of Object.entries(parsed.scoring.tags)) {
    const template = tag.withBranches;
    const hasStops = template.includes("{stops}");
    const hasBranches = template.includes("{branches}");
    if (!hasStops && !hasBranches) {
      throw new Error(
        `scoring.tags.${tagKey}.withBranches must contain {stops} (or legacy {branches})`,
      );
    }
  }
  const grids = Object.entries(parsed.scoring.styles.labels).map(([key, label]) => {
    if (!label.name || !label.grid || !label.description || !label.hover || !label.tip) {
      throw new Error(`scoring.styles.labels.${key} needs name, grid, description, hover and tip`);
    }
    return label.grid;
  });
  if (new Set(grids).size !== 4) {
    throw new Error("each style grid position must be used exactly once");
  }
  const ideals = Object.values(parsed.scoring.styles.labels).filter((label) => label.ideal === true);
  if (ideals.length > 1) {
    throw new Error("at most one style can have ideal: true");
  }
  for (const decision of parsed.decisions) {
    for (const option of decision.options) {
      const points = parsed.scoring.grades[option.grade.grade]?.points;
      if (points === undefined) {
        throw new Error(`unknown grade ${option.grade.grade} on ${decision.id}/${option.id}`);
      }
      if (points < parsed.scoring.maxPointsPerDecision && option.grade.tag == null) {
        throw new Error(
          `${decision.id}/${option.id} scores below maxPointsPerDecision and needs a tag`,
        );
      }
      for (const rule of option.grade.rules) {
        if (rule < 1 || rule > ruleCount) {
          throw new Error(`${decision.id}/${option.id} has invalid playbook rule ${rule}`);
        }
      }
    }
  }
  return parsed;
}

export function loadDecisionGame(): DecisionGame {
  if (cached) return cached;
  const file = path.join(contentDir(), "decision-game.json");
  const raw = readFileSync(file, "utf8");
  cached = parseDecisionGameContent(JSON.parse(raw));
  return cached;
}

export function publicDecisionGame(): unknown {
  return stripHidden(loadDecisionGame());
}

/** Strip facilitator-only fields from any decision-game JSON (file or resolved_content). */
export function asPublicDecisionGame(game: unknown): unknown {
  return stripHidden(game);
}

export function facilitatorDecisionGame(): DecisionGame {
  return loadDecisionGame();
}
