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

export function loadDecisionGame(): DecisionGame {
  if (cached) return cached;
  const file = path.join(contentDir(), "decision-game.json");
  const raw = readFileSync(file, "utf8");
  cached = decisionGameSchema.parse(JSON.parse(raw));
  const orders = cached.decisions.map((d) => d.order);
  if (new Set(orders).size !== orders.length) {
    throw new Error("decision-game.json: decisions[].order must be unique");
  }
  cached.decisions = [...cached.decisions].sort((a, b) => a.order - b.order);
  const ruleCount = cached.playbook.rules.length;
  const gradeKeys = new Set(Object.keys(cached.scoring.grades));
  for (const key of ["best", "judgment", "okay", "poor", "worst"] as const) {
    if (!gradeKeys.has(key)) throw new Error(`decision-game.json: scoring.grades missing ${key}`);
  }
  for (const [tagKey, tag] of Object.entries(cached.scoring.tags)) {
    if (!tag.withBranches.includes("{branches}")) {
      throw new Error(`decision-game.json: scoring.tags.${tagKey}.withBranches must contain {branches}`);
    }
  }
  const grids = Object.entries(cached.scoring.styles.labels).map(([key, label]) => {
    if (!label.name || !label.grid || !label.description || !label.hover || !label.tip) {
      throw new Error(`decision-game.json: scoring.styles.labels.${key} needs name, grid, description, hover and tip`);
    }
    return label.grid;
  });
  if (new Set(grids).size !== 4) {
    throw new Error("decision-game.json: each style grid position must be used exactly once");
  }
  const ideals = Object.values(cached.scoring.styles.labels).filter((label) => label.ideal === true);
  if (ideals.length > 1) {
    throw new Error("decision-game.json: at most one style can have ideal: true");
  }
  for (const decision of cached.decisions) {
    for (const option of decision.options) {
      const points = cached.scoring.grades[option.grade.grade]?.points;
      if (points === undefined) {
        throw new Error(`decision-game.json: unknown grade ${option.grade.grade} on ${decision.id}/${option.id}`);
      }
      if (points < cached.scoring.maxPointsPerDecision && option.grade.tag == null) {
        throw new Error(
          `decision-game.json: ${decision.id}/${option.id} scores below maxPointsPerDecision and needs a tag`,
        );
      }
      for (const rule of option.grade.rules) {
        if (rule < 1 || rule > ruleCount) {
          throw new Error(`decision-game.json: ${decision.id}/${option.id} has invalid playbook rule ${rule}`);
        }
      }
    }
  }
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
