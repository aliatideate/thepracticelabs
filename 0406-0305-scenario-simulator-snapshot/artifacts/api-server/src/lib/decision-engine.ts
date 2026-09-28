import type { DecisionChoice } from "@workspace/db";
import type { DecisionGame } from "./decision-game";

export function optionFor(game: DecisionGame, decisionId: string, optionId: string) {
  const decision = game.decisions.find((d) => d.id === decisionId);
  const option = decision?.options.find((o) => o.id === optionId);
  return { decision, option };
}

export type StyleKey = "operator" | "escalator" | "cowboy" | "bottleneck";

export function scoreOf(game: DecisionGame, choices: DecisionChoice[]) {
  let total = 0;
  let slowLost = 0;
  let fastLost = 0;
  for (const choice of choices) {
    const { option } = optionFor(game, choice.decisionId, choice.optionId);
    if (!option) continue;
    const points = game.scoring.grades[option.grade.grade]?.points ?? 0;
    const lost = game.scoring.maxPointsPerDecision - points;
    total += points;
    if (option.grade.tag === "tooSlow") slowLost += lost;
    if (option.grade.tag === "tooFast") fastLost += lost;
  }
  const { operatorMaxLost, bottleneckMinLostEach, labels } = game.scoring.styles;
  let key: StyleKey;
  if (slowLost + fastLost <= operatorMaxLost) key = "operator";
  else if (slowLost >= bottleneckMinLostEach && fastLost >= bottleneckMinLostEach) key = "bottleneck";
  else if (slowLost >= fastLost) key = "escalator";
  else key = "cowboy";
  const maxTotal = game.scoring.maxPointsPerDecision * game.decisions.length;
  return {
    total,
    maxTotal,
    slowLost,
    fastLost,
    style: key,
    styleLabel: labels[key],
  };
}

export function formatBranchList(orders: number[]) {
  const unique = [...new Set(orders)].sort((a, b) => a - b);
  if (unique.length === 0) return "";
  if (unique.length === 1) return `Branch ${unique[0]}`;
  if (unique.length === 2) return `Branches ${unique[0]} and ${unique[1]}`;
  return `Branches ${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
}

export function tagLine(game: DecisionGame, choices: DecisionChoice[], tag: "tooSlow" | "tooFast") {
  const orders: number[] = [];
  for (const choice of choices) {
    const { decision, option } = optionFor(game, choice.decisionId, choice.optionId);
    if (!decision || !option) continue;
    if (option.grade.grade === "judgment") continue;
    if (option.grade.tag !== tag) continue;
    const points = game.scoring.grades[option.grade.grade]?.points ?? 0;
    if (points >= game.scoring.maxPointsPerDecision) continue;
    orders.push(decision.order);
  }
  const spec = game.scoring.tags[tag];
  if (orders.length === 0) return spec.zero;
  return spec.withBranches.replace("{branches}", formatBranchList(orders));
}

function taggedCount(game: DecisionGame, choices: DecisionChoice[], tag: "tooSlow" | "tooFast") {
  let count = 0;
  for (const choice of choices) {
    const { option } = optionFor(game, choice.decisionId, choice.optionId);
    if (!option) continue;
    if (option.grade.grade === "judgment") continue;
    if (option.grade.tag !== tag) continue;
    const points = game.scoring.grades[option.grade.grade]?.points ?? 0;
    if (points >= game.scoring.maxPointsPerDecision) continue;
    count += 1;
  }
  return count;
}

export function weekLine(game: DecisionGame, choices: DecisionChoice[]) {
  const slow = taggedCount(game, choices, "tooSlow") > 0;
  const fast = taggedCount(game, choices, "tooFast") > 0;
  const ui = game.scoring.ui;
  if (slow && fast) return ui.weekBoth;
  if (slow) return ui.weekSlow;
  if (fast) return ui.weekFast;
  return ui.weekClear;
}

export function revealStories(game: DecisionGame, choices: DecisionChoice[]) {
  return choices
    .map((choice) => {
      const { option } = optionFor(game, choice.decisionId, choice.optionId);
      if (!option) return null;
      return { ...option.deferred, optionId: choice.optionId, decisionId: choice.decisionId };
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => b.weight - a.weight);
}

export function revealBreakdown(game: DecisionGame, choices: DecisionChoice[]) {
  return game.decisions.map((decision) => {
    const choice = choices.find((c) => c.decisionId === decision.id);
    const option = decision.options.find((o) => o.id === choice?.optionId);
    const grade = option?.grade;
    const points = grade ? game.scoring.grades[grade.grade]?.points ?? null : null;
    return {
      decisionId: decision.id,
      order: decision.order,
      location: decision.location.name,
      situation: decision.situation,
      optionId: choice?.optionId ?? null,
      optionLabel: option?.label ?? null,
      gradeKey: grade?.grade ?? null,
      gradeLabel: grade ? game.scoring.grades[grade.grade]?.label ?? null : null,
      tag: grade?.tag ?? null,
      tagLabel: grade?.tag ? game.scoring.tags[grade.tag]?.name ?? null : null,
      rules: grade?.rules ?? [],
      rationale: grade?.rationale ?? null,
      points,
    };
  });
}
