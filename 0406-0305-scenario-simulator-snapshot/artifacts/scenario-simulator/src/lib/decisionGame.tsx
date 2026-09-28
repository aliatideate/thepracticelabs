import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

export type GradeKey = "best" | "judgment" | "okay" | "poor" | "worst";
export type TagKey = "tooSlow" | "tooFast";
export type StyleKey = "operator" | "escalator" | "cowboy" | "bottleneck";
export type GridSlot = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface DecisionOption {
  id: "A" | "B" | "call";
  label: string;
  immediate: string;
  deferred: { headline: string; standfirst: string; weight: number; outcome?: "good" | "mixed" | "bad" };
  grade?: {
    grade: GradeKey;
    tag: TagKey | null;
    rules: number[];
    rationale: string;
  };
  facilitator?: { doorType: string };
  icon?: string;
}

export interface DecisionItem {
  id: string;
  order: number;
  location: { name: string };
  situation: string;
  hotspot: { x: number; y: number; w: number; h: number };
  options: DecisionOption[];
  facilitator?: { difficulty: string; note: string };
}

export interface Scoring {
  grades: Record<GradeKey, { label: string; points: number }>;
  maxPointsPerDecision: number;
  tags: Record<TagKey, { name: string; zero: string; withBranches: string }>;
  styles: {
    operatorMaxLost: number;
    bottleneckMinLostEach: number;
    axes: {
      columns: [string, string];
      rows: [string, string];
    };
    labels: Record<StyleKey, { name: string; grid: GridSlot; description: string; hover?: string; tip: string; ideal?: boolean; band: "good" | "mixed" | "poor" }>;
  };
  ui: {
    styleHeading: string;
    thisWeek: string;
    weekBoth?: string;
    weekSlow?: string;
    weekFast?: string;
    weekClear?: string;
    suggestion: string;
    yourStyle: string;
    idealMarker: string;
    resultMarker: string;
    rightPlace: string;
  };
}

export interface DecisionGame {
  scenario: { id: string; title: string; exerciseType: string };
  assets: { sceneImage: string; sceneImages?: string[]; travelImages?: string[]; doorImage: string; phoneImage: string };
  intro: { role: string; setting: string; goal: string };
  playbook: { title: string; rules: string[] };
  decisions: DecisionItem[];
  reveal: { title: string; masthead: string; dateline: string };
  scoring?: Scoring;
}

export interface RevealPayload {
  stories: Array<{
    headline: string;
    standfirst: string;
    weight: number;
    outcome?: "good" | "mixed" | "bad";
    optionId: string;
    decisionId: string;
  }>;
  breakdown: Array<{
    decisionId: string;
    order: number;
    location: string;
    situation: string;
    optionId: string | null;
    optionLabel: string | null;
    gradeKey: GradeKey | null;
    gradeLabel: string | null;
    tag: TagKey | null;
    tagLabel: string | null;
    rules: number[];
    rationale: string | null;
    points: number | null;
  }>;
  score: {
    total: number;
    maxTotal: number;
    slowLost: number;
    fastLost: number;
    style: StyleKey;
    styleLabel: { name: string; grid: GridSlot; description: string; tip: string; ideal?: boolean };
  };
  slowLine: string;
  fastLine: string;
  weekLine?: string;
  scoring: Scoring;
}

const Ctx = createContext<DecisionGame | null>(null);

export function DecisionGameProvider({
  children,
  code,
}: {
  children: React.ReactNode;
  /** workshop_sessions.workshop_code; omit for MART / legacy */
  code?: string;
}) {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["decision-game", code ?? "MART", "copy-v3"],
    queryFn: async () => {
      const qs = code ? `?code=${encodeURIComponent(code)}` : "";
      const res = await fetch(`/api/decision-game${qs}`);
      if (!res.ok) throw new Error("Failed to load decision game");
      return (await res.json()) as DecisionGame;
    },
    staleTime: Infinity,
  });
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#6E625A] text-white flex items-center justify-center">
        Loading game…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#6E625A] text-white flex items-center justify-center p-8 text-center">
        Could not load the decision game. Check the API is running.
      </div>
    );
  }
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useDecisionGame(): DecisionGame {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDecisionGame must be used inside DecisionGameProvider");
  return ctx;
}

export function sceneSrc(game: DecisionGame, decision: DecisionItem) {
  const scenes = game.assets.sceneImages?.length ? game.assets.sceneImages : [game.assets.sceneImage];
  return scenes[(decision.order - 1) % scenes.length];
}

export function optionIconSrc(
  game: DecisionGame,
  decision: DecisionItem,
  option: DecisionOption,
) {
  if (option.icon) return option.icon;
  const slot = option.id === "A" ? 1 : option.id === "B" ? 2 : 3;
  return `/content/media/options/Q${decision.order}0${slot}.png`;
}

export function travelSrc(game: DecisionGame, destination: DecisionItem) {
  const imgs = game.assets.travelImages;
  if (!imgs?.length) return null;
  return imgs[(Math.max(0, destination.order - 2)) % imgs.length];
}

export function placeName(locationName: string) {
  const i = locationName.lastIndexOf(",");
  return (i >= 0 ? locationName.slice(i + 1) : locationName).trim();
}

export function revealStories(game: DecisionGame, choices: { decisionId: string; optionId: string }[]) {
  return choices
    .map((c) => {
      const d = game.decisions.find((x) => x.id === c.decisionId);
      const o = d?.options.find((x) => x.id === c.optionId);
      if (!o) return null;
      return { ...o.deferred, optionId: c.optionId, decisionId: c.decisionId };
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => b.weight - a.weight);
}

export function gradeTone(key: GradeKey | null) {
  if (key === "best") return "#2F9E44";
  if (key === "worst") return "#C0392B";
  if (key === "poor") return "#C05621";
  if (key === "okay") return "#E0A106";
  if (key === "judgment") return "#5B5B72";
  return "#8A8378";
}
