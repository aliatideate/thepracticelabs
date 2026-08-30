import { useEffect, useMemo, useState } from "react";
import { assets, stakeholders, evidenceSources } from "./data";
import {
  moderator,
  teams as initialTeams,
  initialActivity,
  noteTemplates,
  debriefSignals,
  supportTeams,
  FLOW_STEPS,
  type Team,
  type StatusType,
} from "./moderatorData";
import {
  appendActivity,
  loadAccessRequests,
  loadActivity,
  loadProgress,
  loadSubmissions,
  requestAccess,
  sendModeratorNote,
  useStoreSnapshot,
  type ActivityEvent,
  type ProgressRecord,
} from "./store";

// ─── Live data helpers ──────────────────────────────────────────────────────

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function deriveStatus(p: ProgressRecord, now: number): { type: StatusType; label: string; attention: string | null } {
  if (p.currentStep === "Submitted") {
    return { type: "complete", label: "Complete", attention: null };
  }
  if (p.screen === "entry") {
    return { type: "notStarted", label: "Not started", attention: null };
  }
  const elapsed = now - p.stepStartedAt;
  if (elapsed > 9 * 60 * 1000) {
    return { type: "attention", label: "Needs attention", attention: `Slow on ${p.currentStep.toLowerCase()}` };
  }
  if (elapsed > 5 * 60 * 1000) {
    return { type: "slow", label: "Slightly slow", attention: null };
  }
  return { type: "onTrack", label: "On track", attention: null };
}

function liveTeamFromProgress(seed: Team, p: ProgressRecord, now: number): Team {
  const stake = p.stakeholderId ? stakeholders.find((s) => s.id === p.stakeholderId) : null;
  const ev = p.evidenceSourceId ? evidenceSources.find((e) => e.id === p.evidenceSourceId) : null;
  const status = deriveStatus(p, now);
  return {
    ...seed,
    name: p.teamName || seed.name,
    currentStatus: p.currentStatus,
    currentStep: p.currentStep,
    stakeholder: stake
      ? { name: stake.name, role: stake.role, image: stake.image }
      : null,
    evidence: ev ? ev.title : null,
    latestActivity: p.latestActivity,
    timeOnStep: p.currentStep === "Submitted" ? "Done" : formatElapsed(now - p.stepStartedAt),
    statusType: status.type,
    statusLabel: status.label,
    attention: status.attention,
    confidence: p.confidence ?? undefined,
    progress: p.progress,
    problemStatement: p.problemStatement,
    assumptionToTest: p.assumption ?? undefined,
  };
}

// ─── Tokens ─────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<StatusType, { pill: string; dot: string; ring: string }> = {
  onTrack: {
    pill: "border-yellow-400/30 bg-yellow-400/[0.08] text-yellow-200",
    dot: "bg-yellow-400",
    ring: "ring-yellow-400/30",
  },
  slow: {
    pill: "border-orange-400/30 bg-orange-400/[0.08] text-orange-200",
    dot: "bg-orange-400",
    ring: "ring-orange-400/30",
  },
  attention: {
    pill: "border-red-400/35 bg-red-400/[0.10] text-red-200",
    dot: "bg-red-400",
    ring: "ring-red-400/40",
  },
  complete: {
    pill: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/30",
  },
  notStarted: {
    pill: "border-white/10 bg-white/[0.04] text-white/50",
    dot: "bg-white/30",
    ring: "ring-white/10",
  },
};

// ─── Toast ──────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show: (m: string) => setToast(m) };
}

// ─── Shared atoms ───────────────────────────────────────────────────────────

