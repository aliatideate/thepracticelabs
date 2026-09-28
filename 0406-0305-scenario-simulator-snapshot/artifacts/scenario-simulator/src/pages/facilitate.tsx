import React, { useState } from "react";
import {
  getListSessionsQueryKey,
  useListSessions,
} from "@workspace/api-client-react";
import { DEMAND_TRY_WORKSHOP_CODE, WORKSHOP_CODE, formatTeamLabel } from "../lib/constants";
import { Bookmark, PencilLine, Phone, RotateCcw, X } from "lucide-react";
import { Header, SecondaryButton } from "../simulation/components";
import { useScenario, type Scenario } from "../lib/scenario";
import { playPhoneRing } from "../lib/phoneRing";
import { formatCountdown, isExpired, remainingMs, type SessionConfig } from "../lib/timer";
import { ActivityTabs } from "./activityTabs";
import { DownloadMenu } from "./facilitatorDownload";

function secretHeader(secret: string) {
  return { "x-facilitator-secret": secret };
}

type TeamSnapshot = {
  id: string;
  teamName: string;
  displayName?: string | null;
  emoji?: string | null;
  currentScreen: string;
  selectedStakeholder: string | null;
  selectedEvidenceSource: string | null;
  answers?: { questionId: string }[];
  problemStatement?: string | null;
  confidence?: "Low" | "Medium" | "High" | null;
  flaggedForDebrief?: boolean;
  createdAt?: string;
  submittedAt?: string | null;
};

type ArchiveSummary = {
  id: string;
  savedAt: string;
  teamCount: number;
  submittedCount: number;
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  scenarioId: string;
};

type ArchiveDetail = ArchiveSummary & {
  payload: {
    scenarioId: string;
    clock: { startedAt: string | null; endedAt: string | null; durationMinutes: number };
    teams: TeamSnapshot[];
  };
};

function formatArchiveDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatArchiveTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function TeamProgressCard({
  s,
  scenario,
  onClearAttention,
  onRelease,
}: {
  s: TeamSnapshot;
  scenario: Scenario;
  onClearAttention?: (id: string) => void;
  onRelease?: (id: string) => void;
}) {
  const sh = scenario.stakeholders.find((x) => x.id === s.selectedStakeholder);
  const ev = scenario.evidence.find((x) => x.id === s.selectedEvidenceSource);
  const questions =
    (s.answers ?? []).length === 0 ? (
      "—"
    ) : (
      <ol className="m-0 pl-4 space-y-1">
        {(s.answers ?? []).map((a) => {
          const q = sh?.questions.find((qq) => qq.id === a.questionId);
          return <li key={a.questionId}>{q?.text ?? a.questionId}</li>;
        })}
      </ol>
    );
  const confidence = s.confidence ? (
    <span className="inline-flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          s.confidence === "Low"
            ? "bg-[#B42318]"
            : s.confidence === "High"
              ? "bg-[#2E7D5B]"
              : "bg-[#B7791F]"
        }`}
      />
      {s.confidence}
    </span>
  ) : (
    "—"
  );
  return (
    <article className="bg-white border border-[#E7E4DD] rounded-xl overflow-hidden">
      <table className="w-full text-[15px]">
        <tbody>
          <tr className="border-b border-[#E7E4DD]">
            <td colSpan={6} className="p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[14px] text-[#6C6975]">{s.teamName}: </span>
                  <span className="font-semibold">{formatTeamLabel(s)}</span>
                </div>
                {onClearAttention && (
                  <button
                    type="button"
                    onClick={() => s.flaggedForDebrief && onClearAttention(s.id)}
                    className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[14px] font-medium ${
                      s.flaggedForDebrief
                        ? "tpl-attention-pulse border-[#B42318] bg-[#B42318] text-white"
                        : "border-[#E7E4DD] bg-[#F8F6EF] text-[#6C6975]"
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
                    Attention requested
                  </button>
                )}
              </div>
            </td>
          </tr>
          <tr className="text-left border-b border-[#E7E4DD] bg-[#F8F6EF]">
            <th className="p-3 font-semibold">Current step</th>
            <th className="p-3 font-semibold">Stakeholder</th>
            <th className="p-3 font-semibold">Questions asked</th>
            <th className="p-3 font-semibold">Evidence source</th>
            <th className="p-3 font-semibold">Problem statement</th>
            <th className="p-3 font-semibold">Confidence</th>
          </tr>
          <tr className="border-b border-[#E7E4DD] align-top">
            <td className="p-3">
              {s.currentScreen
                ? s.currentScreen.charAt(0).toUpperCase() + s.currentScreen.slice(1)
                : "—"}
            </td>
            <td className="p-3">{sh?.name ?? "—"}</td>
            <td className="p-3 text-[14px]">{questions}</td>
            <td className="p-3">{ev?.title ?? "—"}</td>
            <td className="p-3 text-[14px] whitespace-pre-wrap">
              {s.problemStatement?.trim() || "—"}
            </td>
            <td className="p-3">{confidence}</td>
          </tr>
          {onRelease && (
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right">
                <button
                  type="button"
                  className="text-[#B42318] underline text-[14px]"
                  onClick={() => onRelease(s.id)}
                >
                  Release slot
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </article>
  );
}

export default function FacilitatePage({ secret }: { secret: string }) {
  const scenario = useScenario();
  const listParams = { workshopCode: WORKSHOP_CODE };
  const { data: sessions = [], refetch } = useListSessions(listParams, {
    query: { refetchInterval: 5000, queryKey: getListSessionsQueryKey(listParams) },
  });
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [duration, setDuration] = useState(String(scenario.timing.defaultMinutes));
  const [msg, setMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archives, setArchives] = useState<ArchiveSummary[]>([]);
  const [viewing, setViewing] = useState<ArchiveDetail | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [tryRuns, setTryRuns] = useState<TeamSnapshot[]>([]);
  const [viewingTry, setViewingTry] = useState<TeamSnapshot | null>(null);

  const loadArchives = React.useCallback(async () => {
    const res = await fetch("/api/archives", { headers: secretHeader(secret) });
    if (!res.ok) return;
    setArchives((await res.json()) as ArchiveSummary[]);
  }, [secret]);

  const loadTryRuns = React.useCallback(async () => {
    const res = await fetch(`/api/sessions?workshopCode=${DEMAND_TRY_WORKSHOP_CODE}`, {
      headers: secretHeader(secret),
    });
    if (!res.ok) return;
    setTryRuns((await res.json()) as TeamSnapshot[]);
  }, [secret]);

  React.useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/session-config");
      if (res.ok) {
        const data = (await res.json()) as SessionConfig;
        setConfig(data);
        setDuration(String(data.durationMinutes));
      }
    };
    load();
    loadArchives();
    loadTryRuns();
    const id = setInterval(() => {
      load();
      loadTryRuns();
    }, 5000);
    return () => clearInterval(id);
  }, [loadArchives, loadTryRuns]);

  React.useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  const call = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...secretHeader(secret), ...init?.headers },
    });
    if (!res.ok) {
      setMsg("Request failed. Check the facilitator secret in the URL.");
      return null;
    }
    return res;
  };

  const start = async () => {
    const res = await call("/api/session-config/start", { method: "POST", body: "{}" });
    if (res) {
      setConfig((await res.json()) as SessionConfig);
      setMsg("Exercise started.");
    }
  };
  const adjust = async () => {
    const res = await call("/api/session-config", {
      method: "PATCH",
      body: JSON.stringify({ durationMinutes: Number(duration) }),
    });
    if (res) {
      setConfig((await res.json()) as SessionConfig);
      setMsg("Timer updated.");
    }
  };
  const end = async () => {
    const res = await call("/api/session-config", {
      method: "PATCH",
      body: JSON.stringify({ end: true }),
    });
    if (res) {
      setConfig((await res.json()) as SessionConfig);
      setMsg("Exercise ended.");
    }
  };
  const release = async (id: string) => {
    await call(`/api/sessions/${id}`, { method: "DELETE" });
    refetch();
  };
  const resetAll = async () => {
    const ok = window.confirm(
      "Delete every team session and reset the shared timer? Testers should return to the join page and claim a slot again.",
    );
    if (!ok) return;
    setResetting(true);
    try {
      const res = await call("/api/sessions/reset-all", { method: "POST", body: "{}" });
      if (!res) return;
      const data = (await res.json()) as { deleted: number };
      const cfgRes = await fetch("/api/session-config");
      if (cfgRes.ok) {
        const next = (await cfgRes.json()) as SessionConfig;
        setConfig(next);
        setDuration(String(next.durationMinutes));
      }
      await refetch();
      setMsg(
        data.deleted === 0
          ? "No sessions to clear. Timer reset."
          : `Cleared ${data.deleted} session${data.deleted === 1 ? "" : "s"}. Timer reset.`,
      );
    } finally {
      setResetting(false);
    }
  };
  const saveRun = async () => {
    if (sessions.length === 0) {
      setMsg("Nothing to save — no teams have joined yet.");
      return;
    }
    const ok = window.confirm(
      "Save this run so you can open it later? Live slots stay as they are until you reset.",
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/archives", {
        method: "POST",
        headers: { "content-type": "application/json", ...secretHeader(secret) },
      });
      if (!res.ok) {
        setMsg("Could not save this run.");
        return;
      }
      await loadArchives();
      setMsg("Run saved. You can reset slots when you are ready.");
    } finally {
      setSaving(false);
    }
  };
  const openArchive = async (id: string) => {
    setOpeningId(id);
    try {
      const res = await fetch(`/api/archives/${id}`, { headers: secretHeader(secret) });
      if (!res.ok) {
        setMsg("Could not open that saved session.");
        return;
      }
      setViewing((await res.json()) as ArchiveDetail);
    } finally {
      setOpeningId(null);
    }
  };
  const download = async (format: "csv" | "json") => {
    const res = await call(`/api/export?format=${format}`);
    if (!res) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = format === "csv" ? "session-outputs.csv" : "session-outputs.json";
    a.click();
  };

  const copyTryLink = async () => {
    const url = `${window.location.origin}/demand/try`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Try-out link copied.");
    } catch {
      setMsg(url);
    }
  };

  const remaining = config ? remainingMs(config) : null;
  const expired = config ? isExpired(config) : false;
  const seenAttention = React.useRef<Map<string, string>>(new Map());
  const attentionPrimed = React.useRef(false);

  React.useEffect(() => {
    if (!attentionPrimed.current) {
      for (const s of sessions) {
        if (s.flaggedForDebrief) seenAttention.current.set(s.id, s.updatedAt);
      }
      attentionPrimed.current = true;
      return;
    }
    let ring = false;
    for (const s of sessions) {
      if (s.flaggedForDebrief && seenAttention.current.get(s.id) !== s.updatedAt) {
        ring = true;
        seenAttention.current.set(s.id, s.updatedAt);
      } else if (!s.flaggedForDebrief) {
        seenAttention.current.delete(s.id);
      }
    }
    if (ring) playPhoneRing();
  }, [sessions]);

  const clearAttention = async (id: string) => {
    await call(`/api/sessions/${id}/flag`, {
      method: "POST",
      body: JSON.stringify({ flagged: false }),
    });
    refetch();
  };

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header />
      <ActivityTabs active="demand" />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <h1 className="text-[32px] mt-0 mb-2">Demand Spike</h1>
        <p className="text-[16px] text-[#6C6975] mb-6">
          Private try-out link:{" "}
          <button type="button" className="text-[#301CA0] underline font-semibold" onClick={copyTryLink}>
            /demand/try
          </button>
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E7E4DD] bg-white pl-4 pr-3 text-[14px] font-semibold text-[#6C6975]">
            Duration (minutes)
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-12 border-0 bg-transparent p-0 text-[16px] font-semibold text-[#301CA0] outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </label>
          <button
            type="button"
            onClick={adjust}
            aria-label="Adjust timer"
            title="Adjust timer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F3EF] text-[#301CA0] border border-[#84C5B1] transition-all duration-200 ease-out hover:scale-[1.04] hover:bg-[#d7ebe4] active:scale-[0.96]"
          >
            <PencilLine className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={start}
            aria-label="Restart timer"
            title="Restart timer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#301CA0] to-[#1A0F58] text-white shadow-[0_8px_24px_rgba(48,28,160,0.28)] transition-all duration-200 ease-out hover:scale-[1.05] hover:from-[#3d28b8] hover:to-[#301CA0] active:scale-[0.96]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="text-[16px] mb-4">
          Timer:{" "}
          {!config?.startedAt
            ? "not started"
            : expired
              ? "expired / ended"
              : formatCountdown(remaining ?? 0)}
        </p>
        {msg && <p className="text-[14px] text-[#2E7D5B] mb-4">{msg}</p>}
        {sessions.length === 0 ? (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 text-[#6C6975]">
            No teams have joined yet.
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => (
              <TeamProgressCard
                key={s.id}
                s={s}
                scenario={scenario}
                onClearAttention={clearAttention}
                onRelease={release}
              />
            ))}
          </div>
        )}
        <div className="mt-6 ml-auto w-max flex flex-col items-end gap-3">
          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton onClick={saveRun} disabled={saving || sessions.length === 0}>
              <span className="inline-flex items-center gap-2">
                <Bookmark className="h-4 w-4" strokeWidth={2.25} />
                {saving ? "Saving…" : "Save Session"}
              </span>
            </SecondaryButton>
            <DownloadMenu onDownload={download} />
            <button
              type="button"
              onClick={resetAll}
              disabled={resetting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C05621] text-white text-[16px] font-semibold px-5 py-2.5 transition-all duration-200 ease-out hover:scale-[1.04] hover:bg-[#9a4319] active:scale-[0.96] disabled:opacity-40 disabled:hover:scale-100"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
              {resetting ? "Resetting…" : "Reset Session"}
            </button>
            <button
              type="button"
              onClick={end}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#B42318] text-white text-[16px] font-semibold px-5 py-2.5 transition-all duration-200 ease-out hover:scale-[1.04] hover:bg-[#9b1e14] active:scale-[0.96]"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
              End exercise
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-4">
            <button type="button" onClick={copyTryLink} className="text-[#301CA0] text-[16px] underline">
              Copy try-out link
            </button>
            <a href="/print" target="_blank" rel="noreferrer" className="text-[#301CA0] text-[16px] underline">
              Fallback pack
            </a>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-[24px] mt-0 mb-2">Previous saved sessions</h2>
          <p className="text-[15px] text-[#6C6975] mb-4">
            Saved runs stay here after you reset live slots. Open one to review team inputs.
          </p>
          {archives.length === 0 ? (
            <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 text-[#6C6975]">
              No saved sessions yet.
            </div>
          ) : (
            <div className="bg-white border border-[#E7E4DD] rounded-xl overflow-hidden">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="text-left bg-[#F8F6EF] border-b border-[#E7E4DD]">
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Time</th>
                    <th className="p-3 font-semibold">Teams</th>
                    <th className="p-3 font-semibold">Submitted</th>
                    <th className="p-3 font-semibold">Length</th>
                    <th className="p-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {archives.map((row) => (
                    <tr key={row.id} className="border-b border-[#E7E4DD] last:border-0">
                      <td className="p-3">{formatArchiveDate(row.savedAt)}</td>
                      <td className="p-3">{formatArchiveTime(row.savedAt)}</td>
                      <td className="p-3">{row.teamCount}</td>
                      <td className="p-3">
                        {row.submittedCount} of {row.teamCount}
                      </td>
                      <td className="p-3">{row.durationMinutes} min</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          className="text-[#301CA0] underline font-semibold"
                          onClick={() => openArchive(row.id)}
                          disabled={openingId === row.id}
                        >
                          {openingId === row.id ? "Opening…" : "Open"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-12 mb-8">
          <h2 className="text-[24px] mt-0 mb-2">Test runs</h2>
          <p className="text-[15px] text-[#6C6975] mb-4">
            People on /demand/try. These do not use live slots or the workshop timer.
          </p>
          {tryRuns.length === 0 ? (
            <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 text-[#6C6975]">
              No test runs yet.
            </div>
          ) : (
            <div className="bg-white border border-[#E7E4DD] rounded-xl overflow-hidden">
              {tryRuns.length > 5 ? (
                <p className="text-[13px] text-[#6C6975] px-3 py-2 m-0 border-b border-[#E7E4DD]">
                  Showing the latest 5. Scroll for older runs.
                </p>
              ) : null}
              <div className="max-h-[calc(2.75rem+5*3.25rem)] overflow-y-auto">
                <table className="w-full text-[15px]">
                  <thead>
                    <tr className="text-left bg-[#F8F6EF] border-b border-[#E7E4DD] sticky top-0 z-10">
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Time</th>
                      <th className="p-3 font-semibold">Team</th>
                      <th className="p-3 font-semibold">Step</th>
                      <th className="p-3 font-semibold">Submitted</th>
                      <th className="p-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...tryRuns]
                      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
                      .map((row) => (
                        <tr key={row.id} className="border-b border-[#E7E4DD] last:border-0">
                          <td className="p-3">{row.createdAt ? formatArchiveDate(row.createdAt) : "—"}</td>
                          <td className="p-3">{row.createdAt ? formatArchiveTime(row.createdAt) : "—"}</td>
                          <td className="p-3">{formatTeamLabel(row)}</td>
                          <td className="p-3">{row.currentScreen || "—"}</td>
                          <td className="p-3">{row.submittedAt ? "Yes" : "No"}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              className="text-[#301CA0] underline font-semibold"
                              onClick={() => setViewingTry(row)}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-start justify-center p-4 md:p-8 overflow-y-auto"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <div
            className="bg-[#F8F6EF] rounded-xl border border-[#E7E4DD] w-full max-w-[1280px] my-4 p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="archive-title"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 id="archive-title" className="text-[28px] mt-0 mb-1">
                  Saved session
                </h2>
                <p className="text-[15px] text-[#6C6975] m-0">
                  {formatArchiveDate(viewing.savedAt)} at {formatArchiveTime(viewing.savedAt)} ·{" "}
                  {viewing.teamCount} team{viewing.teamCount === 1 ? "" : "s"} ·{" "}
                  {viewing.submittedCount} submitted · {viewing.durationMinutes} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="inline-flex items-center gap-2 rounded-full border border-[#E7E4DD] bg-white px-4 py-2 text-[16px] font-semibold text-[#301CA0]"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
                Close
              </button>
            </div>
            <div className="space-y-4">
              {viewing.payload.teams.map((s) => (
                <TeamProgressCard key={s.id} s={s} scenario={scenario} />
              ))}
            </div>
          </div>
        </div>
      )}
      {viewingTry && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-start justify-center p-4 md:p-8 overflow-y-auto"
          onClick={() => setViewingTry(null)}
          role="presentation"
        >
          <div
            className="bg-[#F8F6EF] rounded-xl border border-[#E7E4DD] w-full max-w-[1280px] my-4 p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[28px] mt-0 mb-1">{formatTeamLabel(viewingTry)}</h2>
                <p className="text-[15px] text-[#6C6975] m-0">
                  From /demand/try · {viewingTry.currentScreen}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingTry(null)}
                className="inline-flex items-center gap-2 rounded-full border border-[#E7E4DD] bg-white px-4 py-2 text-[16px] font-semibold text-[#301CA0]"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
                Close
              </button>
            </div>
            <TeamProgressCard s={viewingTry} scenario={scenario} />
          </div>
        </div>
      )}
    </div>
  );
}
