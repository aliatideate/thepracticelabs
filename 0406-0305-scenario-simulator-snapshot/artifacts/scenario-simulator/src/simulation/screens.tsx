import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  Calendar,
  Check,
  Factory,
  FileText,
  Files,
  Lock,
  MessageSquare,
  PenLine,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useScenario } from "../lib/scenario";
import { useRuntimeWorkshopCode } from "../lib/sessionRoom";
import { Card, PageShell, PrimaryButton, TeamCallout, WaitStatus } from "./components";
import { DocumentPanel } from "./documentBlocks";
import {
  WORKSHOP_CODE,
  withMarketFlags,
  evidenceFilename,
  MIN_INTERVIEW_QUESTIONS,
} from "../lib/constants";

const STAKEHOLDER_ICON = {
  rohini: Calendar,
  fatima: Truck,
  james: Factory,
  rakesh: Wallet,
} as const;

function TypedAnswer({
  text,
  animate,
  onDone,
  onProgress,
}: {
  text: string;
  animate: boolean;
  onDone?: () => void;
  onProgress?: () => void;
}) {
  const full = text;
  const [shown, setShown] = useState(() => (animate ? "" : full));
  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);
  onDoneRef.current = onDone;
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!animate) {
      setShown(full);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(full);
      onDoneRef.current?.();
      return;
    }
    const chars = Array.from(full);
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(chars.length, i + 5);
      setShown(chars.slice(0, i).join(""));
      requestAnimationFrame(() => onProgressRef.current?.());
      if (i >= chars.length) {
        window.clearInterval(id);
        onDoneRef.current?.();
      }
    }, 24);
    return () => window.clearInterval(id);
  }, [animate, full]);

  const typing = animate && shown.length < full.length;
  return (
    <p className="text-[16px] leading-relaxed m-0">
      {shown}
      {typing ? <span className="tpl-caret" aria-hidden /> : null}
    </p>
  );
}

