import React, { useState, useEffect, useRef } from "react";
import {
  product,
  session,
  company,
  scenario,
  stakeholders,
  questions,
  interviewInsights,
  retailerInsights,
  evidenceSources,
  synthesis,
  problemScaffold,
} from "../data/data";
import { Link } from "wouter";
import {
  PageWrapper,
  Pill,
  Card,
  PrimaryButton,
  BackButton,
  StepIndicator,
  FacilitatorNote,
  SectionLabel,
  Avatar,
  DepartmentIcon,
  InsightGrid,
  useTypewriter,
  SecondaryButton,
} from "./components";

const FLOW_STEPS = ["Brief", "Stakeholders", "Interview", "Evidence", "Define the Problem"];

const FACILITATOR_NOTES = {
  company:
    "Before moving ahead, take a minute to discuss what a company like Gulf Beverages might be dealing with in this situation. What pressures could show up across sales, planning, manufacturing, procurement, and finance?",
  intro:
    "Before you begin the interview, make sure your team understands Rohini's perspective. What does her role make her more likely to notice, defend, or miss? Use that lens when choosing your questions.",
  q2:
    "Remember to take your own notes as you go. Use your shared team space — such as your Miro board — so you can refer back to your observations when defining the problem later.",
  insights:
    "Discuss these insights in depth before moving on. Make sure everyone contributes, and if your team disagrees on what the evidence means, capture that disagreement rather than rushing past it.",
} as const;

export type FacilitatorNoteId = keyof typeof FACILITATOR_NOTES;

const CONFIDENCE_STYLES: Record<
  "Low" | "Medium" | "High",
  { selected: string; text: string; pill: "red" | "yellow" | "green" }
> = {
  Low: {
    selected: "border-red-400/50 bg-red-400/[0.05] text-red-300",
    text: "text-red-300",
    pill: "red",
  },
  Medium: {
    selected: "border-yellow-400/55 bg-yellow-400/[0.05] text-yellow-300",
    text: "text-yellow-300",
    pill: "yellow",
  },
  High: {
    selected: "border-emerald-400/50 bg-emerald-400/[0.05] text-emerald-300",
    text: "text-emerald-300",
    pill: "green",
  },
};

