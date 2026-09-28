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

/** 1 = full time remaining (or not started), 0 = none left. */
export function remainingFraction(config: SessionConfig, now = Date.now()): number {
  const total = config.durationMinutes * 60_000;
  if (total <= 0) return 0;
  if (config.endedAt) return 0;
  if (!config.startedAt) return 1;
  const rem = remainingMs(config, now);
  if (rem === null) return 1;
  return Math.min(1, Math.max(0, rem / total));
}

function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ] as const;
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t);
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(ch(ar, br))}${to(ch(ag, bg))}${to(ch(ab, bb))}`;
}

/** Green at full time, through light green and amber, to red at zero. */
export function timeBarColor(fraction: number): string {
  const t = Math.min(1, Math.max(0, fraction));
  if (t > 2 / 3) return mixHex("#84C5B1", "#2E7D5B", (t - 2 / 3) * 3);
  if (t > 1 / 3) return mixHex("#B7791F", "#84C5B1", (t - 1 / 3) * 3);
  return mixHex("#B42318", "#B7791F", t * 3);
}

export function isExpired(config: SessionConfig, now = Date.now()): boolean {
  if (config.endedAt) return true;
  const remaining = remainingMs(config, now);
  if (remaining === null) return false;
  return remaining <= 0;
}