export function ScreenBrief({ onNext }: { onNext: () => void }) {
  const { company, situation } = useScenario();
  return (
    <PageShell>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="rounded-full border border-[#E7E4DD] px-3 py-1 text-[14px] text-[#6C6975]">
          Problem framing
        </span>
        <span className="rounded-full border border-[#301CA0] px-3 py-1 text-[14px] text-[#301CA0]">
          Supply chain operations
        </span>
      </div>
      <h1 className="text-[32px] mb-2">Read the brief</h1>
      <p className="text-[16px] text-[#6C6975] mb-8">
        Start here. You can come back to this page at any time.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8 items-stretch">
        <div className="bg-white border border-[#E7E4DD] rounded-xl p-8">
          <div className="pb-6 border-b border-[#E7E4DD] mb-6">
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-[83px] w-auto object-contain"
            />
          </div>
          <p className="text-[16px] leading-relaxed m-0">{company.overview}</p>
        </div>
        <div className="flex flex-col gap-3">
          {company.facts.map((f) => (
            <div key={f.label} className="bg-white border border-[#E7E4DD] rounded-xl p-4 flex-1">
              <div className="text-[14px] text-[#6C6975] uppercase tracking-wide mb-1">{f.label}</div>
              <div className="text-[16px]">{withMarketFlags(f.value)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="tpl-situation tpl-nav-mesh rounded-xl p-8 mb-8 text-white">
        <div className="animated-gradient" aria-hidden />
        <div className="relative z-10 flex items-start gap-4">
          <div className="shrink-0 rounded-lg bg-white/15 text-white p-2">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[24px] mt-0 mb-3 text-white">The situation</h2>
            <p className="text-[16px] leading-relaxed m-0 text-white/90">{situation}</p>
          </div>
        </div>
      </div>
      <div className="mb-8">
        <TeamCallout kicker="Discuss as a team">
          Read this together. Do not jump to a solution yet — you still have to choose who to
          interview and which document to open.
        </TeamCallout>
      </div>
      <div className="flex justify-end">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </PageShell>
  );
}

export function ScreenStakeholder({
  selectedId,
  locked,
  onConfirm,
  readOnly,
}: {
  selectedId: string | null;
  locked: boolean;
  onConfirm: (id: string) => void;
  readOnly: boolean;
}) {
  const { stakeholders, evidence } = useScenario();
  const [pending, setPending] = useState<string | null>(selectedId);
  const [ready, setReady] = useState(!!locked || !!selectedId);
  useEffect(() => setPending(selectedId), [selectedId]);
  useEffect(() => {
    if (locked || selectedId) setReady(true);
  }, [locked, selectedId]);

  const askLimit = stakeholders[0]?.askLimit ?? 3;
  const flowSteps = [
    { text: "Select 1 stakeholder to interview", Icon: User },
    { text: `Ask at least 2 questions (up to ${askLimit})`, Icon: MessageSquare },
    { text: "Pick 1 document to review", Icon: FileText },
    { text: "Review all the evidence you've gathered", Icon: Files },
    { text: "Write down what you think the key problem is", Icon: PenLine },
  ];

  return (
    <PageShell>
      {!ready && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-[#1A0F58]/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="need-to-do-title"
        >
          <div className="bg-[#F8F6EF] rounded-xl border-2 border-white shadow-[0_24px_64px_rgba(26,15,88,0.35)] max-w-[640px] w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 id="need-to-do-title" className="text-[28px] mt-0 mb-2">
              What you need to do
            </h2>
            <p className="text-[15px] text-[#6C6975] m-0 mb-6">
              Limited time before you brief the executive team on the exact problem.
            </p>
            <div className="flex flex-col mb-5">
              {flowSteps.map((step, i) => (
                <React.Fragment key={step.text}>
                  {i > 0 && (
                    <div className="flex py-1 pl-[18px]" aria-hidden>
                      <ArrowDown className="h-4 w-4 text-[#301CA0]" strokeWidth={2.25} />
                    </div>
                  )}
                  <div className="flex items-center gap-3 rounded-xl border border-[#E7E4DD] bg-white px-4 py-2.5 text-[16px]">
                    <step.Icon className="h-4 w-4 shrink-0 text-[#301CA0]" strokeWidth={2} />
                    <span>{step.text}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <p className="text-[15px] text-[#1D1D24] m-0 mb-6">
              Pick the combination you believe will get you the best understanding of the problem.
            </p>
            <div className="flex justify-end">
              <PrimaryButton onClick={() => setReady(true)}>Continue</PrimaryButton>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-[32px] mb-2">Pick a stakeholder</h1>
      <p className="text-[16px] text-[#6C6975] max-w-3xl mb-8">
        You interview one stakeholder (at least 2 questions, up to {askLimit}) and later review one
        document. Select, then confirm.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {stakeholders.map((s) => (
          <Card
            key={s.id}
            selected={pending === s.id && !locked}
            confirmed={locked && selectedId === s.id}
            onClick={readOnly || locked ? undefined : () => setPending(s.id)}
          >
            <div className="flex items-start gap-4">
              <img src={s.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
              <div>
                {(() => {
                  const Icon = STAKEHOLDER_ICON[s.id as keyof typeof STAKEHOLDER_ICON];
                  return Icon ? (
                    <div className={`mb-2 ${locked && selectedId === s.id ? "text-white/80" : "text-[#301CA0]"}`}>
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                  ) : null;
                })()}
                <div className="text-[18px] font-semibold">{s.name}</div>
                <div className={locked && selectedId === s.id ? "text-white/80" : "text-[#301CA0]"}>
                  {s.role}
                </div>
                <p
                  className={`text-[15px] mt-2 mb-0 ${
                    locked && selectedId === s.id ? "text-white/75" : "opacity-90"
                  }`}
                >
                  {s.blurb}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <h2 className="text-[20px] mb-2">Evidence you will not see if you interview instead</h2>
      <p className="text-[16px] text-[#6C6975] mb-4">
        After the interview you still pick one document. The other two stay closed. These are locked
        for now so you can see the trade-off.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {evidence.map((e) => (
          <Card key={e.id} locked>
            <Lock className="h-4 w-4 mb-2" strokeWidth={2} />
            <div className="text-[16px] font-semibold text-[#1D1D24]">{e.title}</div>
            <div className="text-[14px] mt-1">{e.subtitle}</div>
            <div className="text-[14px] uppercase tracking-wide mt-3">Locked</div>
          </Card>
        ))}
      </div>
      {!readOnly && !locked && (
        <div className="flex justify-end">
          <PrimaryButton disabled={!pending} onClick={() => pending && onConfirm(pending)}>
            Confirm stakeholder
          </PrimaryButton>
        </div>
      )}
    </PageShell>
  );
}

export function ScreenInterview({
  stakeholderId,
  answers,
  locked,
  onAsk,
  onContinue,
}: {
  stakeholderId: string;
  answers: { questionId: string; askedAt: string }[];
  locked: boolean;
  onAsk: (questionId: string) => void;
  onContinue: () => void;
}) {
  const scenario = useScenario();
  const stakeholder = scenario.stakeholders.find((s) => s.id === stakeholderId);
  const [wait, setWait] = useState<{ id: string; stage: "thinking" | "typing" } | null>(null);
  const [typingId, setTypingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const finishTyping = useRef(() => {});
  finishTyping.current = () => setTypingId(null);
  const stickThread = () => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useLayoutEffect(() => {
    stickThread();
  }, [answers.length, wait, typingId]);

  if (!stakeholder) {
    return (
      <PageShell>
        <p>No stakeholder selected.</p>
      </PageShell>
    );
  }

  const askedIds = new Set(answers.map((a) => a.questionId));
  const history = answers
    .map((a) => stakeholder.questions.find((q) => q.id === a.questionId))
    .filter(Boolean);
  const remaining = stakeholder.questions.filter((q) => !askedIds.has(q.id));
  const askedCount = answers.length;
  const atLimit = askedCount >= stakeholder.askLimit;
  const canAsk = !locked && !atLimit && !wait && !typingId;

  const handleAsk = (id: string) => {
    if (!canAsk) return;
    setWait({ id, stage: "thinking" });
    timer.current = setTimeout(() => {
      setWait({ id, stage: "typing" });
      timer.current = setTimeout(() => {
        onAsk(id);
        setWait(null);
        setTypingId(id);
      }, 900);
    }, 700);
  };

  return (
    <PageShell>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8">
        <div>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <img src={stakeholder.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="font-semibold text-[16px]">{stakeholder.name}</div>
                <div className="text-[14px] text-[#6C6975]">{stakeholder.role}</div>
              </div>
            </div>
            <div className="text-[16px] font-medium text-[#301CA0]">
              Question {Math.min(askedCount + (wait ? 1 : 0), stakeholder.askLimit)} of{" "}
              {stakeholder.askLimit}
            </div>
          </div>

          <div ref={threadRef} className="space-y-4 mb-6 max-h-[420px] overflow-y-auto pr-1">
            {history.map((q) => (
              <div key={q!.id} className="bg-white border border-[#E7E4DD] rounded-xl p-5">
                <div className="text-[14px] text-[#6C6975] mb-2">You asked</div>
                <p className="text-[16px] font-medium m-0 mb-3">{q!.text}</p>
                <div className="text-[14px] text-[#301CA0] mb-1">{stakeholder.name} answered</div>
                <TypedAnswer
                  text={q!.answer}
                  animate={typingId === q!.id}
                  onDone={() => finishTyping.current()}
                  onProgress={stickThread}
                />
              </div>
            ))}
            {wait && (
              <div className="bg-white border border-[#E7E4DD] rounded-xl p-5">
                <WaitStatus
                  mode={wait.stage}
                  label={
                    wait.stage === "thinking"
                      ? `${stakeholder.name} is thinking`
                      : `${stakeholder.name} is typing`
                  }
                />
              </div>
            )}
          </div>

          {!locked && !atLimit && (
            <div className="mb-8">
              <h2 className="text-[20px] mb-3">Choose a question</h2>
              <div className="space-y-2">
                {remaining.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    disabled={!canAsk}
                    onClick={() => handleAsk(q.id)}
                    className="w-full text-left rounded-xl border border-[#E7E4DD] bg-white p-4 text-[16px] hover:border-[#301CA0] hover:bg-[#EAE8F6] disabled:opacity-50"
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!locked && askedCount >= MIN_INTERVIEW_QUESTIONS && (
            <div className="flex justify-end">
              <PrimaryButton onClick={onContinue} disabled={!!wait || !!typingId}>
                Continue to Evidence
              </PrimaryButton>
            </div>
          )}
          {!locked && askedCount < MIN_INTERVIEW_QUESTIONS && (
            <p className="text-[14px] text-[#6C6975]">
              Ask at least {MIN_INTERVIEW_QUESTIONS} questions before you continue to evidence.
            </p>
          )}
        </div>
        <aside>
          <div className="bg-[#EAE8F6] border border-[#301CA0]/20 rounded-xl p-5 sticky top-28">
            <div className="text-[14px] uppercase tracking-wide text-[#301CA0] font-semibold mb-2">
              Keep in mind
            </div>
            <p className="text-[16px] m-0 leading-relaxed">{stakeholder.sideNote}</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

export function ScreenEvidence({
  selectedId,
  locked,
  stakeholderId,
  answers,
  onConfirm,
  onNext,
  readOnly,
}: {
  selectedId: string | null;
  locked: boolean;
  stakeholderId: string | null;
  answers: { questionId: string }[];
  onConfirm: (id: string) => void;
  onNext: () => void;
  readOnly: boolean;
}) {
  const scenario = useScenario();
  const workshopCode = useRuntimeWorkshopCode(WORKSHOP_CODE);
  const fileLabel = (id: string) =>
    evidenceFilename(id, scenario.company.shortName, workshopCode);
  const stakeholder = scenario.stakeholders.find((s) => s.id === stakeholderId);
  const [pending, setPending] = useState<string | null>(selectedId);
  const [opening, setOpening] = useState(false);
  const resumeDoc = useRef(Boolean(selectedId));
  useEffect(() => setPending(selectedId), [selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    if (resumeDoc.current) {
      resumeDoc.current = false;
      return;
    }
    setOpening(true);
    const id = setTimeout(() => setOpening(false), 1100);
    return () => clearTimeout(id);
  }, [selectedId]);
  const doc = scenario.evidence.find((e) => e.id === selectedId);

  return (
    <PageShell>
      <h1 className="text-[32px] mb-2">Review evidence</h1>
      {stakeholder && (
        <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 mb-6">
          <h2 className="text-[20px] mt-0 mb-5">{stakeholder.name}&apos;s responses</h2>
          {answers.length === 0 ? (
            <p className="m-0 text-[16px]">No questions were asked.</p>
          ) : (
            <div
              className={`grid grid-cols-1 gap-5 ${
                answers.length === 1 ? "" : answers.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
              }`}
            >
              {answers.map((a) => {
                const q = stakeholder.questions.find((qq) => qq.id === a.questionId);
                return (
                  <div key={a.questionId} className="rounded-xl bg-[#F8F6EF] px-5 py-5">
                    <div className="text-[15px] font-semibold mb-3 leading-snug">
                      {q?.text ?? a.questionId}
                    </div>
                    <p className="m-0 text-[15px] leading-relaxed text-[#6C6975]">
                      {q?.answer ?? ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!doc && (
        <>
          <p className="text-[16px] text-[#6C6975] mb-6">
            Choose one document. Select, then confirm. The other two stay closed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {scenario.evidence.map((e) => (
              <Card
                key={e.id}
                selected={pending === e.id && !locked}
                confirmed={locked && selectedId === e.id}
                onClick={readOnly || locked ? undefined : () => setPending(e.id)}
              >
                <FileText className="h-5 w-5 mb-3 text-[#301CA0]" strokeWidth={2} />
                <div className="text-[14px] font-mono text-[#6C6975] mb-1">{fileLabel(e.id)}</div>
                <div className="text-[18px] font-semibold">{e.title}</div>
                <div className={locked && selectedId === e.id ? "text-white/80 text-[15px]" : "text-[#6C6975] text-[15px]"}>
                  {e.subtitle}
                </div>
                <p className="text-[15px] mt-3 mb-0">{e.teaser}</p>
              </Card>
            ))}
          </div>
          {!readOnly && !locked && (
            <div className="flex justify-end">
              <PrimaryButton disabled={!pending} onClick={() => pending && onConfirm(pending)}>
                Confirm document
              </PrimaryButton>
            </div>
          )}
        </>
      )}

      {doc && opening && (
        <div className="bg-white border border-[#E7E4DD] rounded-xl p-8 mb-6">
          <div className="text-[14px] uppercase tracking-wide text-[#6C6975] mb-2">Opening file</div>
          <div className="text-[14px] font-mono text-[#6C6975] mb-1">{fileLabel(doc.id)}</div>
          <div className="text-[20px] font-semibold mb-4">{doc.title}</div>
          <WaitStatus mode="loading" label="Loading document" />
          <div className="mt-5 h-1.5 rounded-full bg-[#E7E4DD] overflow-hidden">
            <div className="tpl-load-bar h-full rounded-full bg-[#301CA0]" />
          </div>
        </div>
      )}

      {doc && !opening && (
        <>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E7E4DD] bg-white px-5 py-4 mb-6">
            <div>
              <div className="text-[14px] text-[#6C6975]">Evidence source unlocked</div>
              <div className="text-[14px] font-mono text-[#6C6975]">{fileLabel(doc.id)}</div>
              <div className="text-[18px] font-semibold">{doc.title}</div>
            </div>
            <div className="text-[14px] font-semibold text-[#2E7D5B]">Open</div>
          </div>
          <DocumentPanel
            title={doc.title}
            subtitle={doc.subtitle}
            sourceLabel={doc.sourceLabel}
            blocks={doc.blocks}
          />
          <div className="mt-6">
            <TeamCallout kicker="Discuss as a team">
              Does this document support or challenge what you heard in the interview? What does it
              suggest about the real problem?
            </TeamCallout>
          </div>
        </>
      )}

      {doc && !opening && (
        <div className="flex justify-end mt-8">
          <PrimaryButton onClick={onNext}>Continue to define the problem</PrimaryButton>
        </div>
      )}
    </PageShell>
  );
}

export function ScreenDefine({
  problem,
  setProblem,
  confidence,
  setConfidence,
  onSubmit,
  submitting,
  readOnly,
}: {
  problem: string;
  setProblem: (v: string) => void;
  confidence: "Low" | "Medium" | "High" | null;
  setConfidence: (v: "Low" | "Medium" | "High") => void;
  onSubmit: () => void;
  submitting: boolean;
  readOnly: boolean;
}) {
  const { submission } = useScenario();
  return (
    <PageShell>
      <h1 className="text-[32px] mb-2">Define the problem</h1>
      <p className="text-[16px] text-[#6C6975] mb-3 max-w-3xl">
        Write this for the executive team. They need a problem they can take action on — not a
        generic request for more stock.
      </p>
      <p className="text-[16px] leading-relaxed mb-6 max-w-3xl">{submission.prompt}</p>
      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        readOnly={readOnly}
        placeholder={submission.placeholder}
        className="w-full min-h-[180px] text-[16px] p-4 rounded-xl border border-[#E7E4DD] bg-white mb-6"
      />
      <div className="text-[16px] font-medium mb-2">How confident is the team?</div>
      <div className="flex gap-3 mb-8">
        {(["Low", "Medium", "High"] as const).map((opt) => {
          const selected = confidence === opt;
          const tone =
            opt === "Low"
              ? selected
                ? "bg-[#B42318] text-white border-[#B42318]"
                : "bg-white text-[#B42318] border-[#B42318]/50 hover:bg-[#B42318]/10"
              : opt === "Medium"
                ? selected
                  ? "bg-[#B7791F] text-white border-[#B7791F]"
                  : "bg-white text-[#B7791F] border-[#B7791F]/50 hover:bg-[#B7791F]/10"
                : selected
                  ? "bg-[#2E7D5B] text-white border-[#2E7D5B]"
                  : "bg-white text-[#2E7D5B] border-[#2E7D5B]/50 hover:bg-[#2E7D5B]/10";
          return (
            <button
              key={opt}
              type="button"
              disabled={readOnly}
              onClick={() => setConfidence(opt)}
              className={`px-4 py-2 rounded-full border text-[16px] font-semibold transition-colors duration-200 ${tone}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {!readOnly && (
        <PrimaryButton
          onClick={onSubmit}
          disabled={!problem.trim() || !confidence || submitting}
        >
          {submitting ? "Submitting…" : "Submit"}
        </PrimaryButton>
      )}
    </PageShell>
  );
}

export function ScreenConfirm({
  teamName,
  teamEmoji,
  problem,
  confidence,
}: {
  teamName: string;
  teamEmoji?: string;
  problem: string;
  confidence: string | null;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <PageShell>
      <SubmitConfetti />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.55, delay: 1.05, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <h1 className="text-[32px] mb-2 flex items-center gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2E7D5B]"
            aria-hidden
          >
            <Check className="h-4 w-4 text-white" strokeWidth={2.75} />
          </span>
          Submitted
        </h1>
        <div className="bg-white border border-[#2E7D5B] rounded-xl p-8 max-w-3xl mb-8">
          <div className="text-[14px] uppercase tracking-wide text-[#2E7D5B] font-semibold mb-4">
            Team output
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-[14px] text-[#6C6975]">Team</dt>
              <dd className="m-0 text-[18px] font-semibold inline-flex items-center gap-2">
                {teamEmoji ? <span className="text-[22px] leading-none">{teamEmoji}</span> : null}
                {teamName}
              </dd>
            </div>
            <div>
              <dt className="text-[14px] text-[#6C6975]">Confidence</dt>
              <dd className="m-0 text-[18px]">
                {confidence ? (
                  <span
                    className={`inline-flex items-center gap-2 font-semibold ${
                      confidence === "Low"
                        ? "text-[#B42318]"
                        : confidence === "High"
                          ? "text-[#2E7D5B]"
                          : "text-[#B7791F]"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        confidence === "Low"
                          ? "bg-[#B42318]"
                          : confidence === "High"
                            ? "bg-[#2E7D5B]"
                            : "bg-[#B7791F]"
                      }`}
                      aria-hidden
                    />
                    {confidence}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[14px] text-[#6C6975]">Problem statement</dt>
              <dd className="m-0 text-[16px] leading-relaxed whitespace-pre-wrap">{problem}</dd>
            </div>
          </dl>
        </div>
        <p className="text-[16px] max-w-2xl m-0 font-bold">
          Thank you for submitting your problem statement!
        </p>
        <p className="text-[16px] max-w-2xl mt-3 mb-0">
          You can join the main workshop link at any time to debrief with the wider group.
        </p>
      </motion.div>
    </PageShell>
  );
}

const CONFETTI_COLORS = ["#301CA0", "#5B4BD1", "#84C5B1", "#2E7D5B", "#F4D35E", "#FF8A5B", "#FFFFFF"];

type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  shape: "rect" | "ribbon" | "circle";
  born: number;
};

function spawnBurst(originX: number, originY: number, count: number, born: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.85;
    const speed = 3.4 + Math.random() * 6.2;
    const roll = Math.random();
    const shape: ConfettiPiece["shape"] = roll < 0.22 ? "circle" : roll < 0.55 ? "ribbon" : "rect";
    return {
      x: originX + (Math.random() - 0.5) * 90,
      y: originY + (Math.random() - 0.5) * 28,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.4,
      vy: Math.sin(angle) * speed,
      w: shape === "ribbon" ? 4 + Math.random() * 3 : 9 + Math.random() * 8,
      h: shape === "ribbon" ? 14 + Math.random() * 12 : shape === "circle" ? 7 + Math.random() * 6 : 10 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.18,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
      shape,
      born,
    };
  });
}

function SubmitConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const contentLeft = Math.max(24, (window.innerWidth - 1280) / 2 + 24);
    const originX = contentLeft + 240;
    const pieces = [
      ...spawnBurst(originX, 176, 70, 0),
      ...spawnBurst(originX + 70, 248, 55, 14),
      ...spawnBurst(originX - 30, 210, 40, 28),
    ];

    const duration = 150;
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of pieces) {
        if (frame < p.born) continue;
        const age = frame - p.born;
        p.vy += 0.11;
        p.vx *= 0.996;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const life = Math.max(0, 1 - age / (duration - p.born));
        if (life <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, life * 1.15);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (frame < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[90]"
      aria-hidden
    />
  );
}