function Pill({
  children,
  tone = "muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "muted" | "yellow" | "emerald" | "violet" | "red" | "orange";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "border-white/10 bg-white/[0.04] text-white/70",
    yellow: "border-yellow-400/30 bg-yellow-400/[0.08] text-yellow-200",
    emerald: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-200",
    red: "border-red-400/30 bg-red-400/[0.08] text-red-200",
    orange: "border-orange-400/30 bg-orange-400/[0.08] text-orange-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${sz} inline-flex items-center justify-center gap-1.5 rounded-full font-semibold text-[#1a0f00] bg-gradient-to-b from-yellow-300 to-orange-400 hover:from-yellow-200 hover:to-orange-300 shadow-[0_6px_24px_-8px_rgba(251,191,36,0.55)] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  className = "",
  size = "sm",
  active = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
  active?: boolean;
}) {
  const sz = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sz} inline-flex items-center gap-1 rounded-full border transition-colors font-medium ${
        active
          ? "border-yellow-400/40 bg-yellow-400/[0.10] text-yellow-200"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white/90"
      } ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="border-b border-white/[0.06] bg-[#100f24]/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={assets.scenarioSimulatorLogo} alt="Scenario Simulator" className="h-7 w-auto" />
          <Pill tone="violet" className="ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />
            Moderator View
          </Pill>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="muted">{moderator.workshop}</Pill>
          <Pill tone="muted" className="hidden lg:inline-flex">
            {moderator.scenario}
          </Pill>
          <Pill tone="yellow">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
            {moderator.timer}
          </Pill>
          <button
            type="button"
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/[0.06] hover:bg-red-400/[0.12] px-3 py-1 text-[11px] font-semibold text-red-200 transition-colors"
          >
            End Exercise
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Workshop status sub-header ────────────────────────────────────────────

function WorkshopStatus({
  totals,
}: {
  totals: { teams: number; submitted: number; needsAttention: number };
}) {
  return (
    <div className="border-b border-white/[0.06] pb-4 mb-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1.5">
        Workshop Status
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="yellow">{moderator.workshop}</Pill>
        <Pill tone="muted">{`${totals.teams} teams`}</Pill>
        {totals.needsAttention === 0 ? (
          <Pill tone="emerald">All teams on track</Pill>
        ) : (
          <Pill tone="red">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            {`${totals.needsAttention} need${totals.needsAttention === 1 ? "s" : ""} attention`}
          </Pill>
        )}
      </div>
    </div>
  );
}

// ─── Step chips ─────────────────────────────────────────────────────────────

