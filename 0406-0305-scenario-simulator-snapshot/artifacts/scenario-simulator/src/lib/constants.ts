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

/** Flag glyphs for market names so tables and facts scan as a tool, not a brochure. */
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
