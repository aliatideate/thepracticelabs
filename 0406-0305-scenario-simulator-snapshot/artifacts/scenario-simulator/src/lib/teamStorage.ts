import { TEAM_STORAGE_KEY, DEMAND_TRY_STORAGE_KEY, MART_STORAGE_KEY, MART_TRY_STORAGE_KEY } from "./constants";

export interface StoredTeam {
  sessionId: string;
  teamName: string;
}

function access(key: string) {
  return {
    read(): StoredTeam | null {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredTeam;
        if (!parsed.sessionId || !parsed.teamName) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    write(value: StoredTeam) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    clear() {
      localStorage.removeItem(key);
    },
  };
}

const session1 = access(TEAM_STORAGE_KEY);
export const readStoredTeam = () => session1.read();
export const writeStoredTeam = (value: StoredTeam) => session1.write(value);
export const clearStoredTeam = () => session1.clear();

const mart = access(MART_STORAGE_KEY);
export const readMartTeam = () => mart.read();
export const writeMartTeam = (value: StoredTeam) => mart.write(value);
export const clearMartTeam = () => mart.clear();

const martTry = access(MART_TRY_STORAGE_KEY);
export const readMartTryTeam = () => martTry.read();
export const writeMartTryTeam = (value: StoredTeam) => martTry.write(value);
export const clearMartTryTeam = () => martTry.clear();

const demandTry = access(DEMAND_TRY_STORAGE_KEY);
export const readDemandTryTeam = () => demandTry.read();
export const writeDemandTryTeam = (value: StoredTeam) => demandTry.write(value);
export const clearDemandTryTeam = () => demandTry.clear();
