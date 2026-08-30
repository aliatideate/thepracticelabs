import { useState, useEffect } from "react";
import { assets, session, stakeholders, evidenceSources } from "./data";
import { loadSubmissions, type SubmissionRecord } from "./store";

// ─── Seeded baseline submissions (Teams 01 & 02) ─────────────────────────────
// These represent teams that submitted before the prototype was loaded.
// Any submission written by the Scenario Simulator (via store.ts) will
// overlay or append to this list at runtime.

const SEEDED: SubmissionRecord[] = [
  {
    id: "team-01",
    teamName: "Team 01",
    submittedAt: "14:03",
    submittedTimestamp: Date.now() - 15 * 60 * 1000,
    problemStatement:
      "The real problem may not be a shortage of total supply. Based on what we learned, the more important problem appears to be that Gulf Beverages lacks a cross-functional mechanism for rapidly realigning SKU priorities across sales, procurement, and manufacturing when demand signals shift — because each function is acting on different versions of the truth.",
    confidence: "High",
    assumption:
      "That the demand spike will continue long enough to justify reallocating production capacity rather than drawing down safety stock.",
    stakeholderId: "rohini",
    evidenceSourceId: "retailer_complaints",
  },
  {
    id: "team-02",
    teamName: "Team 02",
    submittedAt: "14:11",
    submittedTimestamp: Date.now() - 7 * 60 * 1000,
    problemStatement:
      "The real problem may not be raw production capacity. Based on what we learned, the more important problem appears to be that the most at-risk SKUs are being allocated to lower-priority accounts while high-value modern trade retailers in UAE and KSA escalate delisting threats — because allocation decisions are not being made against an agreed set of account priorities.",
    confidence: "Medium",
    assumption:
      "That fixing allocation alone — without addressing the late demand signal process — will be enough to prevent delisting within six weeks.",
    stakeholderId: "rohini",
    evidenceSourceId: "retailer_complaints",
  },
];

const PENDING_TEAM_NAMES = ["Team 03", "Team 04", "Team 05"];
const TOTAL_TEAMS = SEEDED.length + PENDING_TEAM_NAMES.length;

// ─── Merge seeded + live store data ──────────────────────────────────────────

function mergeSubmissions(seeded: SubmissionRecord[], live: SubmissionRecord[]): SubmissionRecord[] {
  const map = new Map<string, SubmissionRecord>();
  for (const s of seeded) map.set(s.id, s);
  for (const l of live) map.set(l.id, l);
  return Array.from(map.values()).sort((a, b) => a.submittedTimestamp - b.submittedTimestamp);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Shared UI ───────────────────────────────────────────────────────────────

function DashPill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${className}`}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 mb-1.5">
      {children}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent ?? "text-white"}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/35 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Submission Card ─────────────────────────────────────────────────────────

function SubmissionCard({
  sub,
  index,
  selected,
  compareMode,
  onToggleCompare,
}: {
  sub: SubmissionRecord;
  index: number;
  selected: boolean;
  compareMode: boolean;
  onToggleCompare: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const conf = CONFIDENCE_STYLES[sub.confidence as Confidence];
  const stakeholder = getStakeholder(sub.stakeholderId);
  const evidence = getEvidenceSource(sub.evidenceSourceId);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        selected
          ? "border-yellow-400/50 bg-yellow-400/[0.04] shadow-[inset_0_1px_0_rgba(250,204,21,0.06)]"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="w-7 h-7 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/40 text-[11px] font-semibold flex-shrink-0 mt-0.5">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-white font-semibold text-sm">{sub.teamName}</span>
            <DashPill className={conf.pill}>{sub.confidence} Confidence</DashPill>
            <span className="text-white/25 text-[11px] ml-auto">Submitted {sub.submittedAt}</span>
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

      {/* Problem Statement */}
      <div className="px-5 pb-3">
        <p className={`text-white/70 text-[13px] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
          "{sub.problemStatement}"
        </p>
        {sub.problemStatement.length > 180 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white/35 hover:text-white/60 text-[11px] mt-1 cursor-pointer transition-colors"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Assumption */}
      {sub.assumption && (
        <div className="mx-5 mb-4 px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <SectionLabel>Assumption to Test</SectionLabel>
          <p className="text-white/55 text-[12px] leading-relaxed">{sub.assumption}</p>
        </div>
      )}
    </div>
  );
}

