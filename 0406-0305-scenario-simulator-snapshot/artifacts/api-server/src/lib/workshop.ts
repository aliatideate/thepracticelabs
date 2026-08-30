export const WORKSHOP_CODE = "DEFAULT";
export const TEAM_NAMES = [
  "Team 1",
  "Team 2",
  "Team 3",
  "Team 4",
  "Team 5",
  "Team 6",
] as const;
export type TeamName = (typeof TEAM_NAMES)[number];

export function isAllowedTeamName(name: string): name is TeamName {
  return (TEAM_NAMES as readonly string[]).includes(name);
}

export function facilitatorSecret(): string {
  return process.env.FACILITATOR_SECRET ?? "dev-secret";
}

export function checkFacilitatorSecret(reqSecret: string | undefined): boolean {
  return !!reqSecret && reqSecret === facilitatorSecret();
}
