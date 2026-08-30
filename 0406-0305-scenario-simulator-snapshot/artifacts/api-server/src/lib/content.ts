import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    text: z.string(),
    level: z.number().int().min(1).max(3).optional(),
  }),
  z.object({ type: z.literal("paragraph"), text: z.string() }),
  z.object({
    type: z.literal("table"),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("keyValue"),
    items: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
  z.object({
    type: z.literal("callout"),
    text: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("list"),
    items: z.array(z.string()),
    ordered: z.boolean(),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string(),
    attribution: z.string(),
  }),
]);

export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  exerciseType: z.string(),
  timing: z.object({ defaultMinutes: z.number().positive() }),
  company: z.object({
    name: z.string(),
    descriptor: z.string(),
    logo: z.string(),
    overview: z.string(),
    facts: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
  situation: z.string(),
  stakeholders: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      blurb: z.string(),
      avatar: z.string(),
      sideNote: z.string(),
      askLimit: z.number().int().positive(),
      questions: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          answer: z.string(),
        }),
      ),
    }),
  ),
  evidence: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      teaser: z.string(),
      sourceLabel: z.string(),
      blocks: z.array(blockSchema),
    }),
  ),
  submission: z.object({
    prompt: z.string(),
    placeholder: z.string(),
    confidenceOptions: z.array(z.enum(["Low", "Medium", "High"])),
  }),
});

export type Scenario = z.infer<typeof scenarioSchema>;
export type EvidenceBlock = z.infer<typeof blockSchema>;

function contentRoot(): string {
  return process.env.CONTENT_DIR
    ? path.resolve(process.env.CONTENT_DIR)
    : path.resolve(process.cwd(), "content");
}

let cached: Scenario | null = null;

export function contentDir(): string {
  return contentRoot();
}

export function loadScenario(): Scenario {
  if (cached) return cached;
  const file = path.join(contentRoot(), "scenario.json");
  const raw = readFileSync(file, "utf8");
  cached = scenarioSchema.parse(JSON.parse(raw));
  return cached;
}

export function mediaUrl(filename: string): string {
  return `/content/media/${filename}`;
}
