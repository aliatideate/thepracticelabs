import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Phone, Plus } from "lucide-react";
import { FLOW_STEPS, SESSION_LABEL, type Screen, flowStepIndex } from "../lib/constants";
import {
  formatCountdown,
  isExpired,
  remainingFraction,
  remainingMs,
  timeBarColor,
  type SessionConfig,
} from "../lib/timer";
import { useScenario } from "../lib/scenario";

export function LivePill({ label = "Live session" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#84C5B1] bg-[#E6F3EF] px-3 py-1 text-[14px] font-medium text-[#496C61]">
      <span className="tpl-live-dot h-2 w-2 rounded-full bg-[#2E7D5B]" />
      {label}
    </span>
  );
}

export function TeamCallout({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#84C5B1] bg-white px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_0_0_1px_rgba(48,28,160,0.04)]">
      <div className="text-[14px] font-semibold uppercase tracking-wide text-[#301CA0] mb-1">
        {kicker}
      </div>
      <p className="m-0 text-[16px] text-[#1D1D24] leading-relaxed">{children}</p>
    </div>
  );
}

export function MetaGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-5 rounded-xl border border-[#E7E4DD] bg-white/80 p-6 shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgba(48,28,160,0.06)]">
      {items.map((item) => (
        <div key={item.label}>
          <div className="text-[14px] uppercase tracking-wide text-[#6C6975] mb-1">{item.label}</div>
          <div className="text-[18px] font-semibold text-[#1D1D24]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function WaitStatus({
  label,
  mode,
}: {
  label: string;
  mode: "thinking" | "typing" | "loading";
}) {
  return (
    <div className="flex items-center gap-3 text-[16px] text-[#6C6975]">
      {mode === "typing" ? (
        <>
          <span>{label}</span>
          <span className="tpl-caret" aria-hidden />
        </>
      ) : (
        <>
          <span>{label}</span>
          <span className="tpl-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </>
      )}
    </div>
  );
}

export function useSessionConfig(path?: string) {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const started = Boolean(config?.startedAt);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(path);
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
  }, [started, path]);
  return config;
}

