import React, { useEffect, useRef, useState } from "react";
import { useScenario } from "../lib/scenario";
import { Card, PageShell, PrimaryButton } from "./components";
import { DocumentPanel } from "./documentBlocks";

export function ScreenBrief({ onNext }: { onNext: () => void }) {
  const { company, situation } = useScenario();
  return (
    <PageShell>
      <h1 className="text-[32px] mb-2">Read the brief</h1>
      <p className="text-[16px] text-[#6C6975] mb-8">
        Start here. You can come back to this page at any time.
      </p>
      <div className="bg-white border border-[#E7E4DD] rounded-xl p-8 mb-6">
        <div className="flex items-center gap-6 pb-6 border-b border-[#E7E4DD] mb-6">
          <img src={company.logoUrl} alt={company.name} className="h-16 w-auto object-contain" />
          <div>
            <h2 className="text-[28px] m-0">{company.name}</h2>
            <p className="text-[16px] text-[#6C6975] m-0">{company.descriptor}</p>
          </div>
        </div>
        <p className="text-[16px] leading-relaxed m-0">{company.overview}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {company.facts.map((f) => (
          <div key={f.label} className="bg-white border border-[#E7E4DD] rounded-xl p-4">
            <div className="text-[14px] text-[#6C6975] uppercase tracking-wide mb-1">{f.label}</div>
            <div className="text-[16px]">{f.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E7E4DD] rounded-xl p-8 mb-8">
        <h2 className="text-[24px] mt-0 mb-3">The situation</h2>
        <p className="text-[16px] leading-relaxed m-0">{situation}</p>
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
  useEffect(() => setPending(selectedId), [selectedId]);

  return (
    <PageShell>
      <h1 className="text-[32px] mb-2">Pick a stakeholder</h1>
      <p className="text-[16px] text-[#6C6975] max-w-3xl mb-8">
        You interview one stakeholder and review one document. A mis-click costs the team the
        exercise — select, then confirm.
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
                <div className="text-[18px] font-semibold">{s.name}</div>
                <div className={locked && selectedId === s.id ? "text-white/80" : "text-[#301CA0]"}>
                  {s.role}
                </div>
                <p className="text-[15px] mt-2 mb-0 opacity-90">{s.blurb}</p>
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
            <div className="text-[16px] font-semibold text-[#1D1D24]">{e.title}</div>
            <div className="text-[14px] mt-1">{e.subtitle}</div>
            <div className="text-[13px] uppercase tracking-wide mt-3">Locked</div>
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
  const [thinkingId, setThinkingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

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
  const canAsk = !locked && !atLimit && !thinkingId;

  const handleAsk = (id: string) => {
    if (!canAsk) return;
    setThinkingId(id);
    timer.current = setTimeout(() => {
      onAsk(id);
      setThinkingId(null);
    }, 850);
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
              Question {Math.min(askedCount + (thinkingId ? 1 : 0), stakeholder.askLimit)} of{" "}
              {stakeholder.askLimit}
            </div>
          </div>

          <div className="space-y-4 mb-6 max-h-[420px] overflow-y-auto pr-1">
            {history.map((q) => (
              <div key={q!.id} className="bg-white border border-[#E7E4DD] rounded-xl p-5">
                <div className="text-[14px] text-[#6C6975] mb-2">You asked</div>
                <p className="text-[16px] font-medium m-0 mb-3">{q!.text}</p>
                <div className="text-[14px] text-[#301CA0] mb-1">{stakeholder.name} answered</div>
                <p className="text-[16px] leading-relaxed m-0">{q!.answer}</p>
              </div>
            ))}
            {thinkingId && (
              <div className="bg-white border border-[#E7E4DD] rounded-xl p-5 text-[#6C6975]">
                {stakeholder.name} is thinking…
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

          {!locked && askedCount > 0 && (
            <div className="flex justify-end">
              <PrimaryButton onClick={onContinue} disabled={!!thinkingId}>
                Continue to Evidence
              </PrimaryButton>
            </div>
          )}
          {!locked && askedCount === 0 && (
            <p className="text-[14px] text-[#6C6975]">Ask at least one question, or wait — you may continue after the first answer.</p>
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
  const stakeholder = scenario.stakeholders.find((s) => s.id === stakeholderId);
  const [pending, setPending] = useState<string | null>(selectedId);
  useEffect(() => setPending(selectedId), [selectedId]);
  const doc = scenario.evidence.find((e) => e.id === selectedId);

  return (
    <PageShell>
      <h1 className="text-[32px] mb-2">Review evidence</h1>
      {stakeholder && (
        <div className="bg-white border border-[#E7E4DD] rounded-xl p-5 mb-6">
          <div className="text-[14px] text-[#6C6975] mb-2">Interview so far · {stakeholder.name}</div>
          {answers.length === 0 ? (
            <p className="m-0 text-[16px]">No questions were asked.</p>
          ) : (
            <ul className="m-0 pl-5 text-[16px]">
              {answers.map((a) => {
                const q = stakeholder.questions.find((qq) => qq.id === a.questionId);
                return <li key={a.questionId}>{q?.text ?? a.questionId}</li>;
              })}
            </ul>
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

      {doc && (
        <DocumentPanel
          title={doc.title}
          subtitle={doc.subtitle}
          sourceLabel={doc.sourceLabel}
          blocks={doc.blocks}
        />
      )}

      {doc && !readOnly && (
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
      <h1 className="text-[32px] mb-4">Define the problem</h1>
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
        {submission.confidenceOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={readOnly}
            onClick={() => setConfidence(opt)}
            className={`px-4 py-2 rounded-lg border text-[16px] ${
              confidence === opt
                ? "bg-[#301CA0] text-white border-[#301CA0]"
                : "bg-white border-[#E7E4DD]"
            }`}
          >
            {opt}
          </button>
        ))}
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
  problem,
  confidence,
}: {
  teamName: string;
  problem: string;
  confidence: string | null;
}) {
  return (
    <PageShell>
      <h1 className="text-[32px] mb-2">Submitted</h1>
      <div className="bg-white border border-[#2E7D5B] rounded-xl p-8 max-w-3xl mb-8">
        <div className="text-[14px] uppercase tracking-wide text-[#2E7D5B] font-semibold mb-4">
          Team output
        </div>
        <dl className="space-y-3">
          <div>
            <dt className="text-[14px] text-[#6C6975]">Team</dt>
            <dd className="m-0 text-[18px] font-semibold">{teamName}</dd>
          </div>
          <div>
            <dt className="text-[14px] text-[#6C6975]">Confidence</dt>
            <dd className="m-0 text-[18px]">{confidence ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[14px] text-[#6C6975]">Problem statement</dt>
            <dd className="m-0 text-[16px] leading-relaxed whitespace-pre-wrap">{problem}</dd>
          </div>
        </dl>
      </div>
      <p className="text-[16px] max-w-2xl">
        Stay in your breakout until the facilitator calls time, then return to the main workshop
        room. There is nothing further to click here.
      </p>
    </PageShell>
  );
}
