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
export const MART_STORAGE_KEY = "tpl-mart-session";
export const MART_WORKSHOP_CODE = "MART";
export const MART_SESSION_LABEL = "Session 2: Ideation & Decision-Making";
export const MART_CONFIG_PATH = "/api/mart/session-config";
export const MART_DURATION_MINUTES = 15;
export const MART_TRY_STORAGE_KEY = "tpl-mart-try-session";

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

/** Lowercase ASCII slug for download labels; empty if nothing usable. */
export function sanitiseFilenameSlug(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

/**
 * Evidence download labels: `{shortSlug}-W35-…`.
 * Prefer company short name; fall back to session/workshop code, then `gbc`.
 */
export function evidenceFilename(
  id: string,
  shortNameOrSlug?: string | null,
  fallbackCode?: string | null,
): string {
  const slug =
    sanitiseFilenameSlug(shortNameOrSlug) ||
    sanitiseFilenameSlug(fallbackCode) ||
    "gbc";
  switch (id) {
    case "sku_availability":
      return `${slug}-W35-availability.xlsx`;
    case "production_capacity":
      return `${slug}-W35-capacity-memo.pdf`;
    default:
      return `${slug}-W35-retailer-complaints.pdf`;
  }
}