export function Header({
  teamName,
  teamEmoji,
  currentScreen,
  onStepClick,
  furthestIndex,
  onAskModerator,
  attentionBlinking,
  configPath,
  sessionLabel = SESSION_LABEL,
  titleOverride,
  hideFlowNav,
  clock,
  liveLabel = "Live",
  brandOnly = false,
}: {
  teamName?: string;
  teamEmoji?: string;
  currentScreen?: Screen;
  furthestIndex?: number;
  onStepClick?: (step: number) => void;
  onAskModerator?: () => void;
  attentionBlinking?: boolean;
  configPath?: string;
  sessionLabel?: string;
  titleOverride?: string;
  hideFlowNav?: boolean;
  clock?: SessionConfig | null;
  liveLabel?: string;
  /** Creator area: logo + "Creator Studio", no session title / timer. */
  brandOnly?: boolean;
}) {
  const scenario = useScenario();
  const fetched = useSessionConfig(clock !== undefined ? undefined : (configPath ?? "/api/session-config"));
  const config = clock !== undefined ? clock : fetched;
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sessionLabel.startsWith("Session 2")) return;
    const previous = document.title;
    document.title = "the Practice Labs — Session 2";
    return () => {
      document.title = previous;
    };
  }, [sessionLabel]);

  const remaining = config ? remainingMs(config) : null;
  const fraction = config ? remainingFraction(config) : 1;
  const barColor = timeBarColor(fraction);
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
    <header className="sticky top-0 z-50 text-white tpl-nav-mesh relative overflow-hidden">
      <div className="animated-gradient" aria-hidden />
      <div className="relative z-10">
      <div className="mx-auto max-w-[1280px] px-6 h-[100px] flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src="/content/media/logo-practice-labs.svg"
            alt="the Practice Labs"
            className="h-[33px] w-auto"
          />
          {brandOnly ? (
            <>
              <div className="hidden lg:block h-8 w-px bg-white/25" />
              <div className="min-w-0 hidden md:block">
                <div className="text-[16px] font-medium truncate">Creator Studio</div>
              </div>
            </>
          ) : (
            <>
              <div className="hidden lg:block h-8 w-px bg-white/25" />
              <div className="min-w-0 hidden md:block">
                <div className="text-[14px] font-medium truncate">{sessionLabel}</div>
                <div className="text-[14px] text-white/75 truncate">
                  {titleOverride ?? scenario.title}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!brandOnly && config?.startedAt && !expired && <LivePill label={liveLabel} />}
          {!brandOnly && (
            <div
              className={`rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[18px] tabular-nums ${timerClass} ${underFive && !expired ? "tpl-timer-pulse" : ""}`}
            >
              {timerLabel}
            </div>
          )}
          {teamName && (
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[14px] font-medium inline-flex items-center gap-1.5 max-w-[14rem]">
              {teamEmoji ? <span className="text-[16px] leading-none">{teamEmoji}</span> : null}
              <span className="truncate">{teamName}</span>
            </div>
          )}
          {hideFlowNav && onAskModerator && (
            <button
              type="button"
              onClick={onAskModerator}
              disabled={attentionBlinking}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[14px] font-medium ${
                attentionBlinking
                  ? "tpl-ask-blink border-[#B42318] text-white"
                  : "border-white/25 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
              Ask Moderator to Join
            </button>
          )}
        </div>
      </div>
      {currentScreen && currentScreen !== "confirm" && !hideFlowNav && (
        <nav className="border-t border-white/10">
          <div className="mx-auto max-w-[1280px] px-6 h-12 flex items-center justify-between gap-4">
            <ol className="flex items-center gap-2 text-[14px] min-w-0 overflow-x-auto">
            {FLOW_STEPS.map((label, i) => {
              const reachable = furthestIndex !== undefined && i <= furthestIndex;
              const active = i === step;
              const done = furthestIndex !== undefined && i < furthestIndex;
              return (
                <li key={label} className="flex items-center gap-2 min-w-0">
                  {i > 0 && <span className="hidden sm:block w-6 h-px bg-white/25" />}
                  <button
                    type="button"
                    disabled={!reachable && !active}
                    onClick={() => reachable && onStepClick?.(i)}
                    className={`rounded-full px-3 py-1 transition-colors duration-200 ${
                      active
                        ? "bg-white text-[#301CA0] font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                        : done
                          ? "text-white/90 hover:bg-white/10"
                          : "text-white/40 cursor-default"
                    }`}
                  >
                    {done && !active ? (
                      <Check className="inline h-3.5 w-3.5 mr-1 text-[#84C5B1]" strokeWidth={3} />
                    ) : null}
                    {String(i + 1).padStart(2, "0")} {label}
                  </button>
                </li>
              );
            })}
            </ol>
            <button
              type="button"
              onClick={onAskModerator}
              disabled={attentionBlinking}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[14px] font-medium ${
                attentionBlinking
                  ? "tpl-ask-blink border-[#B42318] text-white"
                  : "border-white/25 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
              Ask Moderator to Join
            </button>
          </div>
        </nav>
      )}
      </div>
      <div
        className="relative z-10 h-[5px] w-full bg-white"
        role="progressbar"
        aria-label="Time remaining"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
      >
        <div
          className="h-full"
          style={{
            width: `${fraction * 100}%`,
            backgroundColor: barColor,
            transition: "width 1s linear, background-color 1s linear",
          }}
        />
      </div>
    </header>
  );
}

export function TimeBanner({
  config,
  expiredMessage = "Time's up. Please return to the main workshop room.",
}: {
  config: SessionConfig | null;
  expiredMessage?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const expired = config ? isExpired(config) : false;
  useEffect(() => {
    if (!expired) setDismissed(false);
  }, [expired]);
  if (!expired || dismissed) return null;
  return (
    <div className="bg-[#B42318] text-white px-6 py-3 flex items-center justify-between gap-4 max-w-[1280px] mx-auto mt-4 rounded-lg">
      <p className="text-[16px] font-medium">{expiredMessage}</p>
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
  icon = "arrow",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  /** Trailing icon. Default arrow matches player/facilitator CTAs. */
  icon?: "arrow" | "plus" | "none";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#301CA0] to-[#1A0F58] text-white text-[16px] font-semibold px-6 py-2.5 shadow-[0_8px_24px_rgba(48,28,160,0.28)] transition-all duration-200 ease-out hover:scale-[1.05] hover:shadow-[0_14px_36px_rgba(48,28,160,0.42)] hover:from-[#3d28b8] hover:to-[#301CA0] active:scale-[0.96] active:shadow-[0_4px_14px_rgba(48,28,160,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_8px_24px_rgba(48,28,160,0.28)]"
    >
      {children}
      {icon === "arrow" && (
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-0"
          strokeWidth={2.25}
        />
      )}
      {icon === "plus" && <Plus className="h-4 w-4" strokeWidth={2.25} />}
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
      className="inline-flex items-center justify-center rounded-full bg-[#E6F3EF] text-[#301CA0] text-[16px] font-semibold px-5 py-2.5 border border-[#84C5B1] transition-all duration-200 ease-out hover:scale-[1.04] hover:bg-[#d7ebe4] hover:shadow-[0_8px_20px_rgba(73,108,97,0.18)] active:scale-[0.96] disabled:opacity-40 disabled:hover:scale-100"
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
  const base = "rounded-xl border p-5 text-left w-full transition-all duration-200";
  const state = confirmed
    ? "border-[#301CA0] bg-[#301CA0] text-white shadow-[0_0_0_1px_rgba(48,28,160,0.4)]"
    : selected
      ? "border-[#301CA0] bg-[#EAE8F6] text-[#1D1D24] shadow-[inset_0_1px_0_#fff,0_0_0_1px_rgba(48,28,160,0.25)]"
      : locked
        ? "border-[#E7E4DD] bg-[#F8F6EF] text-[#6C6975] cursor-not-allowed shadow-[inset_0_1px_0_#fff]"
        : "border-[#E7E4DD] bg-white text-[#1D1D24] shadow-[inset_0_1px_0_#fff] hover:border-[#301CA0]/50 hover:shadow-[0_0_0_1px_rgba(48,28,160,0.12)]";
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