// ─── Compare Panel ───────────────────────────────────────────────────────────

function ComparePanel({ submissions, leftId, rightId }: { submissions: SubmissionRecord[]; leftId: string; rightId: string }) {
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

      <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
        {[left, right].map((sub) => {
          const conf = CONFIDENCE_STYLES[sub.confidence as Confidence];
          const stakeholder = getStakeholder(sub.stakeholderId);
          const evidence = getEvidenceSource(sub.evidenceSourceId);
          return (
            <div key={sub.id} className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm">{sub.teamName}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${conf.pill}`}>
                  {sub.confidence} Confidence
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function FacilitatorDashboard() {
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<string[]>([]);

  // Live submissions: seeded baseline merged with anything written to localStorage
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(() =>
    mergeSubmissions(SEEDED, loadSubmissions())
  );

  // Poll localStorage every 3 seconds so that a submission from the Scenario
  // Simulator tab (same origin) appears here without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => {
      setSubmissions(mergeSubmissions(SEEDED, loadSubmissions()));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const pendingTeamNames = PENDING_TEAM_NAMES.filter(
    (name) => !submissions.some((s) => s.teamName === name)
  );
  const totalTeams = Math.max(TOTAL_TEAMS, submissions.length);

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
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[20%] w-[700px] h-[700px] rounded-full bg-purple-700/[0.04] blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/[0.025] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#100f24]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={assets.scenarioSimulatorLogo} alt="Scenario Simulator" className="h-9 w-auto object-contain pt-[5px] pb-[5px]" />
            <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-white/10">
              <span className="text-white/50 text-[12px]">Facilitator Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DashPill className="border-white/[0.08] bg-white/[0.04] text-white/55">
              Workshop {session.workshopNumber}: {session.workshop}
            </DashPill>
            <DashPill className="border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-300/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </DashPill>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="pt-20 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="py-8">
            {/* Page heading */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Team Submissions</h1>
                <p className="text-white/45 text-[14px]">
                  {session.scenario} · {submissions.length} of {totalTeams} teams submitted
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

            {/* Compare instruction */}
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

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <StatCard label="Submitted" value={`${submissions.length}/${totalTeams}`} sub="teams complete" />
              <StatCard label="High Confidence" value={submissions.filter((s) => s.confidence === "High").length} sub="teams" accent="text-emerald-400" />
              <StatCard label="Medium Confidence" value={submissions.filter((s) => s.confidence === "Medium").length} sub="teams" accent="text-yellow-400" />
              <StatCard label="Low Confidence" value={submissions.filter((s) => s.confidence === "Low").length} sub="teams" accent="text-red-400" />
            </div>

            {/* Submission list */}
            <div className="space-y-3">
              {submissions.map((sub, i) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  index={i}
                  selected={compareSelected.includes(sub.id)}
                  compareMode={compareMode}
                  onToggleCompare={toggleCompare}
                />
              ))}

              {/* Pending teams */}
              {pendingTeamNames.map((name) => (
                <div key={name} className="rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border border-white/[0.07] bg-white/[0.02] flex items-center justify-center flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-white/15 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-white/35 text-sm font-medium">{name}</span>
                    <span className="text-white/20 text-[12px] ml-3">Waiting for submission…</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Compare panel */}
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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="bg-gradient-to-t from-[#100a23]/90 via-[#100a23]/60 to-transparent pt-6 pb-3 text-center text-white/25 text-[11px] tracking-wide">
          Ideate Innovation © Copyright 2026 · Facilitator View
        </div>
      </footer>
    </div>
  );
}

export default FacilitatorDashboard;
