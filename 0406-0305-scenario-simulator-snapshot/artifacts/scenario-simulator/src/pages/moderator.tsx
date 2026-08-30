import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useListSessions,
  useListSubmissions,
  useSetSessionFlag,
  useCreateSessionNote,
  useBroadcastNote,
  useCreateSessionAccessRequest,
  useListSessionAccessRequests,
  useListSessionNotes,
  useGetWorkshop,
  getGetWorkshopQueryKey,
  getListSessionsQueryKey,
  getListSubmissionsQueryKey,
  getListSessionAccessRequestsQueryKey,
  getListSessionNotesQueryKey,
  type Session,
  type AccessRequest,
  type ModeratorNote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { assets, stakeholders, evidenceSources, questions } from "../data/data";
import {
  moderator,
  noteTemplates,
  debriefThemes,
  debriefWatchouts,
  FLOW_STEPS,
  type Team,
  type StatusType,
  type StepState,
  type TeamProgress,
} from "../data/moderatorData";

// ─── Mapping: Session → Team ────────────────────────────────────────────────

const QUESTION_SCREENS = ["q1", "q2", "q3", "q4"] as const;

function blankProgress(): TeamProgress {
  return {
    brief: "notStarted",
    stakeholder: "notStarted",
    interview: "notStarted",
    evidence: "notStarted",
    define: "notStarted",
    submit: "notStarted",
  };
}

function formatTimeOnStep(ms: number, stepName: string): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  if (m < 1) return `<1m on ${stepName}`;
  if (m < 60) return `${m}m on ${stepName}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h on ${stepName}` : `${h}h ${rem}m on ${stepName}`;
}

const STEP_TIMING_LABELS: Record<string, string> = {
  brief: "Brief",
  stakeholder: "Stakeholder",
  interview: "Interview",
  evidence: "Evidence",
  define: "Define",
  submit: "Submit",
};
const STEP_TIMING_ORDER = [
  "brief",
  "stakeholder",
  "interview",
  "evidence",
  "define",
  "submit",
] as const;

