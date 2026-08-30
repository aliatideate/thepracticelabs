import React, { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useListSubmissions,
  useDeleteSession,
  useResetSession,
  useGetWorkshop,
  getGetWorkshopQueryKey,
  getListSubmissionsQueryKey,
  getListSessionsQueryKey,
  type Session,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { assets, stakeholders, evidenceSources } from "../data/data";
import { Pill, SectionLabel } from "../simulation/components";

type Confidence = "Low" | "Medium" | "High";

const CONFIDENCE_STYLES: Record<Confidence, { pill: string }> = {
  Low:    { pill: "border-red-400/30 bg-red-400/10 text-red-300" },
  Medium: { pill: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300" },
  High:   { pill: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
};

function getStakeholder(id: string) {
  return stakeholders.find((s) => s.id === id);
}

function getEvidenceSource(id: string) {
  return evidenceSources.find((e) => e.id === id);
}

function DashPill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${className}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent ?? "text-white"}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/35 mt-0.5">{sub}</div>}
    </div>
  );
}

function SubmissionCard({
  sub,
  index,
  selected,
  compareMode,
  onToggleCompare,
  onReset,
  onDelete,
  busy,
}: {
  sub: Session;
  index: number;
  selected: boolean;
  compareMode: boolean;
  onToggleCompare: (id: string) => void;
  onReset: (sub: Session) => void;
  onDelete: (sub: Session) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const confidence = sub.confidence as Confidence || "Medium";
  const conf = CONFIDENCE_STYLES[confidence];
  const stakeholder = sub.selectedStakeholder ? getStakeholder(sub.selectedStakeholder) : null;
  const evidence = sub.selectedEvidenceSource ? getEvidenceSource(sub.selectedEvidenceSource) : null;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        selected
          ? "border-yellow-400/50 bg-yellow-400/[0.04] shadow-[inset_0_1px_0_rgba(250,204,21,0.06)]"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="w-7 h-7 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/40 text-[11px] font-semibold flex-shrink-0 mt-0.5">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-white font-semibold text-sm">{sub.teamName}</span>
            <DashPill className={conf.pill}>{confidence} Confidence</DashPill>
            {sub.submittedAt && (
              <span className="text-white/25 text-[11px] ml-auto">
                Submitted {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stakeholder && (
              <div className="inline-flex items-center gap-1.5">
                <img src={stakeholder.image} alt={stakeholder.name} className="w-4 h-4 rounded-full object-cover opacity-80" />
                <span className="text-white/45 text-[11px]">{stakeholder.name}</span>
              </div>
            )}
            {evidence && (
              <>
                <span className="text-white/20 text-[11px]">·</span>
                <span className="text-white/45 text-[11px]">{evidence.title}</span>
              </>
            )}
          </div>
        </div>
        {compareMode && (
          <button
            onClick={() => onToggleCompare(sub.id)}
            className={`flex-shrink-0 w-6 h-6 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
              selected
                ? "border-yellow-400/60 bg-yellow-400/20"
                : "border-white/15 bg-white/[0.03] hover:border-white/30"
            }`}
          >
            {selected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="px-5 pb-3">
        <p className={`text-white/70 text-[13px] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
          "{sub.problemStatement}"
        </p>
        {sub.problemStatement && sub.problemStatement.length > 180 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/35 hover:text-white/60 text-[11px] mt-1 cursor-pointer transition-colors"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {sub.assumption && (
        <div className="mx-5 mb-4 px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <SectionLabel>Assumption to Test</SectionLabel>
          <p className="text-white/55 text-[12px] leading-relaxed">{sub.assumption}</p>
        </div>
      )}

      <div className="mx-5 mb-4 pt-3 border-t border-white/[0.05] flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onReset(sub)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06] text-white/70 hover:text-white text-[11px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="3 4 3 10 9 10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reset
        </button>
        <button
          type="button"
          onClick={() => onDelete(sub)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-400/25 bg-red-400/[0.05] hover:border-red-400/50 hover:bg-red-400/[0.10] text-red-300 hover:text-red-200 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}

function ComparePanel({ submissions, leftId, rightId }: { submissions: Session[]; leftId: string; rightId: string }) {
  const left = submissions.find((s) => s.id === leftId);
  const right = submissions.find((s) => s.id === rightId);
  if (!left || !right) return null;

  return (
    <div className="mt-6 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.02] overflow-hidden">
      <div className="px-5 py-3 border-b border-yellow-400/15 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-yellow-400/70">
          <rect x="3" y="3" width="7" height="18" rx="1.5" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="3" width="7" height="18" rx="1.5" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span className="text-yellow-400 text-[11px] font-semibold uppercase tracking-[0.14em]">Side-by-side Compare</span>
        <span className="text-white/30 text-[11px] ml-1">{left.teamName} vs {right.teamName}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
        {[left, right].map((sub) => {
          const confidence = sub.confidence as Confidence || "Medium";
          const conf = CONFIDENCE_STYLES[confidence];
          const stakeholder = sub.selectedStakeholder ? getStakeholder(sub.selectedStakeholder) : null;
          const evidence = sub.selectedEvidenceSource ? getEvidenceSource(sub.selectedEvidenceSource) : null;
          return (
            <div key={sub.id} className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm">{sub.teamName}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${conf.pill}`}>
                  {confidence} Confidence
                </span>
              </div>
              <div>
                <SectionLabel>Problem Statement</SectionLabel>
                <p className="text-white/75 text-[13px] leading-relaxed">"{sub.problemStatement}"</p>
              </div>
              {sub.assumption && (
                <div>
                  <SectionLabel>Assumption to Test</SectionLabel>
                  <p className="text-white/55 text-[12px] leading-relaxed">{sub.assumption}</p>
                </div>
              )}
              <div>
                <SectionLabel>Investigation Path</SectionLabel>
                <div className="space-y-1.5">
                  {stakeholder && (
                    <div className="flex items-center gap-2">
                      <img src={stakeholder.image} alt={stakeholder.name} className="w-5 h-5 rounded-full object-cover opacity-80" />
                      <span className="text-white/70 text-[12px]">{stakeholder.name}</span>
                      <span className="text-white/35 text-[11px]">{stakeholder.role}</span>
                    </div>
                  )}
                  {evidence && (
                    <div className="flex items-center gap-2 pl-0.5">
                      <div className="w-4 h-4 flex items-center justify-center text-white/25">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span className="text-white/55 text-[12px]">{evidence.title}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FacilitatorDashboard() {
  const params = useParams<{ code: string }>();
  const workshopCode = (params?.code ?? "").toUpperCase();
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [liveConnected, setLiveConnected] = useState(false);

  const workshopQuery = useGetWorkshop(workshopCode, {
    query: {
      enabled: !!workshopCode,
      queryKey: getGetWorkshopQueryKey(workshopCode),
    },
  });

  const submissionsParams = { workshopCode };
  const { data: rawSubmissions = [], isLoading } = useListSubmissions(
    submissionsParams,
    {
      query: {
        queryKey: getListSubmissionsQueryKey(submissionsParams),
        refetchInterval: liveConnected ? false : 5000,
        enabled: !!workshopCode,
      },
    },
  );

  useEffect(() => {
    const url = workshopCode
      ? `/api/events?workshopCode=${encodeURIComponent(workshopCode)}`
      : "/api/events";
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const onChange = (e?: Event) => {
      // Filter SSE events by workshop when present so cross-workshop traffic
      // doesn't churn this dashboard.
      if (e instanceof MessageEvent) {
        try {
          const payload = JSON.parse(e.data) as { workshopCode?: string };
          if (payload.workshopCode && workshopCode && payload.workshopCode !== workshopCode) {
            return;
          }
        } catch {
          /* fall through and refetch */
        }
      }
      queryClient.invalidateQueries({
        queryKey: getListSubmissionsQueryKey({ workshopCode }),
      });
      queryClient.invalidateQueries({
        queryKey: getListSessionsQueryKey({ workshopCode }),
      });
    };

    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource(url);
      } catch {
        scheduleReconnect();
        return;
      }
      es.addEventListener("ready", () => setLiveConnected(true));
      es.addEventListener("submission.created", (ev) => {
        setLiveConnected(true);
        onChange(ev);
      });
      es.addEventListener("submission.updated", (ev) => {
        setLiveConnected(true);
        onChange(ev);
      });
      es.addEventListener("submission.deleted", (ev) => {
        setLiveConnected(true);
        onChange(ev);
      });
      es.onerror = () => {
        setLiveConnected(false);
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
  }, [queryClient, workshopCode]);

  const deleteSession = useDeleteSession();
  const resetSession = useResetSession();

  const invalidateLists = () => {
    queryClient.invalidateQueries({
      queryKey: getListSubmissionsQueryKey({ workshopCode }),
    });
    queryClient.invalidateQueries({
      queryKey: getListSessionsQueryKey({ workshopCode }),
    });
  };

  const handleReset = (sub: Session) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Reset progress for "${sub.teamName}"? Their submission and answers will be cleared, but the team will remain so they can start over.`
      );
      if (!ok) return;
    }
    setPendingId(sub.id);
    resetSession.mutate(
      { id: sub.id },
      {
        onSettled: () => {
          setPendingId((curr) => (curr === sub.id ? null : curr));
          invalidateLists();
          setCompareSelected((prev) => prev.filter((x) => x !== sub.id));
        },
      }
    );
  };

  const handleDelete = (sub: Session) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Delete team "${sub.teamName}"? This removes the team and their submission entirely. This cannot be undone.`
      );
      if (!ok) return;
    }
    setPendingId(sub.id);
    deleteSession.mutate(
      { id: sub.id },
      {
        onSettled: () => {
          setPendingId((curr) => (curr === sub.id ? null : curr));
          invalidateLists();
          setCompareSelected((prev) => prev.filter((x) => x !== sub.id));
        },
      }
    );
  };
  
  const submissions = [...rawSubmissions].sort((a, b) => {
    return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
  });

  const toggleCompare = (id: string) => {
    setCompareSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const showComparePanel = compareMode && compareSelected.length === 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100f24] via-[#100a23] to-[#110322] text-white relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[20%] w-[700px] h-[700px] rounded-full bg-purple-700/[0.04] blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/[0.025] blur-[120px]" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#100f24]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <img src={assets.scenarioSimulatorLogo} alt="Scenario Simulator" className="h-9 w-auto object-contain pt-[5px] pb-[5px]" />
              <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-white/10">
                <span className="text-white/50 text-[12px]">Facilitator Dashboard</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <DashPill className="border-white/[0.08] bg-white/[0.04] text-white/55">
              {workshopQuery.data?.label ?? `Workshop ${workshopCode}`}
            </DashPill>
            <Link
              href={`/moderator/${workshopCode}`}
              className="rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] px-3 py-1 text-[11px] text-white/70"
            >
              Moderator →
            </Link>
            <DashPill className="border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-300/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </DashPill>
          </div>
        </div>
      </header>

      <div className="pt-20 pb-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="py-8">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Team Submissions</h1>
                <p className="text-white/45 text-[14px]">
                  {workshopQuery.data?.label ?? "Workshop"} · {submissions.length} teams submitted
                </p>
              </div>
              <button
                onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareSelected([]); }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-medium transition-all cursor-pointer ${
                  compareMode
                    ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400"
                    : "border-white/10 text-white/55 hover:border-white/20 hover:text-white/80"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="18" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="18" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {compareMode ? "Exit Compare" : "Compare Teams"}
              </button>
            </div>

            {compareMode && (
              <div className="mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.03]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-yellow-400/70 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p className="text-white/60 text-[13px]">
                  {compareSelected.length === 0
                    ? "Select two teams to compare their problem statements side by side."
                    : compareSelected.length === 1
                    ? "Select one more team to compare."
                    : `Comparing ${submissions.find((s) => s.id === compareSelected[0])?.teamName} and ${submissions.find((s) => s.id === compareSelected[1])?.teamName}.`}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Submitted" value={submissions.length} sub="teams complete" />
              <StatCard label="High Confidence" value={submissions.filter((s) => s.confidence === "High").length} sub="teams" accent="text-emerald-400" />
              <StatCard label="Medium Confidence" value={submissions.filter((s) => s.confidence === "Medium").length} sub="teams" accent="text-yellow-400" />
              <StatCard label="Low Confidence" value={submissions.filter((s) => s.confidence === "Low").length} sub="teams" accent="text-red-400" />
            </div>

            {isLoading ? (
              <div className="text-white/50 text-center py-10">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-white/[0.05] bg-white/[0.01]">
                <div className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
                  <span className="w-3 h-3 rounded-full bg-white/20 animate-pulse" />
                </div>
                <h3 className="text-white font-medium mb-1">Waiting for submissions</h3>
                <p className="text-white/40 text-sm">When teams submit their problem statements, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub, i) => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    index={i}
                    selected={compareSelected.includes(sub.id)}
                    compareMode={compareMode}
                    onToggleCompare={toggleCompare}
                    onReset={handleReset}
                    onDelete={handleDelete}
                    busy={pendingId === sub.id}
                  />
                ))}
              </div>
            )}

            {showComparePanel && (
              <ComparePanel
                submissions={submissions}
                leftId={compareSelected[0]}
                rightId={compareSelected[1]}
              />
            )}
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="bg-gradient-to-t from-[#100a23]/90 via-[#100a23]/60 to-transparent pt-6 pb-3 text-center text-white/25 text-[11px] tracking-wide">
          Ideate Innovation © Copyright 2026 · Facilitator View
        </div>
      </footer>
    </div>
  );
}