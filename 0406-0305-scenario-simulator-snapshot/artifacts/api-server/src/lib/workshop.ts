export const WORKSHOP_CODE = "DEFAULT";
export const TEAM_NAMES = [
  "Team 1",
  "Team 2",
  "Team 3",
  "Team 4",
  "Team 5",
  "Team 6",
  "Team 7",
  "Team 8",
  "Team 9",
  "Team 10",
] as const;
export type TeamName = (typeof TEAM_NAMES)[number];

export const TEAM_EMOJIS = [
  "🦁",
  "🐯",
  "🐻",
  "🦊",
  "🐺",
  "🐼",
  "🦄",
  "🐙",
  "🦅",
  "🦈",
  "🐝",
  "🐢",
  "🌊",
  "⚡",
  "🔥",
  "🌟",
  "🧭",
  "🎯",
  "🚀",
  "🧩",
] as const;
export type TeamEmoji = (typeof TEAM_EMOJIS)[number];

export function isAllowedTeamName(name: string): name is TeamName {
  return (TEAM_NAMES as readonly string[]).includes(name);
}

export function isAllowedTeamEmoji(emoji: string): emoji is TeamEmoji {
  return (TEAM_EMOJIS as readonly string[]).includes(emoji);
}

export function normalizeDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 24) return null;
  return name;
}

export const DEMAND_TRY_WORKSHOP_CODE = "DEMAND-TRY";
export const MART_WORKSHOP_CODE = "MART";
export const MART_TRY_WORKSHOP_CODE = "MART-TRY";
export const MART_DURATION_MINUTES = 15;

export function facilitatorSecret(): string {
  return process.env.FACILITATOR_SECRET ?? "unilever-s1";
}

export function checkFacilitatorSecret(reqSecret: string | undefined): boolean {
  return !!reqSecret && reqSecret === facilitatorSecret();
}

export function decisionFacilitatorSecret(): string {
  return process.env.FACILITATOR_SECRET_S2 ?? "unilever-s2";
}

export function checkDecisionFacilitatorSecret(reqSecret: string | undefined): boolean {
  return !!reqSecret && reqSecret === decisionFacilitatorSecret();
}

export function checkAnyFacilitatorSecret(reqSecret: string | undefined): boolean {
  return checkFacilitatorSecret(reqSecret) || checkDecisionFacilitatorSecret(reqSecret);
}
