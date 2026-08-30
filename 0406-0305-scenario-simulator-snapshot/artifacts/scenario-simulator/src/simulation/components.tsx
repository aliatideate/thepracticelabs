import React, { useEffect, useState } from "react";
import { FLOW_STEPS, SESSION_LABEL, type Screen, flowStepIndex } from "../lib/constants";
import { formatCountdown, isExpired, remainingMs, type SessionConfig } from "../lib/timer";
import { useScenario } from "../lib/scenario";

export function useSessionConfig() {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const started = Boolean(config?.startedAt);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/session-config");
        if (!res.ok) return;
        const data = (await res.json()) as SessionConfig;
        if (!cancelled) setConfig(data);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, started ? 5000 : 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [started]);
  return config;
}

export function Header({
  teamName,
  currentScreen,
  onStepClick,
  furthestIndex,
}: {
  teamName?: string;
  currentScreen?: Screen;
  furthestIndex?: number;
  onStepClick?: (step: number) => void;
}) {
  const scenario = useScenario();
  const config = useSessionConfig();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = config ? remainingMs(config) : null;
  const expired = config ? isExpired(config) : false;
  const underFive = remaining !== null && remaining > 0 && remaining < 5 * 60_000;
  const timerLabel = !config?.startedAt
    ? "Not started"
    : expired
      ? "00:00"
      : formatCountdown(remaining ?? 0);
  const timerClass = expired
    ? "text-[#B42318] font-semibold"
    : underFive
      ? "text-[#B7791F] font-semibold"
      : "text-white";

  const step = currentScreen ? flowStepIndex(currentScreen) : -1;

  return (
    <header className="sticky top-0 z-50 bg-[#301CA0] text-white">
      <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src="/content/media/logo-horizontal.svg"
            alt="the Practice Labs"
            className="h-7 w-auto brightness-0 invert"
          />
          <div className="hidden lg:block h-8 w-px bg-white/25" />
          <div className="min-w-0 hidden md:block">
            <div className="text-[13px] text-white/70 truncate">the Practice Labs by Ideate Innovation</div>
            <div className="text-[14px] font-medium truncate">{SESSION_LABEL}</div>
            <div className="text-[14px] text-white/75 truncate">{scenario.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className={`font-mono text-[18px] tabular-nums ${timerClass}`}>{timerLabel}</div>
          {teamName && (
            <div className="rounded-full bg-white/15 px-3 py-1 text-[14px] font-medium">{teamName}</div>
          )}
        </div>
      </div>
      {currentScreen && currentScreen !== "confirm" && (
        <nav className="border-t border-white/15 bg-[#1A0F58]">
          <ol className="mx-auto max-w-[1280px] px-6 h-11 flex items-center gap-1 text-[14px]">
            {FLOW_STEPS.map((label, i) => {
              const reachable = furthestIndex !== undefined && i < furthestIndex;
              const active = i === step;
              const done = furthestIndex !== undefined && i < furthestIndex;
              return (
                <li key={label} className="flex items-center gap-1">
                  {i > 0 && <span className="text-white/30 px-1">/</span>}
                  <button
                    type="button"
                    disabled={!reachable && !active}
                    onClick={() => reachable && onStepClick?.(i)}
                    className={`px-1 ${
                      active
                        ? "text-white font-semibold"
                        : done
                          ? "text-white/80 hover:text-white underline-offset-4 hover:underline"
                          : "text-white/40 cursor-default"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")} {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </header>
  );
}

export function TimeBanner({ config }: { config: SessionConfig | null }) {
  const [dismissed, setDismissed] = useState(false);
  const expired = config ? isExpired(config) : false;
  useEffect(() => {
    if (!expired) setDismissed(false);
  }, [expired]);
  if (!expired || dismissed) return null;
  return (
    <div className="bg-[#B42318] text-white px-6 py-3 flex items-center justify-between gap-4 max-w-[1280px] mx-auto mt-4 rounded-lg">
      <p className="text-[16px] font-medium">
        Time's up. Please return to the main workshop room.
      </p>
      <button
        type="button"
        className="text-[14px] underline underline-offset-2 shrink-0"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8 pb-16">{children}</div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-lg bg-[#301CA0] text-white text-[16px] font-semibold px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1A0F58]"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-lg bg-[#E6F3EF] text-[#301CA0] text-[16px] font-semibold px-5 py-2.5 border border-[#84C5B1] disabled:opacity-40 hover:bg-[#d7ebe4]"
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  selected,
  confirmed,
  locked,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  selected?: boolean;
  confirmed?: boolean;
  locked?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    "rounded-xl border bg-white p-5 text-left w-full";
  const state = confirmed
    ? "border-[#301CA0] bg-[#301CA0] text-white"
    : selected
      ? "border-[#301CA0] bg-[#EAE8F6]"
      : locked
        ? "border-[#E7E4DD] bg-[#F8F6EF] text-[#6C6975] cursor-not-allowed"
        : "border-[#E7E4DD] hover:border-[#301CA0]/40";
  const Comp = onClick && !locked ? "button" : "div";
  return (
    <Comp
      type={onClick && !locked ? "button" : undefined}
      onClick={locked ? undefined : onClick}
      className={`${base} ${state} ${className}`}
    >
      {children}
    </Comp>
  );
}
