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

export function formatTeamLabel(input: {
  teamName: string;
  displayName?: string | null;
  emoji?: string | null;
}): string {
  const name = input.displayName?.trim() || input.teamName;
  const emoji = input.emoji?.trim();
  return emoji ? `${emoji} ${name}` : name;
}
export const SESSION_LABEL = "Session 1: Foundations + Problem Framing";
export const FLOW_STEPS = [
  "Brief",
  "Stakeholder",
  "Interview",
  "Evidence",
  "Define the Problem",
] as const;
/** Teams must ask this many questions before leaving the interview. */
export const MIN_INTERVIEW_QUESTIONS = 2;

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
export const DEMAND_TRY_STORAGE_KEY = "tpl-demand-try-session";
export const DEMAND_TRY_WORKSHOP_CODE = "DEMAND-TRY";
export const DEMAND_FACILITATOR_SECRET = "unilever-s1";
export const MART_STORAGE_KEY = "tpl-mart-session";
export const MART_SESSION_LABEL = "Session 2: Ideation & Decision-Making";
export const MART_CONFIG_PATH = "/api/mart/session-config";
export const MART_DURATION_MINUTES = 15;
export const MART_FACILITATOR_SECRET = "unilever-s2";
export const MART_TRY_STORAGE_KEY = "tpl-mart-try-session";
export const FACILITATOR_PASSWORD = "3108";
export const FACILITATOR_UNLOCK_KEY = "tpl-facilitate-unlock";

export function screenIndex(screen: string): number {
  const i = (ALL_SCREENS as readonly string[]).indexOf(screen);
  return i < 0 ? 0 : i;
}

export function flowStepIndex(screen: Screen): number {
  if (screen === "confirm") return 4;
  return Math.min(screenIndex(screen), 4);
}

/** Flag glyphs for market names in tables and fact chips — not in running paragraphs. */
export function withMarketFlags(text: string): string {
  return text
    .replaceAll("Saudi Arabia", "🇸🇦 Saudi Arabia")
    .replaceAll("UAE", "🇦🇪 UAE")
    .replaceAll("KSA", "🇸🇦 KSA")
    .replaceAll("Qatar", "🇶🇦 Qatar");
}

export function evidenceFilename(id: string): string {
  switch (id) {
    case "sku_availability":
      return "GBC-W35-availability.xlsx";
    case "production_capacity":
      return "GBC-W35-capacity-memo.pdf";
    default:
      return "GBC-W35-retailer-complaints.pdf";
  }
}