function StepChips({ progress }: { progress: Team["progress"] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {FLOW_STEPS.map((s, i) => {
        const state = progress[s.key as keyof Team["progress"]];
        const styles =
          state === "complete"
            ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200"
            : state === "active"
              ? "border-yellow-400/40 bg-yellow-400/[0.12] text-yellow-200 ring-1 ring-yellow-400/20"
              : "border-white/8 bg-white/[0.02] text-white/35";
        return (
          <div key={s.key} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles}`}
            >
              {state === "complete" && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <polyline points="5 12 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {state === "active" && <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />}
              {s.label}
            </span>
            {i < FLOW_STEPS.length - 1 && <span className="w-2 h-px bg-white/10" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Team card ──────────────────────────────────────────────────────────────

function TeamCard({
  team,
  marked,
  onSendNote,
  onRequestAccess,
  onView,
  accessRequested,
}: {
  team: Team;
  marked: boolean;
  onSendNote: () => void;
  onRequestAccess: () => void;
  onView: () => void;
  accessRequested: boolean;
}) {
  const tone = STATUS_TONE[team.statusType];
  return (
    <Card className="p-4 hover:bg-white/[0.035] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[12px] font-bold text-white/80 ring-1 ${tone.ring}`}>
            {team.name.replace("Team ", "")}
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/95">{team.name}</span>
              {marked && <Pill tone="violet">Debrief</Pill>}
            </div>
            <div className="text-[11px] text-white/55 mt-0.5">{team.currentStatus}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${tone.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
            {team.statusLabel}
          </span>
          <span className="text-[10px] text-white/40">on step · {team.timeOnStep}</span>
        </div>
      </div>

      <div className="mb-3">
        <StepChips progress={team.progress} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-white/40 mb-1">Stakeholder</div>
          {team.stakeholder ? (
            <div className="flex items-center gap-2">
              {team.stakeholder.image && (
                <img src={team.stakeholder.image} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10" />
              )}
              <div className="leading-tight min-w-0">
                <div className="text-[12px] font-medium text-white/90 truncate">{team.stakeholder.name}</div>
                <div className="text-[10px] text-white/45 truncate">{team.stakeholder.role}</div>
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-white/40">Not selected yet</div>
          )}
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-white/40 mb-1">Evidence</div>
          <div className={`text-[12px] ${team.evidence ? "text-white/90 font-medium" : "text-white/40"}`}>
            {team.evidence ?? "Not selected yet"}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 mb-3 text-[11.5px] text-white/65">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 text-white/40">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5l3 2" strokeLinecap="round" />
        </svg>
        <span className="flex-1">
          <span className="text-white/50">Latest: </span>
          {team.latestActivity}
        </span>
      </div>

      {team.attention && (
        <div className="mb-3 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-2.5 py-1.5 text-[11px] text-red-200 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
            <path d="M12 10v4M12 17.5v.5" strokeLinecap="round" />
          </svg>
          {team.attention}
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.05]">
        <GhostButton onClick={onSendNote}>Send note</GhostButton>
        <GhostButton onClick={onRequestAccess} active={accessRequested}>
          {accessRequested ? "Access requested" : "Request access"}
        </GhostButton>
        <button
          type="button"
          onClick={onView}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-yellow-200 hover:text-yellow-100"
        >
          View details
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </Card>
  );
}

// ─── Debrief signals ────────────────────────────────────────────────────────

function CountBar({ name, count, max, muted }: { name: string; count: number; max: number; muted?: boolean }) {
  const pct = (count / max) * 100;
  return (
    <div className="flex items-center gap-2 text-[11.5px]">
      <span className={`w-44 truncate ${muted ? "text-white/40 italic" : "text-white/80"}`}>{name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={`h-full rounded-full ${muted ? "bg-white/20" : "bg-gradient-to-r from-yellow-400 to-orange-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-6 text-right tabular-nums ${muted ? "text-white/40" : "text-white/70"}`}>{count}</span>
    </div>
  );
}

function DebriefSection() {
  const maxStake = Math.max(...debriefSignals.investigation.stakeholders.map((s) => s.count));
  const maxEv = Math.max(...debriefSignals.investigation.evidence.map((s) => s.count));
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-white/95">Debrief Signals</h2>
          <p className="text-[12px] text-white/50">Emerging patterns to bring back into the main room.</p>
        </div>
      </div>

      {/* moderator tip */}
      <Card className="mb-3 px-3.5 py-2.5 border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.05] to-orange-400/[0.03]">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-300 text-[10px] font-bold">i</div>
          <div className="leading-snug">
            <div className="text-[11px] uppercase tracking-[0.14em] text-yellow-200/80 font-semibold mb-0.5">Moderator tip</div>
            <div className="text-[12px] text-white/80">
              Use the debrief to compare not just what teams concluded, but how they investigated the problem.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3.5">
          <h3 className="text-[12.5px] font-semibold text-white/90 mb-2.5">Investigation choices</h3>
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">Stakeholders interviewed</div>
          <div className="space-y-1.5 mb-3">
            {debriefSignals.investigation.stakeholders.map((s) => (
              <CountBar key={s.name} name={s.name} count={s.count} max={maxStake} />
            ))}
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">Evidence selected</div>
          <div className="space-y-1.5">
            {debriefSignals.investigation.evidence.map((s) => (
              <CountBar key={s.name} name={s.name} count={s.count} max={maxEv} muted={s.muted} />
            ))}
          </div>
        </Card>

        <Card className="p-3.5">
          <h3 className="text-[12.5px] font-semibold text-white/90 mb-2">Emerging themes</h3>
          <ul className="space-y-2">
            {debriefSignals.themes.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[11.5px] text-white/75">
                <span className="mt-1 w-1 h-1 rounded-full bg-yellow-300/80 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-3.5">
          <h3 className="text-[12.5px] font-semibold text-white/90 mb-2">Debrief watch-outs</h3>
          <ul className="space-y-2">
            {debriefSignals.watchouts.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[11.5px] text-white/75">
                <span className="mt-1 w-1 h-1 rounded-full bg-orange-300/80 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

// ─── Activity feed ──────────────────────────────────────────────────────────

function ActivityTicker({ items }: { items: typeof initialActivity }) {
  const [expanded, setExpanded] = useState(false);
  const latest = items[0];
  const toneText = (tone: string) =>
    tone === "attention"
      ? "text-orange-200"
      : tone === "moderator"
        ? "text-yellow-200"
        : "text-white/85";
  const toneBorder = (tone: string) =>
    tone === "attention"
      ? "border-l-orange-400/60"
      : tone === "moderator"
        ? "border-l-yellow-400/60"
        : "border-l-white/10";

  return (
    <Card className="mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300/90 shrink-0">
          <span className="relative inline-flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
        <span className="h-4 w-px bg-white/10 shrink-0" />
        {latest && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-mono text-[10.5px] text-white/40 shrink-0">{latest.time}</span>
            <span className={`text-[12px] truncate ${toneText(latest.tone)}`}>{latest.text}</span>
          </div>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-white/55 shrink-0">
          {expanded ? "Hide" : `${items.length - 1} more`}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 max-h-[280px] overflow-y-auto space-y-1.5">
          {items.slice(1).map((it, i) => (
            <div
              key={i}
              className={`pl-2.5 border-l-2 ${toneBorder(it.tone)} text-[11.5px] leading-snug ${toneText(it.tone)}`}
            >
              <span className="font-mono text-[10.5px] text-white/40 mr-1.5">{it.time}</span>
              {it.text}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Send note panel ────────────────────────────────────────────────────────

function SendNotePanel({
  recipients,
  onSend,
}: {
  recipients: { id: string; label: string }[];
  onSend: (recipientLabel: string, message: string) => void;
}) {
  const [recipient, setRecipient] = useState(recipients[0]?.id ?? "all");
  const [activeTpl, setActiveTpl] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const send = () => {
    if (!message.trim()) return;
    const label = recipients.find((r) => r.id === recipient)?.label ?? "All Teams";
    onSend(label, message.trim());
    setMessage("");
    setActiveTpl(null);
  };

  return (
    <Card className="p-3.5">
      <div className="mb-2.5">
        <h3 className="text-[13px] font-semibold text-white/95">Send Note</h3>
        <p className="text-[11px] text-white/45">Send a guidance message to one team or all teams.</p>
      </div>

      <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1">Recipient</label>
      <select
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        className="w-full mb-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/90 focus:outline-none focus:border-yellow-400/40"
      >
        {recipients.map((r) => (
          <option key={r.id} value={r.id} className="bg-[#100f24]">
            {r.label}
          </option>
        ))}
      </select>

      <label className="block text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1">Quick templates</label>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {noteTemplates.map((t) => (
          <GhostButton
            key={t.id}
            active={activeTpl === t.id}
            onClick={() => {
              setActiveTpl(t.id);
              setMessage(t.message);
            }}
          >
            {t.label}
          </GhostButton>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setActiveTpl(null);
        }}
        rows={4}
        placeholder="Write a short guidance message…"
        className="w-full mb-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white/90 placeholder-white/30 focus:outline-none focus:border-yellow-400/40 resize-none"
      />

      <div className="flex justify-end">
        <PrimaryButton size="sm" onClick={send} disabled={!message.trim()}>
          Send Note
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </PrimaryButton>
      </div>
    </Card>
  );
}

// ─── Team support panel ────────────────────────────────────────────────────

function TeamSupportPanel({
  accessRequested,
  onSendNudge,
  onRequestAccess,
  onView,
}: {
  accessRequested: Record<string, boolean>;
  onSendNudge: (teamName: string) => void;
  onRequestAccess: (teamId: string) => void;
  onView: (teamId: string) => void;
}) {
  return (
    <Card className="p-3.5">
      <div className="mb-2.5">
        <h3 className="text-[13px] font-semibold text-white/95">Team Support</h3>
        <p className="text-[11px] text-white/45">Teams that may need a nudge.</p>
      </div>
      <div className="space-y-2">
        {supportTeams.map((t) => {
          const requested = !!accessRequested[t.teamId];
          return (
            <div
              key={t.teamId}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[12px] font-semibold text-white/90">{t.name}</div>
                <Pill tone="orange">{t.status}</Pill>
              </div>
              <div className="flex items-center gap-1.5">
                <GhostButton onClick={() => onRequestAccess(t.teamId)} active={requested}>
                  {requested ? "Access requested" : "Request access"}
                </GhostButton>
                <GhostButton onClick={() => onSendNudge(t.name)}>Send nudge</GhostButton>
                <button
                  type="button"
                  onClick={() => onView(t.teamId)}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-yellow-200 hover:text-yellow-100"
                >
                  View details
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Drawer ─────────────────────────────────────────────────────────────────

function TeamDrawer({
  team,
  marked,
  onClose,
  onSendNote,
  onRequestAccess,
  onMarkDebrief,
  accessRequested,
}: {
  team: Team | null;
  marked: boolean;
  onClose: () => void;
  onSendNote: (teamName: string) => void;
  onRequestAccess: (teamId: string) => void;
  onMarkDebrief: (teamId: string) => void;
  accessRequested: boolean;
}) {
  if (!team) return null;
  const tone = STATUS_TONE[team.statusType];
  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[460px] bg-[#0e0c20] border-l border-white/[0.08] shadow-2xl overflow-y-auto"
        role="dialog"
        aria-label={`${team.name} details`}
      >
        <div className="sticky top-0 z-10 px-5 py-4 bg-[#0e0c20]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-0.5">Team Details</div>
            <h2 className="text-lg font-semibold text-white/95 flex items-center gap-2">
              {team.name}
              {marked && <Pill tone="violet">Debrief</Pill>}
            </h2>
            <div className="mt-1 text-[12px] text-white/60">{team.currentStatus}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white/90 flex items-center justify-center"
            aria-label="Close drawer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Current status */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">Current status</h3>
            <Card className="p-3 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Step</div>
                <div className="text-white/90 font-medium">{team.currentStep}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Time on step</div>
                <div className="text-white/90 font-medium">{team.timeOnStep}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Status</div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                  {team.statusLabel}
                </span>
              </div>
              {team.attention && (
                <div className="col-span-2 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-2.5 py-1.5 text-[11.5px] text-red-200">
                  ⚠ {team.attention}
                </div>
              )}
            </Card>
          </section>

          {/* Investigation path */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">Investigation path</h3>
            <Card className="p-3 space-y-2.5">
              <div className="flex items-center gap-2.5">
                {team.stakeholder?.image && (
                  <img src={team.stakeholder.image} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                )}
                <div className="leading-tight">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Stakeholder</div>
                  <div className="text-[13px] font-medium text-white/90">{team.stakeholder?.name ?? "—"}</div>
                  <div className="text-[11px] text-white/55">{team.stakeholder?.role ?? ""}</div>
                </div>
              </div>
              <div className="border-t border-white/[0.05] pt-2">
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Evidence selected</div>
                <div className={`text-[12.5px] ${team.evidence ? "text-white/90 font-medium" : "text-white/40"}`}>
                  {team.evidence ?? "Not selected yet"}
                </div>
              </div>
            </Card>
          </section>

          {/* Captured learnings */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">Captured learnings</h3>
            <Card className="p-3">
              <ul className="space-y-1.5">
                {team.capturedLearnings.map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-white/75">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-yellow-300/80 shrink-0" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* Problem statement */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">
              Problem statement
              {team.confidence && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-white/50 normal-case tracking-normal">
                  · Confidence:{" "}
                  <span className={team.confidence === "High" ? "text-emerald-300" : team.confidence === "Medium" ? "text-yellow-300" : "text-orange-300"}>
                    {team.confidence}
                  </span>
                </span>
              )}
            </h3>
            <Card className="p-3">
              {team.problemStatement ? (
                <p className="text-[12.5px] text-white/85 leading-relaxed italic">"{team.problemStatement}"</p>
              ) : (
                <p className="text-[12px] text-white/45">Not submitted yet.</p>
              )}
              {team.assumptionToTest && (
                <div className="mt-2.5 pt-2.5 border-t border-white/[0.05]">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Assumption to test</div>
                  <div className="text-[12px] text-white/75">{team.assumptionToTest}</div>
                </div>
              )}
              {team.debriefFlag && (
                <div className="mt-2.5 rounded-md border border-violet-400/25 bg-violet-400/[0.06] px-2.5 py-1.5 text-[11.5px] text-violet-200">
                  {team.debriefFlag}
                </div>
              )}
            </Card>
          </section>

          {/* Actions */}
          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">Moderator actions</h3>
            <div className="flex flex-wrap gap-2">
              <GhostButton size="md" onClick={() => onSendNote(team.name)}>Send note to this team</GhostButton>
              <GhostButton size="md" onClick={() => onRequestAccess(team.id)} active={accessRequested}>
                {accessRequested ? "Access requested" : "Request access"}
              </GhostButton>
              <GhostButton size="md" onClick={() => onMarkDebrief(team.id)} active={marked}>
                {marked ? "✓ Marked for debrief — click to unmark" : "Mark for debrief"}
              </GhostButton>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

// ─── Confirm modal ─────────────────────────────────────────────────────────

function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#14122a] p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-white/95 mb-1.5">{title}</h3>
        <p className="text-[12.5px] text-white/65 mb-4 leading-relaxed">{body}</p>
        <div className="flex justify-end gap-2">
          <GhostButton size="md" onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton size="sm" onClick={onConfirm}>{confirmLabel}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function ModeratorApp() {
  // ── Live store snapshots ─────────────────────────────────────────────
  const liveProgress = useStoreSnapshot(loadProgress);
  const liveSubmissions = useStoreSnapshot(loadSubmissions);
  const liveActivity = useStoreSnapshot(loadActivity);
  const liveAccessRequests = useStoreSnapshot(loadAccessRequests);

  // Tick once per second so "time on step" stays current even when the
  // store hasn't changed.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Merge static seed teams with whatever the simulator has broadcast.
  const teams: Team[] = useMemo(() => {
    return initialTeams.map((seed) => {
      const live = liveProgress.find((p) => p.teamId === seed.id);
      if (live) return liveTeamFromProgress(seed, live, now);
      const sub = liveSubmissions.find((s) => s.id === seed.id);
      if (sub) {
        const stake = stakeholders.find((s) => s.id === sub.stakeholderId);
        const ev = evidenceSources.find((e) => e.id === sub.evidenceSourceId);
        return {
          ...seed,
          currentStatus: "Submitted",
          currentStep: "Submitted",
          statusType: "complete",
          statusLabel: "Complete",
          attention: null,
          timeOnStep: "Done",
          confidence: sub.confidence,
          progress: {
            brief: "complete",
            stakeholder: "complete",
            interview: "complete",
            evidence: "complete",
            define: "complete",
            submit: "complete",
          },
          stakeholder: stake
            ? { name: stake.name, role: stake.role, image: stake.image }
            : seed.stakeholder,
          evidence: ev ? ev.title : seed.evidence,
          problemStatement: sub.problemStatement,
          assumptionToTest: sub.assumption,
          latestActivity: "Submitted problem statement",
        };
      }
      return seed;
    });
  }, [liveProgress, liveSubmissions, now]);

  const [drawerTeamId, setDrawerTeamId] = useState<string | null>(null);
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [confirmTeamId, setConfirmTeamId] = useState<string | null>(null);
  const { toast, show } = useToast();

  // Derive accessRequested from the shared store so it persists and is
  // visible to whichever participant tab is open.
  const accessRequested = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const r of liveAccessRequests) map[r.teamId] = true;
    return map;
  }, [liveAccessRequests]);

  const totals = useMemo(
    () => ({
      teams: teams.length,
      submitted: teams.filter((t) => t.statusType === "complete").length,
      needsAttention: teams.filter((t) => t.statusType === "attention").length,
    }),
    [teams],
  );

  const recipients = useMemo(
    () => [{ id: "all", label: "All Teams" }, ...teams.map((t) => ({ id: t.id, label: t.name }))],
    [teams],
  );

  const drawerTeam = teams.find((t) => t.id === drawerTeamId) ?? null;
  const confirmTeam = teams.find((t) => t.id === confirmTeamId) ?? null;

  // Merge live activity events with the static seed history, newest first.
  const activity = useMemo(() => {
    const liveItems = liveActivity.map((e: ActivityEvent) => ({
      time: formatClock(e.timestamp),
      text: e.text,
      tone: e.tone,
    }));
    return [...liveItems, ...initialActivity];
  }, [liveActivity]);

  const recordModeratorActivity = (text: string) => {
    appendActivity({
      teamId: "moderator",
      teamName: "Moderator",
      text,
      tone: "moderator",
    });
  };

  const handleSendNote = (recipientLabel: string, message: string) => {
    const recipientId =
      recipientLabel === "All Teams"
        ? "all"
        : (teams.find((t) => t.name === recipientLabel)?.id ?? "all");
    sendModeratorNote({ recipient: recipientId, recipientLabel, message });
    show(`Note sent to ${recipientLabel}.`);
    recordModeratorActivity(`Moderator note sent to ${recipientLabel}.`);
  };

  const handleSendNudge = (teamName: string) => {
    const team = teams.find((t) => t.name === teamName);
    sendModeratorNote({
      recipient: team?.id ?? "all",
      recipientLabel: teamName,
      message: `${teamName}: a quick nudge from the moderator — keep moving toward your problem statement.`,
    });
    show(`Nudge sent to ${teamName}.`);
    recordModeratorActivity(`Moderator nudge sent to ${teamName}.`);
  };

  const requestAccessConfirmed = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    requestAccess(teamId);
    show(`Access request sent to ${team.name}.`);
    recordModeratorActivity(`Access requested for ${team.name}`);
    setConfirmTeamId(null);
  };

  const markForDebrief = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const wasMarked = !!marked[teamId];
    setMarked((p) => ({ ...p, [teamId]: !wasMarked }));
    if (wasMarked) {
      show(`${team.name} unmarked for debrief.`);
      recordModeratorActivity(`${team.name} unmarked for debrief`);
    } else {
      show(`${team.name} marked for debrief.`);
      recordModeratorActivity(`${team.name} marked for debrief`);
    }
  };

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-[#100f24] via-[#100a23] to-[#110322]">
      {/* subtle radial glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(1200px 600px at 80% -10%, rgba(251,191,36,0.06), transparent), radial-gradient(900px 600px at -10% 30%, rgba(139,92,246,0.07), transparent)",
        }}
      />
      <div className="relative">
        <Header />

        <main className="max-w-[1400px] mx-auto px-6 py-6">
          {/* Title */}
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold text-white/95 tracking-tight">
                  Live Moderator Dashboard
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
                  <span className="relative inline-flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live Session Active
                </span>
              </div>
              <p className="text-[13px] text-white/55">
                Track team progress, support breakout groups, and prepare for the debrief.
              </p>
            </div>
          </div>

          {/* Workshop status sub-header */}
          <WorkshopStatus totals={totals} />

          {/* Live activity ticker */}
          <ActivityTicker items={activity} />

          {/* Team Progress — full width, two columns inside */}
          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-white/95">Team Progress</h2>
                <p className="text-[12px] text-white/50">Follow where each team is in the simulation journey.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {teams.map((t) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  marked={!!marked[t.id]}
                  accessRequested={!!accessRequested[t.id]}
                  onSendNote={() => {
                    show(`Send note dialog → ${t.name}. Use the Live Moderation Tools below.`);
                  }}
                  onRequestAccess={() => setConfirmTeamId(t.id)}
                  onView={() => setDrawerTeamId(t.id)}
                />
              ))}
            </div>
          </section>

          {/* Live Moderation Tools */}
          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-white/95">Live Moderation Tools</h2>
                <p className="text-[12px] text-white/50">Send guidance and support teams in the moment.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <SendNotePanel recipients={recipients} onSend={handleSendNote} />
              <TeamSupportPanel
                accessRequested={accessRequested}
                onSendNudge={handleSendNudge}
                onRequestAccess={(id) => setConfirmTeamId(id)}
                onView={(id) => setDrawerTeamId(id)}
              />
            </div>
          </section>

          <DebriefSection />

          <div className="mt-8 text-center text-[11px] text-white/30">
            Front-end prototype · static mock data · local state only
          </div>
        </main>
      </div>

      <TeamDrawer
        team={drawerTeam}
        marked={drawerTeam ? !!marked[drawerTeam.id] : false}
        accessRequested={drawerTeam ? !!accessRequested[drawerTeam.id] : false}
        onClose={() => setDrawerTeamId(null)}
        onSendNote={(teamName) => show(`Compose a note for ${teamName} in the Send Note panel.`)}
        onRequestAccess={(id) => setConfirmTeamId(id)}
        onMarkDebrief={markForDebrief}
      />

      <ConfirmModal
        open={!!confirmTeam}
        title={confirmTeam ? `Request access to ${confirmTeam.name}?` : ""}
        body="This will ask the team to let you view or join their workspace."
        confirmLabel="Send Request"
        onCancel={() => setConfirmTeamId(null)}
        onConfirm={() => confirmTeam && requestAccessConfirmed(confirmTeam.id)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
          <div className="rounded-full border border-emerald-400/30 bg-emerald-500/15 backdrop-blur-md px-4 py-2 text-[12.5px] text-emerald-100 shadow-lg flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="5 12 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
