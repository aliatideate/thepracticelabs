import React, { useEffect, useState } from "react";
import { Bookmark, Download, PencilLine, Phone, RotateCcw, X } from "lucide-react";
import {
  MART_DURATION_MINUTES,
  MART_SESSION_LABEL,
  MART_WORKSHOP_CODE,
  formatTeamLabel,
} from "../lib/constants";
import { useRuntimeWorkshopCode, useSessionRoom } from "../lib/sessionRoom";
import { Header, SecondaryButton } from "../simulation/components";
import { formatCountdown, isExpired, remainingMs, type SessionConfig } from "../lib/timer";
import { playPhoneRing } from "../lib/phoneRing";
import type { DecisionGame, GradeKey } from "../lib/decisionGame";
import { gradeTone } from "../lib/decisionGame";
import { facilitatorAuthHeaders } from "../lib/facilitatorAuth";
import { engineOf } from "../lib/engineContract";
import { ActivityTabs } from "./activityTabs";
import { DownloadMenu } from "./facilitatorDownload";
import { FacilitatorNotesPanel } from "./FacilitatorNotesPanel";

type FacSession = {
  id: string;
  teamName: string;
  displayName: string;
  emoji: string;
  currentScreen: string;
  decisionIndex: number;
  choices: { decisionId: string; optionId: string }[];
  flaggedForDebrief: boolean;
  score?: number;
  maxScore?: number;
  slowLost?: number;
  fastLost?: number;
  style?: string;
  styleLabel?: { name: string; description: string };
  updatedAt: string;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
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
    teams: FacSession[];
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

function fileStamp(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function downloadMartSnapshot(
  game: DecisionGame,
  sessions: FacSession[],
  filenameBase: string,
  format: "csv" | "json",
) {
  const teams = sessions.map((s) => {
    const choices = (s.choices ?? []).map((c) => {
      const opt = game.decisions.find((d) => d.id === c.decisionId)?.options.find((o) => o.id === c.optionId);
      return {
        decisionId: c.decisionId,
        optionId: c.optionId,
        label: opt?.label ?? c.optionId,
        grade: opt?.grade?.grade ?? null,
      };
    });
    return {
      team: s.displayName,
      slot: s.teamName,
      emoji: s.emoji,
      choices,
      score: s.score ?? 0,
      maxScore: s.maxScore ?? 0,
      slowLost: s.slowLost ?? 0,
      fastLost: s.fastLost ?? 0,
      style: s.style ?? "",
    };
  });
  let blob: Blob;
  let filename: string;
  if (format === "csv") {
    const headers = ["team", "slot", ...game.decisions.map((d) => d.id), "score", "slowLost", "fastLost", "style"];
    const lines = [headers.join(",")];
    for (const t of teams) {
      const map = new Map(t.choices.map((c) => [c.decisionId, c.optionId]));
      lines.push(
        [
          JSON.stringify(t.team),
          t.slot,
          ...game.decisions.map((d) => map.get(d.id) ?? ""),
          String(t.score),
          String(t.slowLost),
          String(t.fastLost),
          t.style,
        ].join(","),
      );
    }
    blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    filename = `${filenameBase}.csv`;
  } else {
    blob = new Blob([JSON.stringify({ scenarioId: game.scenario.id, teams }, null, 2)], {
      type: "application/json",
    });
    filename = `${filenameBase}.json`;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function MartResultsTable({
  game,
  sessions,
  notes,
}: {
  game: DecisionGame;
  sessions: FacSession[];
  notes: boolean;
}) {
  return (
    <div className="bg-white border border-[#E7E4DD] rounded-xl overflow-x-auto mb-6">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left bg-[#F8F6EF] border-b border-[#E7E4DD]">
            <th className="p-3">Team</th>
            {game.decisions.map((d) => (
              <th
                key={d.id}
                className={`p-3 ${d.facilitator?.difficulty === "murky" ? "bg-[#F8E8C8]" : ""}`}
              >
                Question {d.order}
                {notes && d.facilitator?.difficulty ? (
                  <div className="text-[12px] font-normal text-[#6C6975]">{d.facilitator.difficulty}</div>
                ) : null}
              </th>
            ))}
            <th className="p-3">Score</th>
            <th className="p-3">Slow</th>
            <th className="p-3">Fast</th>
            <th className="p-3">Style</th>
          </tr>
        </thead>
        <tbody>
          {sessions
            .slice()
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .map((s) => {
              const map = new Map(s.choices.map((c) => [c.decisionId, c.optionId]));
              return (
                <tr key={s.id} className="border-b border-[#E7E4DD]">
                  <td className="p-3 font-semibold">{formatTeamLabel(s)}</td>
                  {game.decisions.map((d) => {
                    const optionId = map.get(d.id);
                    const opt = d.options.find((o) => o.id === optionId);
                    const key = opt?.grade?.grade as GradeKey | undefined;
                    return (
                      <td
                        key={d.id}
                        className={`p-3 ${d.facilitator?.difficulty === "murky" ? "bg-[#FBF3E4]" : ""}`}
                        style={key ? { color: gradeTone(key), fontWeight: 700 } : undefined}
                        title={
                          notes
                            ? d.options.find((o) => o.id === map.get(d.id))?.facilitator?.doorType
                            : undefined
                        }
                      >
                        {optionId ?? "—"}
                      </td>
                    );
                  })}
                  <td className="p-3">
                    {s.score ?? "—"}
                    {s.maxScore != null ? ` / ${s.maxScore}` : ""}
                  </td>
                  <td className="p-3">{s.slowLost ?? "—"}</td>
                  <td className="p-3">{s.fastLost ?? "—"}</td>
                  <td className="p-3">{s.styleLabel?.name ?? "—"}</td>
                </tr>
              );
            })}
          <tr className="bg-[#F8F6EF] font-medium">
            <td className="p-3">Split</td>
            {game.decisions.map((d) => {
              const counts = { A: 0, B: 0, call: 0 };
              for (const s of sessions) {
                const id = s.choices.find((c) => c.decisionId === d.id)?.optionId;
                if (id === "A" || id === "B" || id === "call") counts[id] += 1;
              }
              return (
                <td key={d.id} className="p-3 text-[13px]">
                  A {counts.A} · B {counts.B} · Call {counts.call}
                </td>
              );
            })}
            <td colSpan={4} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function MartFacilitate() {
  const room = useSessionRoom();
  const workshopCode = useRuntimeWorkshopCode(MART_WORKSHOP_CODE);
  const boardTitle = room?.title ?? "Mart";
  const tryPath = room ? `/s/${room.workshopCode}/try` : "/mart/try";
  const [game, setGame] = useState<DecisionGame | null>(null);
  const [sessions, setSessions] = useState<FacSession[]>([]);
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [duration, setDuration] = useState(String(MART_DURATION_MINUTES));
  const [msg, setMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState(false);
  const [archives, setArchives] = useState<ArchiveSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ArchiveDetail | null>(null);
  const [viewingTry, setViewingTry] = useState<FacSession | null>(null);
  const [tryRuns, setTryRuns] = useState<FacSession[]>([]);
  const headers = facilitatorAuthHeaders({ "content-type": "application/json" });
  const qs = `workshopCode=${encodeURIComponent(workshopCode)}`;

  const loadArchives = async () => {
    const res = await fetch(`/api/mart/archives?${qs}`, { headers });
    if (res.ok) setArchives((await res.json()) as ArchiveSummary[]);
  };

  const load = async () => {
    const [g, s, c, t] = await Promise.all([
      fetch(`/api/decision-game/facilitator?code=${encodeURIComponent(workshopCode)}`, {
        headers,
      }),
      fetch(`/api/mart/sessions?${qs}`, { headers }),
      fetch(`/api/mart/session-config?${qs}`),
      fetch("/api/try/sessions", { headers }),
    ]);
    if (g.ok) setGame((await g.json()) as DecisionGame);
    if (s.ok) setSessions((await s.json()) as FacSession[]);
    if (t.ok) setTryRuns((await t.json()) as FacSession[]);
    if (c.ok) {
      const next = (await c.json()) as SessionConfig;
      setConfig(next);
      setDuration(String(next.durationMinutes));
    }
    await loadArchives();
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const call = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { ...init, headers: { ...headers, ...init?.headers } });
    if (!res.ok) {
      setMsg("Request failed. Try signing in again.");
      return null;
    }
    return res;
  };

  const remaining = config ? remainingMs(config) : null;
  const expired = config ? isExpired(config) : false;
  const seen = React.useRef<Map<string, string>>(new Map());
  const primed = React.useRef(false);
  useEffect(() => {
    if (!primed.current) {
      for (const s of sessions) {
        if (s.flaggedForDebrief) seen.current.set(s.id, s.updatedAt);
      }
      primed.current = true;
      return;
    }
    let ring = false;
    for (const s of sessions) {
      if (s.flaggedForDebrief && seen.current.get(s.id) !== s.updatedAt) {
        ring = true;
        seen.current.set(s.id, s.updatedAt);
      } else if (!s.flaggedForDebrief) seen.current.delete(s.id);
    }
    if (ring) playPhoneRing();
  }, [sessions]);

  const download = async (format: "csv" | "json") => {
    const res = await call(`/api/mart/export?format=${format}&${qs}`);
    if (!res) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = format === "csv" ? "mart-results.csv" : "mart-results.json";
    a.click();
  };

  const copyTryLink = async () => {
    const url = `${window.location.origin}${tryPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Try-out link copied.");
    } catch {
      setMsg(url);
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
      const res = await fetch("/api/mart/archives", {
        method: "POST",
        headers,
        body: JSON.stringify({ workshopCode }),
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
      const res = await fetch(`/api/mart/archives/${id}`, { headers });
      if (!res.ok) {
        setMsg("Could not open that saved session.");
        return;
      }
      setViewing((await res.json()) as ArchiveDetail);
    } finally {
      setOpeningId(null);
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center">Loading facilitator…</div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header
        configPath={`/api/mart/session-config?${qs}`}
        sessionLabel={MART_SESSION_LABEL}
        titleOverride={game.scenario.title}
      />
      <ActivityTabs active="mart" />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <h1 className="text-[32px] mt-0 mb-2">{boardTitle}</h1>
        <p className="text-[16px] text-[#6C6975] mb-6">
          Private try-out link:{" "}
          <button type="button" className="text-[#301CA0] underline font-semibold" onClick={copyTryLink}>
            {tryPath}
          </button>
        </p>
        <FacilitatorNotesPanel workshopCode={workshopCode} />
        <div className="flex flex-wrap items-center gap-3 mb-4">
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
            aria-label="Adjust timer"
            title="Adjust timer"
            onClick={async () => {
              const res = await call("/api/mart/session-config", {
                method: "PATCH",
                body: JSON.stringify({ durationMinutes: Number(duration), workshopCode }),
              });
              if (res) setConfig((await res.json()) as SessionConfig);
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F3EF] text-[#301CA0] border border-[#84C5B1] transition-all duration-200 ease-out hover:scale-[1.04] hover:bg-[#d7ebe4] active:scale-[0.96]"
          >
            <PencilLine className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Restart timer"
            title="Restart timer"
            onClick={async () => {
              const res = await call("/api/mart/session-config/start", {
                method: "POST",
                body: JSON.stringify({ workshopCode }),
              });
              if (res) setConfig((await res.json()) as SessionConfig);
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#301CA0] to-[#1A0F58] text-white shadow-[0_8px_24px_rgba(48,28,160,0.28)] transition-all duration-200 ease-out hover:scale-[1.05] hover:from-[#3d28b8] hover:to-[#301CA0] active:scale-[0.96]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="text-[16px] mb-4">
          Timer:{" "}
          {!config?.startedAt ? "not started" : expired ? "expired / ended" : formatCountdown(remaining ?? 0)}
        </p>
        {msg && <p className="text-[14px] text-[#2E7D5B] mb-4">{msg}</p>}

        <h2 className="text-[22px] mt-0 mb-3">Live progress</h2>
        {sessions.length === 0 ? (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 text-[#6C6975] mb-8">
            No teams have joined yet. Share /mart
          </div>
        ) : (
          <div className="bg-white border border-[#E7E4DD] rounded-xl overflow-hidden mb-10">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="text-left bg-[#F8F6EF] border-b border-[#E7E4DD]">
                  <th className="p-3">Team</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Attention</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-[#E7E4DD]">
                    <td className="p-3 font-semibold">{formatTeamLabel(s)}</td>
                    <td className="p-3">
                      {
                        engineOf("branching").progressOf({
                          currentScreen: s.currentScreen,
                        }).progress
                      }
                    </td>
                    <td className="p-3">
                      {s.currentScreen === "intro"
                        ? "—"
                        : s.currentScreen === "reveal"
                          ? "Done"
                          : `${s.decisionIndex + 1} of ${game.decisions.length}`}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() =>
                          s.flaggedForDebrief &&
                          call(`/api/mart/sessions/${s.id}/flag`, {
                            method: "POST",
                            body: JSON.stringify({ flagged: false, workshopCode }),
                          }).then(() => load())
                        }
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[13px] ${
                          s.flaggedForDebrief
                            ? "tpl-attention-pulse border-[#B42318] bg-[#B42318] text-white"
                            : "border-[#E7E4DD] text-[#6C6975]"
                        }`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        className="text-[#B42318] underline text-[14px]"
                        onClick={() => call(`/api/mart/sessions/${s.id}`, { method: "DELETE" }).then(() => load())}
                      >
                        Release
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-[22px] m-0">Results</h2>
          <label className="text-[14px]">
            <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} className="mr-2" />
            Show facilitator notes
          </label>
        </div>
        <MartResultsTable game={game} sessions={sessions} notes={notes} />
        {notes && (
          <div className="space-y-3 mb-8">
            {game.decisions.map((d) => (
              <p key={d.id} className="text-[15px] m-0">
                <span className="font-semibold">B{d.order}:</span> {d.facilitator?.note}
              </p>
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
              onClick={async () => {
                if (!window.confirm("Clear every mart team and reset the timer?")) return;
                const res = await call("/api/mart/sessions/reset-all", {
                  method: "POST",
                  body: JSON.stringify({ workshopCode }),
                });
                if (res) {
                  setMsg("Cleared.");
                  load();
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#C05621] text-white font-semibold px-5 py-2.5"
            >
              <RotateCcw className="h-4 w-4" /> Reset Session
            </button>
            <button
              type="button"
              onClick={() =>
                call("/api/mart/session-config", {
                  method: "PATCH",
                  body: JSON.stringify({ end: true, workshopCode }),
                }).then((r) => r && r.json().then((c) => setConfig(c)))
              }
              className="inline-flex items-center gap-2 rounded-full bg-[#B42318] text-white font-semibold px-5 py-2.5"
            >
              <X className="h-4 w-4" /> End exercise
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
            Saved runs stay here after you reset live slots. Open one to review scores and choices.
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
            People on /mart/try. These do not use live slots or the workshop timer.
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
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Branch</th>
                    <th className="p-3 font-semibold">Score</th>
                    <th className="p-3 font-semibold">Style</th>
                    <th className="p-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {tryRuns.map((s) => {
                    const when = s.startedAt || s.createdAt || s.updatedAt;
                    return (
                      <tr key={s.id} className="border-b border-[#E7E4DD] last:border-0">
                        <td className="p-3">{formatArchiveDate(when)}</td>
                        <td className="p-3">{formatArchiveTime(when)}</td>
                        <td className="p-3 font-semibold">{formatTeamLabel(s)}</td>
                        <td className="p-3 capitalize">{s.currentScreen}</td>
                        <td className="p-3">
                          {s.currentScreen === "intro"
                            ? "—"
                            : s.currentScreen === "reveal"
                              ? "Done"
                              : `${s.decisionIndex + 1} of ${game.decisions.length}`}
                        </td>
                        <td className="p-3">
                          {s.score ?? "—"}
                          {s.maxScore != null ? ` / ${s.maxScore}` : ""}
                        </td>
                        <td className="p-3">{s.styleLabel?.name ?? "—"}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            className="text-[#301CA0] underline font-semibold"
                            onClick={() => setViewingTry(s)}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                  {viewing.submittedCount} finished · {viewing.durationMinutes} min
                </p>
              </div>
              <div className="flex items-start gap-3 shrink-0">
                <SecondaryButton
                  onClick={() =>
                    downloadMartSnapshot(
                      game,
                      viewing.payload.teams,
                      `mart-saved-${fileStamp(viewing.savedAt)}`,
                      "csv",
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" /> CSV
                  </span>
                </SecondaryButton>
                <SecondaryButton
                  onClick={() =>
                    downloadMartSnapshot(
                      game,
                      viewing.payload.teams,
                      `mart-saved-${fileStamp(viewing.savedAt)}`,
                      "json",
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" /> JSON
                  </span>
                </SecondaryButton>
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E7E4DD] bg-white px-4 py-2 text-[16px] font-semibold text-[#301CA0]"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                  Close
                </button>
              </div>
            </div>
            <MartResultsTable game={game} sessions={viewing.payload.teams} notes={notes} />
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
            aria-labelledby="try-run-title"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 id="try-run-title" className="text-[28px] mt-0 mb-1">
                  Test run — {formatTeamLabel(viewingTry)}
                </h2>
                <p className="text-[15px] text-[#6C6975] m-0">
                  From /mart/try · {viewingTry.currentScreen}
                  {viewingTry.styleLabel?.name ? ` · ${viewingTry.styleLabel.name}` : ""}
                </p>
              </div>
              <div className="flex items-start gap-3 shrink-0">
                <SecondaryButton
                  onClick={() =>
                    downloadMartSnapshot(
                      game,
                      [viewingTry],
                      `mart-try-${fileStamp(viewingTry.startedAt || viewingTry.createdAt || viewingTry.updatedAt)}`,
                      "csv",
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" /> CSV
                  </span>
                </SecondaryButton>
                <SecondaryButton
                  onClick={() =>
                    downloadMartSnapshot(
                      game,
                      [viewingTry],
                      `mart-try-${fileStamp(viewingTry.startedAt || viewingTry.createdAt || viewingTry.updatedAt)}`,
                      "json",
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" /> JSON
                  </span>
                </SecondaryButton>
                <button
                  type="button"
                  onClick={() => setViewingTry(null)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E7E4DD] bg-white px-4 py-2 text-[16px] font-semibold text-[#301CA0]"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                  Close
                </button>
              </div>
            </div>
            <MartResultsTable game={game} sessions={[viewingTry]} notes={notes} />
          </div>
        </div>
      )}
    </div>
  );
}