function formatDurationShort(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface DerivedScreen {
  currentStep: Team["currentStep"];
  currentStatus: string;
  latestActivity: string;
  progress: TeamProgress;
}

function deriveFromScreen(
  screen: string,
  stakeholderId: string | null,
  evidenceSourceId: string | null,
  submitted: boolean,
): DerivedScreen {
  if (submitted) {
    return {
      currentStep: "Submitted",
      currentStatus: "Submitted problem statement",
      latestActivity: "Submitted problem statement",
      progress: {
        brief: "complete",
        stakeholder: "complete",
        interview: "complete",
        evidence: "complete",
        define: "complete",
        submit: "complete",
      },
    };
  }

  const set = (over: Partial<TeamProgress>): TeamProgress => ({ ...blankProgress(), ...over });
  const qIndex = (QUESTION_SCREENS as readonly string[]).indexOf(screen);
  if (qIndex >= 0) {
    return {
      currentStep: "Interview",
      currentStatus: `Asking Question ${qIndex + 1} of ${QUESTION_SCREENS.length}`,
      latestActivity: `Asking Question ${qIndex + 1} of ${QUESTION_SCREENS.length}`,
      progress: set({ brief: "complete", stakeholder: "complete", interview: "active" }),
    };
  }

  switch (screen) {
    case "entry":
      return {
        currentStep: "Brief",
        currentStatus: "Joining session",
        latestActivity: "Joined the session",
        progress: blankProgress(),
      };
    case "company":
      return {
        currentStep: "Brief",
        currentStatus: "Reviewing company brief",
        latestActivity: "Reviewing company overview",
        progress: set({ brief: "active" }),
      };
    case "scenario":
      return {
        currentStep: "Brief",
        currentStatus: "Reading scenario",
        latestActivity: "Reading scenario alert",
        progress: set({ brief: "active" }),
      };
    case "investigate":
      return {
        currentStep: "Stakeholders",
        currentStatus: stakeholderId ? "Confirming stakeholder choice" : "Choosing stakeholder",
        latestActivity: stakeholderId ? "Confirming stakeholder choice" : "Choosing stakeholder",
        progress: set({ brief: "complete", stakeholder: "active" }),
      };
    case "intro":
      return {
        currentStep: "Interview",
        currentStatus: "Preparing for interview",
        latestActivity: "Preparing for interview",
        progress: set({ brief: "complete", stakeholder: "complete", interview: "active" }),
      };
    case "evidence":
      return {
        currentStep: "Evidence",
        currentStatus: evidenceSourceId ? "Confirming evidence choice" : "Choosing evidence",
        latestActivity: evidenceSourceId ? "Confirming evidence choice" : "Choosing evidence",
        progress: set({
          brief: "complete",
          stakeholder: "complete",
          interview: "complete",
          evidence: "active",
        }),
      };
    case "evidence_reveal":
      return {
        currentStep: "Evidence",
        currentStatus: "Reviewing evidence",
        latestActivity: "Reviewing evidence",
        progress: set({
          brief: "complete",
          stakeholder: "complete",
          interview: "complete",
          evidence: "active",
        }),
      };
    case "insights":
      return {
        currentStep: "Define Problem",
        currentStatus: "Reviewing insights",
        latestActivity: "Reviewing investigation insights",
        progress: set({
          brief: "complete",
          stakeholder: "complete",
          interview: "complete",
          evidence: "complete",
          define: "active",
        }),
      };
    case "problem":
      return {
        currentStep: "Define Problem",
        currentStatus: "Writing problem statement",
        latestActivity: "Writing problem statement",
        progress: set({
          brief: "complete",
          stakeholder: "complete",
          interview: "complete",
          evidence: "complete",
          define: "active",
        }),
      };
    case "confirm":
      return {
        currentStep: "Submitted",
        currentStatus: "Submitted problem statement",
        latestActivity: "Submitted problem statement",
        progress: {
          brief: "complete",
          stakeholder: "complete",
          interview: "complete",
          evidence: "complete",
          define: "complete",
          submit: "complete",
        },
      };
    default:
      return {
        currentStep: "Brief",
        currentStatus: "Joining session",
        latestActivity: "Joined the session",
        progress: blankProgress(),
      };
  }
}

function sessionToTeam(s: Session, now: number): Team {
  const submitted = !!s.submittedAt;
  const derived = deriveFromScreen(
    s.currentScreen,
    s.selectedStakeholder ?? null,
    s.selectedEvidenceSource ?? null,
    submitted,
  );
  const stake = s.selectedStakeholder
    ? stakeholders.find((x) => x.id === s.selectedStakeholder)
    : null;
  const ev = s.selectedEvidenceSource
    ? evidenceSources.find((x) => x.id === s.selectedEvidenceSource)
    : null;

  // Derive elapsed time on current step from updatedAt as a proxy for
  // stepStartedAt. This is approximate but reflects real activity from the API.
  const updatedTs = new Date(s.updatedAt).getTime();
  const createdTs = new Date(s.createdAt).getTime();
  const stepStartedAt = s.currentScreen === "entry" || s.currentScreen === "company"
    ? createdTs
    : updatedTs;
  const elapsed = now - stepStartedAt;

  let statusType: StatusType;
  let statusLabel: string;
  let attention: string | null = null;

  if (submitted) {
    statusType = "complete";
    statusLabel = "Complete";
  } else if (s.currentScreen === "entry" || updatedTs === createdTs) {
    statusType = "notStarted";
    statusLabel = "Not started";
  } else if (elapsed > 9 * 60 * 1000) {
    statusType = "attention";
    statusLabel = "Needs attention";
    attention = `Slow on ${derived.currentStep.toLowerCase()}`;
  } else if (elapsed > 5 * 60 * 1000) {
    statusType = "slow";
    statusLabel = "Slightly slow";
  } else {
    statusType = "onTrack";
    statusLabel = "On track";
  }

  const capturedLearnings = (s.answers ?? [])
    .map((a) => questions.find((q) => q.id === a.questionId)?.learning ?? "")
    .filter(Boolean);

  return {
    id: s.id,
    name: s.teamName,
    currentStatus: derived.currentStatus,
    currentStep: derived.currentStep,
    stakeholder: stake
      ? { name: stake.name, role: stake.role, image: stake.image }
      : null,
    evidence: ev ? ev.title : null,
    latestActivity: derived.latestActivity,
    timeOnStep: submitted ? "Done" : formatTimeOnStep(elapsed, derived.currentStep),
    statusType,
    statusLabel,
    attention,
    confidence: (s.confidence as Team["confidence"]) ?? undefined,
    progress: derived.progress,
    problemStatement: s.problemStatement || null,
    assumptionToTest: s.assumption || undefined,
    capturedLearnings,
    flaggedForDebrief: s.flaggedForDebrief,
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

const STATUS_ORDER: StatusType[] = [
  "attention",
  "slow",
  "onTrack",
  "complete",
  "notStarted",
];

const STATUS_GROUP_LABEL: Record<StatusType, string> = {
  attention: "Needs attention",
  slow: "Slightly slow",
  onTrack: "On track",
  complete: "Complete",
  notStarted: "Not started",
};

const STATUS_GROUP_DESCRIPTION: Record<StatusType, string> = {
  attention: "Step over ~9 minutes — consider intervening.",
  slow: "Step running long — keep an eye on progress.",
  onTrack: "Working through the flow at a healthy pace.",
  complete: "Submitted their problem statement.",
  notStarted: "Joined but haven't started yet.",
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

// ─── Atoms ──────────────────────────────────────────────────────────────────

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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm ${className}`}>
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
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
  active?: boolean;
  disabled?: boolean;
}) {
  const sz = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${sz} inline-flex items-center gap-1 rounded-full border transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/[0.03] disabled:hover:text-white/70 ${
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

function Header({
  workshopLabel,
  workshopCode,
}: {
  workshopLabel: string;
  workshopCode: string;
}) {
  return (
    <header className="border-b border-white/[0.06] bg-[#100f24]/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <img src={assets.scenarioSimulatorLogo} alt="Scenario Simulator" className="h-7 w-auto" />
            <Pill tone="violet" className="ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />
              Moderator View
            </Pill>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Pill tone="muted">{workshopLabel}</Pill>
          <Pill tone="muted" className="hidden lg:inline-flex">
            {moderator.scenario}
          </Pill>
          <Link
            href={`/results/${workshopCode}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] px-3 py-1 text-[11px] font-medium text-white/70"
          >
            Submissions →
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Workshop status sub-header ────────────────────────────────────────────

function WorkshopStatus({
  totals,
  workshopLabel,
}: {
  totals: { teams: number; submitted: number; needsAttention: number };
  workshopLabel: string;
}) {
  return (
    <div className="border-b border-white/[0.06] pb-4 mb-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1.5">Workshop Status</div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="yellow">{workshopLabel}</Pill>
        <Pill tone="muted">{`${totals.teams} ${totals.teams === 1 ? "team" : "teams"}`}</Pill>
        <Pill tone="emerald">{`${totals.submitted} submitted`}</Pill>
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

function StepChips({ progress }: { progress: TeamProgress }) {
  const completed = FLOW_STEPS.filter(
    (s) => progress[s.key as keyof TeamProgress] === "complete",
  ).length;
  const total = FLOW_STEPS.length;
  const pct = (completed / total) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-white/55 shrink-0">
          {completed}/{total}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
      {FLOW_STEPS.map((s, i) => {
        const state = progress[s.key as keyof TeamProgress];
        const styles =
          state === "complete"
            ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200"
            : state === "active"
              ? "border-yellow-400/40 bg-yellow-400/[0.12] text-yellow-200 ring-1 ring-yellow-400/20"
              : "border-white/8 bg-white/[0.02] text-white/35";
        return (
          <div key={s.key} className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles}`}>
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
    </div>
  );
}

// ─── Team card ──────────────────────────────────────────────────────────────

function TeamCard({
  team,
  marked,
  onSendNote,
  onView,
}: {
  team: Team;
  marked: boolean;
  onSendNote: () => void;
  onView: () => void;
}) {
  const tone = STATUS_TONE[team.statusType];
  return (
    <Card className="p-4 hover:bg-white/[0.035] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[12px] font-bold text-white/80 ring-1 ${tone.ring}`}>
            {team.name.slice(0, 2).toUpperCase()}
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
          <span className="text-[10px] text-white/45">{team.timeOnStep}</span>
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
  const pct = max === 0 ? 0 : (count / max) * 100;
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

function DebriefSection({ teams }: { teams: Team[] }) {
  const stakeholderCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of teams) {
      if (t.stakeholder) map.set(t.stakeholder.name, (map.get(t.stakeholder.name) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [teams]);

  const evidenceCounts = useMemo(() => {
    const map = new Map<string, number>();
    let notSelected = 0;
    for (const t of teams) {
      if (t.evidence) map.set(t.evidence, (map.get(t.evidence) ?? 0) + 1);
      else notSelected += 1;
    }
    const items = Array.from(map.entries()).map(([name, count]) => ({ name, count, muted: false }));
    if (notSelected > 0) items.push({ name: "Not selected yet", count: notSelected, muted: true });
    return items;
  }, [teams]);

  const maxStake = Math.max(1, ...stakeholderCounts.map((s) => s.count));
  const maxEv = Math.max(1, ...evidenceCounts.map((s) => s.count));

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-white/95">Debrief Signals</h2>
          <p className="text-[12px] text-white/50">Emerging patterns to bring back into the main room.</p>
        </div>
      </div>

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
            {stakeholderCounts.length === 0 ? (
              <div className="text-[11.5px] text-white/40 italic">No stakeholders selected yet</div>
            ) : (
              stakeholderCounts.map((s) => (
                <CountBar key={s.name} name={s.name} count={s.count} max={maxStake} />
              ))
            )}
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">Evidence selected</div>
          <div className="space-y-1.5">
            {evidenceCounts.length === 0 ? (
              <div className="text-[11.5px] text-white/40 italic">No evidence selected yet</div>
            ) : (
              evidenceCounts.map((s) => (
                <CountBar key={s.name} name={s.name} count={s.count} max={maxEv} muted={s.muted} />
              ))
            )}
          </div>
        </Card>

        <Card className="p-3.5">
          <h3 className="text-[12.5px] font-semibold text-white/90 mb-2">Emerging themes</h3>
          <ul className="space-y-2">
            {debriefThemes.map((t, i) => (
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
            {debriefWatchouts.map((t, i) => (
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

type ActivityKind = "submission" | "selection" | "moderator" | "attention";

interface ActivityItem {
  timestampMs: number;
  text: string;
  kind: ActivityKind;
  teamId?: string;
}

const KIND_TEXT: Record<ActivityKind, string> = {
  submission: "text-emerald-200",
  selection: "text-violet-200",
  moderator: "text-yellow-200",
  attention: "text-orange-200",
};

const KIND_BORDER: Record<ActivityKind, string> = {
  submission: "border-l-emerald-400/55",
  selection: "border-l-violet-400/55",
  moderator: "border-l-yellow-400/55",
  attention: "border-l-orange-400/60",
};

const KIND_BG: Record<ActivityKind, string> = {
  submission: "bg-emerald-400/[0.10] border-emerald-400/30 text-emerald-200",
  selection: "bg-violet-400/[0.10] border-violet-400/30 text-violet-200",
  moderator: "bg-yellow-400/[0.10] border-yellow-400/30 text-yellow-200",
  attention: "bg-orange-400/[0.10] border-orange-400/30 text-orange-200",
};

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const cls = `w-4 h-4 inline-flex items-center justify-center rounded-md border ${KIND_BG[kind]}`;
  if (kind === "submission") {
    return (
      <span className={cls} aria-hidden>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="5 12 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (kind === "selection") {
    return (
      <span className={cls} aria-hidden>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }
  if (kind === "moderator") {
    return (
      <span className={cls} aria-hidden>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 11v2l13 5V6L3 11z" strokeLinejoin="round" />
          <path d="M16 8a4 4 0 0 1 0 8" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className={cls} aria-hidden>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M12 3l10 18H2L12 3z" strokeLinejoin="round" />
        <path d="M12 10v4M12 17.5v.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const FILTER_OPTIONS: { id: ActivityKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "submission", label: "Submissions only" },
  { id: "selection", label: "Selections" },
  { id: "moderator", label: "Moderator actions" },
  { id: "attention", label: "Attention" },
];

const KIND_TO_SECTION: Record<ActivityKind, string | null> = {
  submission: "problem-statement",
  selection: "investigation-path",
  attention: "current-status",
  moderator: null,
};

function ActivityTicker({
  items,
  now,
  onSelectTeam,
}: {
  items: ActivityItem[];
  now: number;
  onSelectTeam: (teamId: string, section: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<ActivityKind | "all">("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.kind] = (c[it.kind] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((it) => it.kind === filter)),
    [items, filter],
  );
  const latest = filtered[0];

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300/90 shrink-0">
          <span className="relative inline-flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
        <span className="h-4 w-px bg-white/10 shrink-0" />
        {latest ? (
          latest.teamId ? (
            <button
              type="button"
              onClick={() => onSelectTeam(latest.teamId!, KIND_TO_SECTION[latest.kind])}
              className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-md px-1 -mx-1 hover:bg-white/[0.05] focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-400/60 transition-colors"
              title="Open team details"
            >
              <ActivityIcon kind={latest.kind} />
              <span className={`text-[12px] truncate ${KIND_TEXT[latest.kind]}`}>{latest.text}</span>
              <span className="font-mono text-[10.5px] text-white/40 shrink-0 ml-auto">
                {formatRelative(latest.timestampMs, now)}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1 italic opacity-80">
              <ActivityIcon kind={latest.kind} />
              <span className={`text-[12px] truncate ${KIND_TEXT[latest.kind]}`}>{latest.text}</span>
              <span className="font-mono text-[10.5px] text-white/40 shrink-0 ml-auto">
                {formatRelative(latest.timestampMs, now)}
              </span>
            </div>
          )
        ) : (
          <span className="text-[12px] text-white/40 flex-1">
            {filter === "all" ? "Waiting for activity…" : "No matching activity yet."}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 inline-flex items-center gap-1 text-[10.5px] text-white/55 hover:text-white/80 shrink-0"
          aria-expanded={expanded}
        >
          {expanded ? "Hide" : "Show all"}
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
        </button>
      </div>

      <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.04] pt-2.5">
        {FILTER_OPTIONS.map((opt) => {
          const n = counts[opt.id] ?? 0;
          const active = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                active
                  ? "border-yellow-400/40 bg-yellow-400/[0.10] text-yellow-200"
                  : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06] hover:text-white/85"
              }`}
              aria-pressed={active}
            >
              {opt.label}
              <span className={`tabular-nums text-[10px] ${active ? "text-yellow-200/85" : "text-white/45"}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 max-h-[320px] overflow-y-auto space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-[12px] text-white/40 italic py-2">No matching activity.</div>
          ) : (
            filtered.map((it, i) => {
              const rowClass = `w-full text-left pl-2.5 border-l-2 ${KIND_BORDER[it.kind]} text-[11.5px] leading-snug ${KIND_TEXT[it.kind]} flex items-start gap-2 py-1 rounded-r-md`;
              const inner = (
                <>
                  <ActivityIcon kind={it.kind} />
                  <span className="flex-1">{it.text}</span>
                  <span
                    className="font-mono text-[10.5px] text-white/40 shrink-0"
                    title={new Date(it.timestampMs).toLocaleString()}
                  >
                    {formatRelative(it.timestampMs, now)}
                  </span>
                </>
              );
              if (it.teamId) {
                return (
                  <button
                    key={`${it.timestampMs}-${i}`}
                    type="button"
                    onClick={() => onSelectTeam(it.teamId!, KIND_TO_SECTION[it.kind])}
                    className={`${rowClass} hover:bg-white/[0.05] focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-400/60 transition-colors cursor-pointer`}
                    title="Open team details"
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <div
                  key={`${it.timestampMs}-${i}`}
                  className={`${rowClass} italic opacity-80`}
                >
                  {inner}
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Send note panel (local, ephemeral) ─────────────────────────────────────

function SendNotePanel({
  recipients,
  busy,
  onSend,
}: {
  recipients: { id: string; label: string }[];
  busy: boolean;
  onSend: (
    recipientId: string,
    recipientLabel: string,
    message: string,
    templateId: string | null,
  ) => Promise<void> | void;
}) {
  const [recipient, setRecipient] = useState(recipients[0]?.id ?? "all");
  const [activeTpl, setActiveTpl] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!recipients.find((r) => r.id === recipient)) {
      setRecipient(recipients[0]?.id ?? "all");
    }
  }, [recipients, recipient]);

  const send = async () => {
    if (!message.trim()) return;
    const label = recipients.find((r) => r.id === recipient)?.label ?? "All Teams";
    await onSend(recipient, label, message.trim(), activeTpl);
    setMessage("");
    setActiveTpl(null);
  };

  return (
    <Card className="p-3.5">
      <div className="mb-2.5">
        <h3 className="text-[13px] font-semibold text-white/95">Send Note</h3>
        <p className="text-[11px] text-white/45">Sent live to the selected team's screen.</p>
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
        <PrimaryButton size="sm" onClick={send} disabled={!message.trim() || busy}>
          {busy ? "Sending…" : "Send Note"}
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
  attentionTeams,
  onSendNudge,
  onView,
}: {
  attentionTeams: Team[];
  onSendNudge: (teamId: string, teamName: string) => void;
  onView: (teamId: string) => void;
}) {
  return (
    <Card className="p-3.5">
      <div className="mb-2.5">
        <h3 className="text-[13px] font-semibold text-white/95">Team Support</h3>
        <p className="text-[11px] text-white/45">Teams that may need a nudge.</p>
      </div>
      {attentionTeams.length === 0 ? (
        <div className="text-[12px] text-white/40 italic px-1 py-2">No teams need attention right now.</div>
      ) : (
        <div className="space-y-2">
          {attentionTeams.map((t) => (
            <div key={t.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[12px] font-semibold text-white/90">{t.name}</div>
                <Pill tone="orange">{t.attention ?? t.statusLabel}</Pill>
              </div>
              <div className="flex items-center gap-1.5">
                <GhostButton onClick={() => onSendNudge(t.id, t.name)}>Send nudge</GhostButton>
                <button
                  type="button"
                  onClick={() => onView(t.id)}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-yellow-200 hover:text-yellow-100"
                >
                  View details
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Drawer ─────────────────────────────────────────────────────────────────

function TeamDrawer({
  team,
  rawSession,
  marked,
  busy,
  now,
  onClose,
  onSendNote,
  onMarkDebrief,
  onRequestAccess,
  scrollToSectionId,
}: {
  team: Team | null;
  rawSession: Session | null;
  marked: boolean;
  busy: boolean;
  now: number;
  onClose: () => void;
  onSendNote: (teamName: string) => void;
  onMarkDebrief: (teamId: string) => void;
  onRequestAccess: (teamId: string) => void;
  scrollToSectionId?: string | null;
}) {
  const sessionId = team?.id ?? "";
  const asideRef = React.useRef<HTMLElement>(null);
  useEffect(() => {
    if (!team || !scrollToSectionId) return;
    const id = window.requestAnimationFrame(() => {
      const el = asideRef.current?.querySelector(
        `[data-drawer-section="${scrollToSectionId}"]`,
      );
      if (el && "scrollIntoView" in el) {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [team, scrollToSectionId]);
  const { data: accessRequests = [] } = useListSessionAccessRequests(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListSessionAccessRequestsQueryKey(sessionId),
      refetchInterval: 15000,
    },
  });
  const hasPendingAccess = accessRequests.some((r) => r.status === "pending");
  if (!team) return null;
  const tone = STATUS_TONE[team.statusType];
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside
        ref={asideRef}
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
          <section data-drawer-section="current-status">
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

          <section data-drawer-section="step-timeline">
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">Step timeline</h3>
            <Card className="p-3">
              <StepTimeline rawSession={rawSession} now={now} />
            </Card>
          </section>

          <section data-drawer-section="investigation-path">
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

          {team.capturedLearnings.length > 0 && (
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
          )}

          <section data-drawer-section="problem-statement">
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
            </Card>
          </section>

          <NotesHistorySection sessionId={team.id} />

          <AccessRequestsSection sessionId={team.id} />

          {rawSession && (
            <section>
              <details className="group rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <summary className="flex items-center justify-between cursor-pointer list-none px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-white/55 hover:text-white/80">
                  <span className="inline-flex items-center gap-2">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="transition-transform group-open:rotate-90"
                    >
                      <polyline points="9 6 15 12 9 18" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Raw session payload
                  </span>
                  <span className="font-mono text-[10px] text-white/35 normal-case tracking-normal">
                    Updated {new Date(rawSession.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </summary>
                <pre className="px-3 pb-3 text-[10.5px] leading-relaxed text-white/65 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(rawSession, null, 2)}
                </pre>
              </details>
            </section>
          )}

          <section>
            <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">Moderator actions</h3>
            <div className="flex flex-wrap gap-2">
              <GhostButton size="md" onClick={() => onSendNote(team.name)}>Send note to this team</GhostButton>
              <GhostButton size="md" onClick={() => onMarkDebrief(team.id)} active={marked}>
                {marked ? "✓ Marked for debrief — click to unmark" : "Mark for debrief"}
              </GhostButton>
              <GhostButton
                size="md"
                onClick={() => onRequestAccess(team.id)}
                disabled={busy || hasPendingAccess}
              >
                {hasPendingAccess
                  ? "Access request pending…"
                  : busy
                    ? "Requesting…"
                    : "Request screen access"}
              </GhostButton>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

// ─── Step timeline (drawer) ────────────────────────────────────────────────

function StepTimeline({
  rawSession,
  now,
}: {
  rawSession: Session | null;
  now: number;
}) {
  const timings = rawSession?.stepTimings;
  if (!timings) {
    return (
      <p className="text-[12px] text-white/45">No step activity recorded yet.</p>
    );
  }
  const totals = { ...(timings.totals ?? {}) } as Record<string, number>;
  const currentStep = timings.currentStep ?? null;
  const startedAt = timings.currentStepStartedAt
    ? new Date(timings.currentStepStartedAt).getTime()
    : null;
  if (currentStep && startedAt) {
    totals[currentStep] =
      (totals[currentStep] ?? 0) + Math.max(0, now - startedAt);
  }
  const rows = STEP_TIMING_ORDER.filter(
    (k) => (totals[k] ?? 0) > 0 || k === currentStep,
  );
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-white/45">No step activity recorded yet.</p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((k) => {
        const isActive = k === currentStep;
        const ms = totals[k] ?? 0;
        return (
          <li
            key={k}
            className="flex items-center justify-between text-[12px]"
          >
            <span className="inline-flex items-center gap-2 text-white/80">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive
                    ? "bg-yellow-300 animate-pulse"
                    : "bg-emerald-400/80"
                }`}
              />
              <span className="font-medium">{STEP_TIMING_LABELS[k]}</span>
              {isActive && (
                <span className="text-[10px] uppercase tracking-[0.14em] text-yellow-200/80">
                  on step
                </span>
              )}
            </span>
            <span className="font-mono tabular-nums text-white/70">
              {formatDurationShort(ms)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Notes history section (drawer) ────────────────────────────────────────

function NotesHistorySection({ sessionId }: { sessionId: string }) {
  const { data: notes = [] } = useListSessionNotes(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListSessionNotesQueryKey(sessionId),
      refetchInterval: 15000,
    },
  });

  if (notes.length === 0) {
    return (
      <section>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">
          Recent notes sent
        </h3>
        <Card className="p-3">
          <div className="text-[12px] text-white/40 italic">
            No notes have been sent to this team yet.
          </div>
        </Card>
      </section>
    );
  }

  const sorted = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const recent = sorted.slice(0, 5);

  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">
        Recent notes sent
      </h3>
      <Card className="p-3 space-y-2">
        {recent.map((n) => (
          <NoteHistoryRow key={n.id} note={n} />
        ))}
      </Card>
    </section>
  );
}

function NoteHistoryRow({ note }: { note: ModeratorNote }) {
  const sentTime = new Date(note.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dismissed = !!note.dismissedAt;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <Pill tone={dismissed ? "muted" : "yellow"}>
          {dismissed ? "Dismissed" : "Visible"}
        </Pill>
        <span className="font-mono text-[10px] text-white/40">
          Sent {sentTime}
        </span>
      </div>
      <p className="text-[12px] text-white/85 leading-snug">{note.message}</p>
    </div>
  );
}

// ─── Access requests section (drawer) ──────────────────────────────────────

function AccessRequestsSection({ sessionId }: { sessionId: string }) {
  const { data: requests = [] } = useListSessionAccessRequests(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListSessionAccessRequestsQueryKey(sessionId),
      refetchInterval: 15000,
    },
  });

  if (requests.length === 0) return null;

  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const recent = sorted.slice(0, 4);

  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-white/45 mb-2">
        Screen access requests
      </h3>
      <Card className="p-3 space-y-1.5">
        {recent.map((r) => (
          <AccessRequestRow key={r.id} request={r} />
        ))}
      </Card>
    </section>
  );
}

function AccessRequestRow({ request }: { request: AccessRequest }) {
  const tone =
    request.status === "pending"
      ? "violet"
      : request.status === "granted"
        ? "emerald"
        : "muted";
  const label =
    request.status === "pending"
      ? "Pending"
      : request.status === "granted"
        ? "Granted"
        : "Declined";
  const ts = request.respondedAt ?? request.createdAt;
  const time = new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <div className="flex items-center gap-2">
        <Pill tone={tone}>{label}</Pill>
        <span className="text-white/55">
          {request.status === "pending" ? "Awaiting team response" : `Responded at ${time}`}
        </span>
      </div>
      <span className="font-mono text-[10px] text-white/35">{`Sent ${new Date(request.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}</span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ModeratorDashboard() {
  const routeParams = useParams<{ code: string }>();
  const workshopCode = (routeParams?.code ?? "").toUpperCase();
  const workshopQuery = useGetWorkshop(workshopCode, {
    query: {
      enabled: !!workshopCode,
      queryKey: getGetWorkshopQueryKey(workshopCode),
    },
  });
  const sessionsParams = { workshopCode };
  const { data: rawSessions = [], isLoading } = useListSessions(sessionsParams, {
    query: {
      refetchInterval: 5000,
      queryKey: getListSessionsQueryKey(sessionsParams),
      enabled: !!workshopCode,
    },
  });
  // Submissions query is also kept warm so cross-links to /results stay fresh.
  useListSubmissions(sessionsParams, {
    query: {
      refetchInterval: 5000,
      queryKey: getListSubmissionsQueryKey(sessionsParams),
      enabled: !!workshopCode,
    },
  });
  const workshopLabel = workshopQuery.data?.label ?? `Workshop ${workshopCode}`;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const teams = useMemo<Team[]>(() => {
    return [...rawSessions]
      .sort((a, b) => a.teamName.localeCompare(b.teamName))
      .map((s) => sessionToTeam(s, now));
  }, [rawSessions, now]);

  const [drawerTeamId, setDrawerTeamId] = useState<string | null>(null);
  const [drawerSection, setDrawerSection] = useState<string | null>(null);
  const openDrawer = (id: string, section: string | null = null) => {
    setDrawerTeamId(id);
    setDrawerSection(section);
  };
  const { toast, show } = useToast();
  const queryClient = useQueryClient();

  const setFlag = useSetSessionFlag();
  const createNote = useCreateSessionNote();
  const broadcastNote = useBroadcastNote();
  const requestAccess = useCreateSessionAccessRequest();

  const marked = useMemo<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const t of teams) m[t.id] = t.flaggedForDebrief;
    return m;
  }, [teams]);

  const invalidateSessions = () =>
    queryClient.invalidateQueries({
      queryKey: getListSessionsQueryKey({ workshopCode }),
    });

  // Subscribe to SSE so moderator-side mutations from anywhere stay live.
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource(
          workshopCode
            ? `/api/events?workshopCode=${encodeURIComponent(workshopCode)}`
            : "/api/events",
        );
      } catch {
        scheduleReconnect();
        return;
      }
      const onChange = (ev?: Event) => {
        // Filter out events from other workshops to avoid cross-talk.
        if (ev instanceof MessageEvent) {
          try {
            const payload = JSON.parse(ev.data) as { workshopCode?: string };
            if (
              payload.workshopCode &&
              workshopCode &&
              payload.workshopCode !== workshopCode
            ) {
              return;
            }
          } catch {
            /* fall through and refetch */
          }
        }
        invalidateSessions();
      };
      es.addEventListener("flag.changed", onChange);
      es.addEventListener("submission.created", onChange);
      es.addEventListener("submission.updated", onChange);
      es.addEventListener("submission.deleted", onChange);
      const onAccess = (e: Event) => {
        try {
          const payload = JSON.parse((e as MessageEvent).data) as {
            sessionId?: string;
          };
          if (payload.sessionId) {
            queryClient.invalidateQueries({
              queryKey: getListSessionAccessRequestsQueryKey(payload.sessionId),
            });
          }
        } catch {
          /* ignore */
        }
      };
      es.addEventListener("access.requested", onAccess);
      es.addEventListener("access.responded", onAccess);
      const onNote = (e: Event) => {
        try {
          const payload = JSON.parse((e as MessageEvent).data) as {
            sessionId?: string;
            workshopCode?: string;
          };
          if (
            payload.workshopCode &&
            workshopCode &&
            payload.workshopCode !== workshopCode
          ) {
            return;
          }
          if (payload.sessionId) {
            queryClient.invalidateQueries({
              queryKey: getListSessionNotesQueryKey(payload.sessionId),
            });
          }
        } catch {
          /* ignore */
        }
      };
      es.addEventListener("note.created", onNote);
      es.addEventListener("note.dismissed", onNote);
      es.onerror = () => {
        es?.close();
        es = null;
        scheduleReconnect();
      };
    };
    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 3000);
    };
    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, workshopCode]);

  // Activity is derived from session updates and is local/ephemeral.
  const [moderatorActivity, setModeratorActivity] = useState<ActivityItem[]>([]);
  const recordActivity = (
    text: string,
    kind: ActivityKind = "moderator",
    teamId?: string,
  ) => {
    setModeratorActivity((prev) =>
      [{ timestampMs: Date.now(), text, kind, teamId }, ...prev].slice(0, 50),
    );
  };

  // Build a rolling activity log from session submissions and attention flags.
  const submissionActivity = useMemo<ActivityItem[]>(() => {
    return rawSessions
      .filter((s) => s.submittedAt)
      .map((s) => ({
        timestampMs: new Date(s.submittedAt!).getTime(),
        text: `${s.teamName} submitted problem statement`,
        kind: "submission" as const,
        teamId: s.id,
      }));
  }, [rawSessions]);

  const selectionActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const s of rawSessions) {
      if (s.submittedAt) continue;
      const updatedTs = new Date(s.updatedAt).getTime();
      if (s.selectedEvidenceSource) {
        const ev = evidenceSources.find((e) => e.id === s.selectedEvidenceSource);
        items.push({
          timestampMs: updatedTs,
          text: `${s.teamName} reviewing evidence: ${ev?.title ?? s.selectedEvidenceSource}`,
          kind: "selection",
          teamId: s.id,
        });
      } else if (s.selectedStakeholder) {
        const st = stakeholders.find((x) => x.id === s.selectedStakeholder);
        items.push({
          timestampMs: updatedTs,
          text: `${s.teamName} chose stakeholder: ${st?.name ?? s.selectedStakeholder}`,
          kind: "selection",
          teamId: s.id,
        });
      }
    }
    return items;
  }, [rawSessions]);

  const attentionActivity = useMemo<ActivityItem[]>(() => {
    return teams
      .filter((t) => t.statusType === "attention")
      .map((t) => ({
        // Use the underlying session's updatedAt so the relative timestamp is
        // stable rather than ticking with `now`.
        timestampMs: (() => {
          const raw = rawSessions.find((s) => s.id === t.id);
          return raw ? new Date(raw.updatedAt).getTime() : now;
        })(),
        text: `${t.name}: ${t.attention}`,
        kind: "attention" as const,
        teamId: t.id,
      }));
  }, [teams, rawSessions, now]);

  const activity = useMemo<ActivityItem[]>(
    () =>
      [
        ...moderatorActivity,
        ...attentionActivity,
        ...submissionActivity,
        ...selectionActivity,
      ].sort((a, b) => b.timestampMs - a.timestampMs),
    [moderatorActivity, attentionActivity, submissionActivity, selectionActivity],
  );

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
  const drawerRawSession =
    drawerTeamId ? rawSessions.find((s) => s.id === drawerTeamId) ?? null : null;
  const attentionTeams = teams.filter((t) => t.statusType === "attention" || t.statusType === "slow");

  const groupedTeams = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        teams: teams.filter((t) => t.statusType === status),
      })).filter((g) => g.teams.length > 0),
    [teams],
  );

  const truncate = (msg: string) =>
    `"${msg.slice(0, 60)}${msg.length > 60 ? "…" : ""}"`;

  const handleSendNote = async (
    recipientId: string,
    recipientLabel: string,
    message: string,
    templateId: string | null,
  ) => {
    try {
      if (recipientId === "all") {
        await broadcastNote.mutateAsync({
          data: { message, templateId, workshopCode },
        });
        show(`Note sent to all teams.`);
        recordActivity(
          `Note sent to All Teams: ${truncate(message)}`,
          "moderator",
        );
      } else {
        await createNote.mutateAsync({
          id: recipientId,
          data: { message, templateId },
        });
        show(`Note sent to ${recipientLabel}.`);
        recordActivity(
          `Note sent to ${recipientLabel}: ${truncate(message)}`,
          "moderator",
          recipientId,
        );
      }
    } catch (err) {
      show(`Couldn't send note. Try again.`);
      recordActivity(
        `Failed to send note to ${recipientLabel}.`,
        "attention",
        recipientId === "all" ? undefined : recipientId,
      );
    }
  };

  const handleSendNudge = async (teamId: string, teamName: string) => {
    try {
      await createNote.mutateAsync({
        id: teamId,
        data: {
          message: `Heads up — looks like you may need a quick check-in. Anything blocking the team?`,
          templateId: "nudge",
        },
      });
      show(`Nudge sent to ${teamName}.`);
      recordActivity(`Nudge sent to ${teamName}.`, "moderator", teamId);
    } catch {
      show(`Couldn't send nudge. Try again.`);
    }
  };

  const markForDebrief = async (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const wasMarked = !!marked[teamId];
    try {
      await setFlag.mutateAsync({
        id: teamId,
        data: { flagged: !wasMarked },
      });
      invalidateSessions();
      if (wasMarked) {
        show(`${team.name} unmarked for debrief.`);
        recordActivity(`${team.name} unmarked for debrief`, "moderator", teamId);
      } else {
        show(`${team.name} marked for debrief.`);
        recordActivity(`${team.name} marked for debrief`, "moderator", teamId);
      }
    } catch {
      show(`Couldn't update flag. Try again.`);
    }
  };

  const handleRequestAccess = async (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    try {
      await requestAccess.mutateAsync({ id: teamId });
      show(`Access request sent to ${team.name}.`);
      recordActivity(`Access requested from ${team.name}.`, "moderator", teamId);
    } catch {
      show(`Couldn't request access. Try again.`);
    }
  };

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-[#100f24] via-[#100a23] to-[#110322]">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(1200px 600px at 80% -10%, rgba(251,191,36,0.06), transparent), radial-gradient(900px 600px at -10% 30%, rgba(139,92,246,0.07), transparent)",
        }}
      />
      <div className="relative">
        <Header workshopLabel={workshopLabel} workshopCode={workshopCode} />

        <main className="max-w-[1400px] mx-auto px-6 py-6">
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

          <WorkshopStatus totals={totals} workshopLabel={workshopLabel} />

          <ActivityTicker
            items={activity}
            now={now}
            onSelectTeam={(id, section) => openDrawer(id, section)}
          />

          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-white/95">Team Progress</h2>
                <p className="text-[12px] text-white/50">Follow where each team is in the simulation journey.</p>
              </div>
            </div>
            {isLoading ? (
              <div className="text-white/50 text-center py-10">Loading teams…</div>
            ) : teams.length === 0 ? (
              <Card className="p-10 text-center">
                <div className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
                  <span className="w-3 h-3 rounded-full bg-white/20 animate-pulse" />
                </div>
                <h3 className="text-white font-medium mb-1">Waiting for teams</h3>
                <p className="text-white/40 text-sm">Once teams join the simulation, they will appear here.</p>
              </Card>
            ) : (
              <div className="space-y-5">
                {groupedTeams.map(({ status, teams: groupTeams }) => {
                  const tone = STATUS_TONE[status];
                  return (
                    <div key={status}>
                      <div className="flex items-baseline justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                            {STATUS_GROUP_LABEL[status]}
                          </span>
                          <span className="inline-flex items-center justify-center min-w-[1.4rem] h-5 rounded-full border border-white/10 bg-white/[0.04] px-1.5 text-[10.5px] font-semibold tabular-nums text-white/75">
                            {groupTeams.length}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/40 hidden sm:block">
                          {STATUS_GROUP_DESCRIPTION[status]}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {groupTeams.map((t) => (
                          <TeamCard
                            key={t.id}
                            team={t}
                            marked={!!marked[t.id]}
                            onSendNote={() => show(`Use the Send Note panel below to message ${t.name}.`)}
                            onView={() => openDrawer(t.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-white/95">Live Moderation Tools</h2>
                <p className="text-[12px] text-white/50">Send guidance and support teams in the moment.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <SendNotePanel
                recipients={recipients}
                busy={createNote.isPending || broadcastNote.isPending}
                onSend={handleSendNote}
              />
              <TeamSupportPanel
                attentionTeams={attentionTeams}
                onSendNudge={(teamId, teamName) => handleSendNudge(teamId, teamName)}
                onView={(id) => openDrawer(id)}
              />
            </div>
          </section>

          <DebriefSection teams={teams} />
        </main>
      </div>

      <TeamDrawer
        team={drawerTeam}
        rawSession={drawerRawSession}
        now={now}
        marked={drawerTeam ? !!marked[drawerTeam.id] : false}
        busy={requestAccess.isPending}
        onClose={() => {
          setDrawerTeamId(null);
          setDrawerSection(null);
        }}
        scrollToSectionId={drawerSection}
        onSendNote={(teamName) => show(`Compose a note for ${teamName} in the Send Note panel.`)}
        onMarkDebrief={markForDebrief}
        onRequestAccess={handleRequestAccess}
      />

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
