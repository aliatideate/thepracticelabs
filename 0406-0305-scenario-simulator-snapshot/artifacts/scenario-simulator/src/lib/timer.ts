export interface SessionConfig {
  startedAt: string | null;
  durationMinutes: number;
  endedAt: string | null;
}

export function remainingMs(config: SessionConfig, now = Date.now()): number | null {
  if (!config.startedAt) return null;
  const end = new Date(config.startedAt).getTime() + config.durationMinutes * 60_000;
  return end - now;
}

export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function isExpired(config: SessionConfig, now = Date.now()): boolean {
  if (config.endedAt) return true;
  const remaining = remainingMs(config, now);
  if (remaining === null) return false;
  return remaining <= 0;
}
