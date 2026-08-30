export const WORKSHOP_CODE = "DEFAULT";
export const TEAM_NAMES = [
  "Team 1",
  "Team 2",
  "Team 3",
  "Team 4",
  "Team 5",
  "Team 6",
] as const;
export const SESSION_LABEL = "Session 1: Foundations + Problem Framing";
export const FLOW_STEPS = [
  "Brief",
  "Stakeholder",
  "Interview",
  "Evidence",
  "Define the Problem",
] as const;
export const ALL_SCREENS = [
  "brief",
  "stakeholder",
  "interview",
  "evidence",
  "define",
  "confirm",
] as const;
export type Screen = (typeof ALL_SCREENS)[number];

export const TEAM_STORAGE_KEY = "tpl-session";

export function screenIndex(screen: string): number {
  const i = (ALL_SCREENS as readonly string[]).indexOf(screen);
  return i < 0 ? 0 : i;
}

export function flowStepIndex(screen: Screen): number {
  if (screen === "confirm") return 4;
  return Math.min(screenIndex(screen), 4);
}
