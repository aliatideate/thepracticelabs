import { TEAM_STORAGE_KEY } from "./constants";

export interface StoredTeam {
  sessionId: string;
  teamName: string;
}

export function readStoredTeam(): StoredTeam | null {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTeam;
    if (!parsed.sessionId || !parsed.teamName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredTeam(value: StoredTeam): void {
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(value));
}

export function clearStoredTeam(): void {
  localStorage.removeItem(TEAM_STORAGE_KEY);
}