// ─── Screen 1: Company ───────────────────────────────────────────────────────
export function ScreenCompany({
  onNext,
  onBack,
  dismissedNotes,
  onDismissNote,
}: {
  onNext: () => void;
  onBack?: () => void;
  dismissedNotes: Set<FacilitatorNoteId>;
  onDismissNote: (id: FacilitatorNoteId) => void;
}) {
  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={0} />
        <FacilitatorNote
          noteId="company"
          message={FACILITATOR_NOTES.company}
          dismissed={dismissedNotes.has("company")}
          onDismiss={(id) => onDismissNote(id as FacilitatorNoteId)}
        />
        <SectionLabel>Company Overview</SectionLabel>

        <Card className="p-8 mb-6">
          <div className="flex flex-col items-center text-center pb-6 border-b border-white/[0.06] mb-6">
            <img
              src={company.attributes[0].value ? company.attributes[0].value : ""} // Workaround to avoid error if logo not found directly
              alt={company.name}
              className="h-20 object-contain mb-2"
              onError={(e) => {
                // Fallback if we can't show image directly
                e.currentTarget.style.display = 'none';
              }}
            />
            <h2 className="text-2xl font-bold mt-2">{company.name}</h2>
            <p className="text-white/40 text-xs mt-2">{company.tagline}</p>
          </div>

          <p className="text-white/70 text-[15px] leading-relaxed text-center max-w-2xl mx-auto">
            {company.description}
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {company.attributes.map(({ label, value }) => (
            <Card key={label} className="p-4">
              <div className="text-white/35 text-[10px] uppercase tracking-[0.14em] mb-1.5">{label}</div>
              <div className="text-white text-sm">{value}</div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>Continue to Scenario</PrimaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Screen 2: Scenario ──────────────────────────────────────────────────────
export function ScreenScenario({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={0} />

        <div className="flex items-center gap-2 mb-4">
          <Pill>{scenario.type}</Pill>
          <Pill variant="yellow">{scenario.domain}</Pill>
        </div>

        <h1 className="text-3xl font-semibold text-white tracking-tight mb-6">{scenario.title}</h1>

        <Card className="p-5 mb-6 border-orange-500/25 bg-orange-500/[0.03]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="text-orange-300 font-medium text-sm mb-1">{scenario.alertTitle}</div>
              <p className="text-white/65 text-[15px] leading-relaxed">{scenario.alertBody}</p>
            </div>
          </div>
        </Card>

        <p className="text-white/45 text-[15px] mb-5 italic">{scenario.situation}</p>

        <div className="mb-6">
          <SectionLabel>Competing Perspectives</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenario.perspectives.map((p, i) => (
              <Card key={i} className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center mb-3 text-yellow-300/90">
                  <DepartmentIcon department={p.department} />
                </div>
                <div className="text-yellow-400 font-semibold uppercase tracking-[0.14em] mb-1.5 text-[13px] mt-[4px]">
                  {p.department}
                </div>
                <p className="text-white/85 font-medium mb-2 ml-[0px] pl-[6px] pr-[6px] text-[14px]">{p.statement}</p>
                <p className="text-white/45 pl-[2px] pr-[2px] text-[13px]">{p.detail}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-5 border-yellow-400/20 bg-yellow-400/[0.02] mb-8">
          <div className="text-yellow-400 text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">Team Objective</div>
          <p className="text-white text-[15px] leading-relaxed">{scenario.objective}</p>
        </Card>

        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>Begin Scenario</PrimaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Screen 3: Investigate ───────────────────────────────────────────────────
export function ScreenInvestigate({
  onNext,
  onBack,
  selected,
  onSelect,
}: {
  onNext: () => void;
  onBack?: () => void;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={1} />

        <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
          Choose how your team will investigate the problem
        </h1>

        <p className="text-white/50 text-[15px] leading-relaxed mb-8 max-w-2xl">
          You have limited time and cannot investigate everything. Choose one stakeholder to interview now. After the interview, your team will pick one evidence source to review.
        </p>

        <div className="mb-8">
          <SectionLabel>Pick one stakeholder to interview</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stakeholders.map((s) => (
              <Card
                key={s.id}
                selected={selected === s.id}
                onClick={s.functional ? () => onSelect(s.id) : undefined}
                disabled={!s.functional}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar src={s.image} alt={s.name} size="sm" ring />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm">{s.name}</div>
                    <div className="text-yellow-400/80 text-xs font-medium">{s.role}</div>
                    <div className="text-white/45 text-xs mt-1 leading-relaxed">{s.subtitle}</div>
                  </div>
                  {selected === s.id && (
                    <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <SectionLabel>Evidence Review</SectionLabel>
          <p className="text-white/45 text-xs mb-3 leading-relaxed">
            After your stakeholder interview, your team will choose one evidence source to unlock.
          </p>
          <div className="space-y-2">
            {evidenceSources.map((src) => (
              <Card key={src.id} className="p-4 opacity-40 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/70 font-medium text-sm">{src.title}</div>
                    <div className="text-white/35 text-xs mt-0.5">{src.subtitle}</div>
                  </div>
                  <Pill>Locked</Pill>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={onNext} disabled={!selected}>
            Start Investigation
          </PrimaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Screen 4: Interviewee Intro ─────────────────────────────────────────────
export function ScreenIntro({
  onNext,
  onBack,
  dismissedNotes,
  onDismissNote,
}: {
  onNext: () => void;
  onBack?: () => void;
  dismissedNotes: Set<FacilitatorNoteId>;
  onDismissNote: (id: FacilitatorNoteId) => void;
}) {
  const rohini = stakeholders[0];
  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={2} />

        <FacilitatorNote
          noteId="intro"
          message={FACILITATOR_NOTES.intro}
          dismissed={dismissedNotes.has("intro")}
          onDismiss={(id) => onDismissNote(id as FacilitatorNoteId)}
        />

        <SectionLabel>Meet Your Interviewee</SectionLabel>

        <div className="flex items-start gap-6 mb-8">
          <Avatar src={rohini.image} alt={rohini.name} size="xl" ring />
          <div className="flex-1 pt-2">
            <h1 className="text-3xl font-semibold text-white tracking-tight">{rohini.name}</h1>
            <div className="text-yellow-400/90 font-medium text-sm mt-1">Regional {rohini.role}</div>
            <div className="flex gap-3 mt-2 text-xs text-white/40">
              <span>{rohini.department}</span>
              <span className="text-white/20">·</span>
              <span>{rohini.location}</span>
            </div>
          </div>
        </div>

        <Card className="p-5 mb-3">
          <SectionLabel>Persona Summary</SectionLabel>
          <p className="text-white/70 text-[15px] leading-relaxed">{rohini.persona}</p>
        </Card>

        <Card className="p-5 mb-3 border-yellow-400/15 bg-yellow-400/[0.02]">
          <SectionLabel>
            <span className="text-yellow-400/80">Context</span>
          </SectionLabel>
          <p className="text-white/70 text-[15px] leading-relaxed">{rohini.context}</p>
        </Card>

        <Card className="p-5 mb-8">
          <SectionLabel>Key Responsibilities</SectionLabel>
          <div className="space-y-2">
            {rohini.responsibilities?.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[15px] text-white/65">
                <div className="w-1 h-1 rounded-full bg-yellow-400/60 mt-2 flex-shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>Begin Interview</PrimaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Screens 5-8: Question ───────────────────────────────────────────────────
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1 h-1 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "0ms" }}></span>
      <span className="w-1 h-1 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }}></span>
      <span className="w-1 h-1 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }}></span>
    </span>
  );
}

export function ScreenQuestion({
  questionIndex,
  onNext,
  onBack,
  answers,
  onAnswer,
  learnings,
  dismissedNotes,
  onDismissNote,
}: {
  questionIndex: number;
  onNext: () => void;
  onBack?: () => void;
  answers: { questionId: string; selected: "A" | "B" | "C" }[];
  onAnswer: (questionId: string, choice: "A" | "B" | "C", learning: string) => void;
  learnings: string[];
  dismissedNotes: Set<FacilitatorNoteId>;
  onDismissNote: (id: FacilitatorNoteId) => void;
}) {
  const q = questions[questionIndex];
  const rohini = stakeholders[0];
  const existing = answers.find((a) => a.questionId === q.id);

  const [selected, setSelected] = useState<"A" | "B" | "C" | null>(existing?.selected ?? null);
  const [phase, setPhase] = useState<"idle" | "thinking" | "typing">(
    existing ? "typing" : "idle"
  );
  const [learningVisible, setLearningVisible] = useState(false);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ex = answers.find((a) => a.questionId === q.id);
    setSelected(ex?.selected ?? null);
    setPhase(ex ? "typing" : "idle");
    setLearningVisible(false);
    return () => {
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
    };
  }, [q.id, answers]);

  const showResponse = phase === "typing";
  const { displayed, done } = useTypewriter(q.response, showResponse, 24);

  useEffect(() => {
    if (done) setLearningVisible(true);
  }, [done]);

  const { displayed: learningDisplayed, done: learningDone } = useTypewriter(
    q.learning,
    learningVisible,
    20
  );

  const pastLearnings = learnings.slice(0, questionIndex);

  const handleSelect = (label: "A" | "B" | "C") => {
    if (phase !== "idle") return;
    setSelected(label);
    setPhase("thinking");
    onAnswer(q.id, label, q.learning);
    const delay = 800 + Math.random() * 400;
    thinkingTimer.current = setTimeout(() => {
      setPhase("typing");
    }, delay);
  };

  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={2} />

        {questionIndex === 1 && (
          <FacilitatorNote
            noteId="q2"
            message={FACILITATOR_NOTES.q2}
            dismissed={dismissedNotes.has("q2")}
            onDismiss={(id) => onDismissNote(id as FacilitatorNoteId)}
          />
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar src={rohini.image} alt={rohini.name} size="sm" ring />
            <div>
              <div className="text-white font-medium text-sm">{rohini.name}</div>
              <div className="text-white/45 text-xs">Regional {rohini.role}</div>
            </div>
          </div>
          <Pill>Question {questionIndex + 1} of {questions.length}</Pill>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <Card className="p-5">
              <SectionLabel>Situation</SectionLabel>
              <p className="text-white text-[15px] leading-relaxed">{q.prompt}</p>
            </Card>

            <div>
              <SectionLabel>Choose your question</SectionLabel>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isHappy = opt.label === q.happy;
                  const isSelected = selected === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleSelect(opt.label as "A" | "B" | "C")}
                      disabled={phase !== "idle"}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
                        isSelected && isHappy
                          ? "border-yellow-400/55 bg-gradient-to-br from-yellow-400/[0.12] via-yellow-400/[0.05] to-yellow-400/[0.02] text-white shadow-[inset_0_1px_0_rgba(250,204,21,0.08)] cursor-default"
                          : isSelected && !isHappy
                          ? "border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] text-white/85 cursor-default"
                          : phase !== "idle"
                          ? "border-white/[0.06] text-white/30 cursor-default"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:bg-white/[0.04] hover:text-white cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold flex-shrink-0 mt-0.5 ${
                          isSelected && isHappy
                            ? "bg-yellow-400 text-gray-900"
                            : isSelected
                            ? "bg-white/15 text-white"
                            : "bg-white/[0.05] text-white/50"
                        }`}>
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {phase === "thinking" && (
              <Card className="p-5 border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <Avatar src={rohini.image} alt={rohini.name} size="xs" ring />
                  <div className="text-white/50 text-sm flex items-center gap-2">
                    Rohini is thinking <TypingDots />
                  </div>
                </div>
              </Card>
            )}

            {showResponse && (
              <Card className="p-5 border-yellow-400/15 bg-yellow-400/[0.015]">
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar src={rohini.image} alt={rohini.name} size="xs" ring />
                  <div className="text-white/90 font-medium text-sm">Rohini responds</div>
                </div>
                <p className="text-white/75 text-[15px] leading-relaxed italic min-h-[5rem]">
                  "{displayed}
                  {!done && <span className="inline-block w-1 h-4 bg-yellow-400/70 ml-0.5 align-middle animate-pulse"></span>}
                  {done && '"'}
                </p>
              </Card>
            )}
          </div>

          <div className="col-span-1">
            <Card className="p-4 md:sticky md:top-20">
              <SectionLabel>Team Notes</SectionLabel>
              {pastLearnings.length === 0 && !learningVisible ? (
                <p className="text-white/30 text-xs italic">Your learnings will appear here as you ask questions.</p>
              ) : (
                <div className="space-y-3">
                  {pastLearnings.map((l, i) => (
                    <div key={i} className="text-xs text-white/65 leading-relaxed border-l border-yellow-400/40 pl-3">
                      {l}
                    </div>
                  ))}
                  {learningVisible && (
                    <div className="text-xs text-white/65 leading-relaxed border-l border-yellow-400/40 pl-3">
                      {learningDisplayed}
                      {!learningDone && (
                        <span className="inline-block w-0.5 h-3 bg-yellow-400/60 ml-0.5 align-middle animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>

        {showResponse && (
          <div className="flex justify-end mt-6">
            <PrimaryButton onClick={onNext} disabled={!done}>
              {done ? q.ctaNext : "Rohini is still speaking…"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

// ─── Screen 9: Choose Evidence Source ────────────────────────────────────────
export function ScreenEvidence({
  onNext,
  onBack,
  selected,
  onSelect,
}: {
  onNext: () => void;
  onBack?: () => void;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const rohini = stakeholders[0];
  const canProceed = selected === "retailer_complaints";

  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={3} />

        <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
          Choose one evidence source to review
        </h1>
        <p className="text-white/50 text-[15px] mb-6 max-w-2xl">
          You've completed your stakeholder interview. Now choose one data source to help your team test what you heard.
        </p>

        <Card className="p-4 mb-8 border-emerald-400/35 bg-gradient-to-br from-emerald-400/[0.10] via-emerald-400/[0.04] to-emerald-400/[0.015] shadow-[inset_0_1px_0_rgba(52,211,153,0.08)]">
          <div className="flex items-center gap-3">
            <Avatar src={rohini.image} alt={rohini.name} size="sm" ring />
            <div className="flex-1">
              <div className="text-white/40 text-[11px] mb-0.5">Interview completed</div>
              <div className="text-white font-medium text-sm">{rohini.name}</div>
              <div className="text-white/45 text-xs">Regional {rohini.role}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-emerald-400 text-xs font-medium">Completed</span>
            </div>
          </div>
        </Card>

        <div className="mb-8">
          <SectionLabel>Pick one evidence source</SectionLabel>
          <div className="space-y-3">
            {evidenceSources.map((src) => {
              const isSelected = selected === src.id;
              return (
                <div
                  key={src.id}
                  onClick={() => onSelect(src.id)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-yellow-400/60 bg-gradient-to-br from-yellow-400/[0.12] via-yellow-400/[0.05] to-yellow-400/[0.02] shadow-[inset_0_1px_0_rgba(250,204,21,0.08)]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-white font-medium text-sm">{src.title}</div>
                      </div>
                      <div className="text-white/45 text-xs mb-2">{src.subtitle}</div>
                      <p className="text-white/55 text-[13px] leading-relaxed">{src.description}</p>
                      <div className="mt-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] border border-white/10 text-white/45 font-medium">
                          {src.tag}
                        </span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-yellow-400 border-yellow-400"
                        : "border-white/20 bg-white/[0.03]"
                    }`}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={onNext} disabled={!canProceed}>
            Unlock Evidence
          </PrimaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Screen 10: Evidence Reveal ───────────────────────────────────────────────
export function ScreenEvidenceReveal({ onNext, onBack }: { onNext: () => void; onBack?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    "Pulling distributor and modern trade feedback…",
    "Clustering complaints by retailer and product line…",
    "Surfacing the strongest signals…",
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < loadingSteps.length - 1 ? s + 1 : s));
    }, 1100);
    const revealTimeout = setTimeout(() => {
      setLoading(false);
      clearInterval(stepInterval);
    }, 3500);
    return () => {
      clearInterval(stepInterval);
      clearTimeout(revealTimeout);
    };
  }, []);

  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={3} />

        <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
          Retailer complaint review
        </h1>
        <p className="text-white/45 text-[15px] mb-6">
          Your team reviewed distributor and modern trade feedback. These are the key signals from the evidence.
        </p>

        <Card className="p-4 mb-8 border-emerald-400/35 bg-gradient-to-br from-emerald-400/[0.10] via-emerald-400/[0.04] to-emerald-400/[0.015] shadow-[inset_0_1px_0_rgba(52,211,153,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-white/40 text-[11px] mb-0.5">Evidence source unlocked</div>
              <div className="text-white font-medium text-sm">Retailer Complaints</div>
              <div className="text-white/45 text-xs">Distributor and modern trade feedback summary</div>
            </div>
            <span className="text-emerald-400 text-xs font-medium">Reviewed</span>
          </div>
        </Card>

        {loading ? (
          <Card className="p-8 mb-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-12 h-12 mb-5">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-400 animate-spin" />
              </div>
              <div className="text-white/85 text-sm font-medium mb-1">
                Collecting insights from retailer complaints
              </div>
              <div
                key={loadingStep}
                className="text-white/45 text-xs animate-in fade-in duration-300"
              >
                {loadingSteps[loadingStep]}
              </div>

              <div className="flex items-center gap-1.5 mt-5">
                {loadingSteps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i <= loadingStep ? "w-6 bg-yellow-400/70" : "w-3 bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="mb-8">
              <SectionLabel>Key signals from the evidence</SectionLabel>
              <InsightGrid items={retailerInsights} accent="orange" />
            </div>

            <Card className="p-5 border-yellow-400/20 bg-yellow-400/[0.025] mb-8">
              <div className="text-yellow-400 text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">Discuss as a team</div>
              <p className="text-white/75 text-[15px] leading-relaxed">
                Does this evidence support or challenge what you heard from Rohini? What does it suggest about the real problem?
              </p>
            </Card>

            <div className="flex justify-end">
              <PrimaryButton onClick={onNext}>Review Full Investigation</PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

// ─── Screen 11: Combined Insights ─────────────────────────────────────────────
export function ScreenInsights({
  onNext,
  onBack,
  dismissedNotes,
  onDismissNote,
}: {
  onNext: () => void;
  onBack?: () => void;
  dismissedNotes: Set<FacilitatorNoteId>;
  onDismissNote: (id: FacilitatorNoteId) => void;
}) {
  const rohini = stakeholders[0];
  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />

        <FacilitatorNote
          noteId="insights"
          message={FACILITATOR_NOTES.insights}
          dismissed={dismissedNotes.has("insights")}
          onDismiss={(id) => onDismissNote(id as FacilitatorNoteId)}
        />

        <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
          Review what your team has learned
        </h1>
        <p className="text-white/45 text-[15px] mb-6">
          Your team interviewed Rohini Agarwal and chose to review Retailer Complaints as your evidence source.
        </p>

        <Card className="p-4 mb-8">
          <SectionLabel>Completed Investigation Path</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Avatar src={rohini.image} alt={rohini.name} size="sm" ring />
              <div>
                <div className="text-white/40 text-[11px]">Interviewed</div>
                <div className="text-white text-sm font-medium">{rohini.name}</div>
                <div className="text-white/45 text-xs">Regional {rohini.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-white/40 text-[11px]">Evidence selected by your team</div>
                <div className="text-white text-sm font-medium">Retailer Complaints</div>
                <div className="text-emerald-400 text-xs">Reviewed</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Interview Insights</SectionLabel>
            <span className="text-white/30 text-[11px]">From Rohini Agarwal</span>
          </div>
          <InsightGrid items={interviewInsights} accent="yellow" />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Retailer Complaint Insights</SectionLabel>
            <span className="text-white/30 text-[11px]">Evidence selected by your team</span>
          </div>
          <InsightGrid items={retailerInsights} accent="orange" />
        </div>

        <Card className="p-5 border-yellow-400/20 bg-yellow-400/[0.025] mb-8">
          <SectionLabel>
            <span className="text-yellow-400/80">What this suggests</span>
          </SectionLabel>
          <p className="text-white text-[15px] leading-relaxed italic">"{synthesis}"</p>
        </Card>

        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>Define the Problem</PrimaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Screen 12: Problem Statement ────────────────────────────────────────────
export function ScreenProblem({
  onNext,
  onBack,
  problemStatement,
  setProblemStatement,
  confidence,
  setConfidence,
  assumption,
  setAssumption,
}: {
  onNext: () => void;
  onBack?: () => void;
  problemStatement: string;
  setProblemStatement: (v: string) => void;
  confidence: "Low" | "Medium" | "High" | null;
  setConfidence: (v: "Low" | "Medium" | "High") => void;
  assumption: string;
  setAssumption: (v: string) => void;
}) {
  const [insightsOpen, setInsightsOpen] = useState(false);

  return (
    <PageWrapper>
      <div className="flex-1 py-8 pt-[16px]">
        <BackButton onClick={onBack} />
        <StepIndicator steps={FLOW_STEPS} current={4} />

        <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
          Define the problem your team believes is worth solving
        </h1>
        <p className="text-white/50 text-[15px] mb-6 max-w-2xl">
          Based on your interview with Rohini Agarwal and the retailer complaint review, write the problem your team believes Gulf Beverages should solve first.
        </p>

        {/* Collapsible Insights */}
        <Card className="mb-6 overflow-hidden">
          <button
            onClick={() => setInsightsOpen(!insightsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#facc15" strokeWidth="2"/>
                  <path d="M12 16v-4M12 8h.01" stroke="#facc15" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-white text-sm font-medium">Review your investigation insights</div>
                <div className="text-white/40 text-[11px]">
                  Interviewed: Rohini Agarwal · Evidence: Retailer Complaints
                </div>
              </div>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className={`text-white/40 transition-transform ${insightsOpen ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {insightsOpen && (
            <div className="border-t border-white/[0.06] p-4 space-y-5">
              <div>
                <div className="text-yellow-400/80 text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">
                  Interview Insights
                </div>
                <div className="space-y-2">
                  {interviewInsights.map((c, i) => (
                    <div key={i} className="text-[13px]">
                      <span className="text-white font-medium">{c.title}.</span>{" "}
                      <span className="text-white/55">{c.body}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-orange-300/80 text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">
                  Retailer Insights
                </div>
                <div className="space-y-2">
                  {retailerInsights.map((c, i) => (
                    <div key={i} className="text-[13px]">
                      <span className="text-white font-medium">{c.title}.</span>{" "}
                      <span className="text-white/55">{c.body}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-white/70 text-xs italic border-l-2 border-yellow-400/40 pl-3">
                "{synthesis}"
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 border-yellow-400/15 mb-5">
          <div className="text-yellow-400 text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">Scaffold</div>
          <p className="text-white/65 text-[15px] italic">"{problemScaffold}"</p>
        </Card>

        <div className="mb-6">
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="Write your team's problem statement here…"
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] text-white placeholder-white/25 p-4 text-sm focus:outline-none focus:border-yellow-400/40 focus:bg-white/[0.03] transition-all resize-none"
          />
        </div>

        <div className="mb-6">
          <SectionLabel>How confident is your team?</SectionLabel>
          <div className="flex gap-3">
            {(["Low", "Medium", "High"] as const).map((level) => {
              const isSelected = confidence === level;
              const styles = CONFIDENCE_STYLES[level];
              return (
                <button
                  key={level}
                  onClick={() => setConfidence(level)}
                  className={`flex-1 py-2.5 rounded-full border text-sm font-medium cursor-pointer transition-all ${
                    isSelected
                      ? styles.selected
                      : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <SectionLabel>What is one assumption your team would still want to test?</SectionLabel>
          <input
            type="text"
            value={assumption}
            onChange={(e) => setAssumption(e.target.value)}
            placeholder="e.g. That the delisting threat is immediate rather than a negotiating tactic…"
            className="w-full rounded-full border border-white/10 bg-white/[0.02] text-white placeholder-white/25 px-5 py-3 text-sm focus:outline-none focus:border-yellow-400/40 focus:bg-white/[0.03] transition-all"
          />
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={onNext} disabled={!problemStatement.trim() || !confidence || !assumption.trim()}>
            Submit Problem Statement
          </PrimaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─── Screen 13: Confirmation ─────────────────────────────────────────────────
export function ScreenConfirm({
  problemStatement,
  confidence,
  assumption,
  onReview,
  onBack,
  teamName,
}: {
  problemStatement: string;
  confidence: "Low" | "Medium" | "High" | null;
  assumption: string;
  onReview: () => void;
  onBack?: () => void;
  teamName: string;
}) {
  const conf = confidence ? CONFIDENCE_STYLES[confidence] : null;

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const dashboardUrl = `${basePath}/results`;

  return (
    <PageWrapper>
      <div className="flex-1 py-8">
        <BackButton onClick={onBack} />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Problem statement submitted</h1>
          <p className="text-white/50 text-[15px]">
            Your team's response has been sent to the facilitator dashboard.
          </p>
        </div>

        <Card className="p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="text-white/40 text-[10px] uppercase tracking-[0.14em] mb-1">Submitted by</div>
              <div className="text-white text-sm font-medium">{teamName}</div>
            </div>
            {conf && confidence && (
              <Pill variant={conf.pill}>{confidence} Confidence</Pill>
            )}
          </div>

          <SectionLabel>Problem Statement</SectionLabel>
          <p className="text-white text-[15px] leading-relaxed mb-5">"{problemStatement}"</p>

          {assumption && (
            <>
              <SectionLabel>Assumption to Test</SectionLabel>
              <p className="text-white/70 text-[15px] leading-relaxed">{assumption}</p>
            </>
          )}
        </Card>

        <Card className="p-5 border-white/10 mb-6">
          <p className="text-white/60 text-[15px] leading-relaxed">
            Please return to the main workshop room when your facilitator calls time. In the debrief, you'll compare your investigation path and problem statement with other teams.
          </p>
        </Card>

        <Card className="p-4 border-yellow-400/15 bg-yellow-400/[0.02] mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="18" rx="1.5" stroke="#facc15" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="18" rx="1.5" stroke="#facc15" strokeWidth="2"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/70 text-[13px]">
                <span className="text-yellow-400 font-medium">Facilitator:</span> view all team submissions in the dashboard.
              </div>
            </div>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/[0.06] hover:bg-yellow-400/[0.12] text-yellow-400 text-[12px] font-medium transition-colors"
            >
              Open Dashboard
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </a>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/">
            <PrimaryButton>Return to Main Workshop Room</PrimaryButton>
          </Link>
          <SecondaryButton onClick={onReview}>Review Your Learnings</SecondaryButton>
        </div>
      </div>
    </PageWrapper>
  );
}