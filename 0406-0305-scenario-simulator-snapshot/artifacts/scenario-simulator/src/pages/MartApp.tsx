import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import { BookOpen, Check } from "lucide-react";
import {
  MART_CONFIG_PATH,
  MART_DURATION_MINUTES,
  MART_SESSION_LABEL,
  MART_WORKSHOP_CODE,
  formatTeamLabel,
} from "../lib/constants";
import { useRuntimeWorkshopCode } from "../lib/sessionRoom";
import { Header, PrimaryButton, TimeBanner, useSessionConfig } from "../simulation/components";
import {
  gradeTone,
  optionIconSrc,
  sceneSrc,
  travelSrc,
  placeName,
  useDecisionGame,
  type DecisionItem,
  type DecisionGame,
  type RevealPayload,
  type Scoring,
  type StyleKey,
} from "../lib/decisionGame";

type Choice = { decisionId: string; optionId: string; at: string };
type MartSession = {
  id: string;
  teamName: string;
  displayName: string;
  emoji: string;
  currentScreen: "intro" | "decision" | "reveal";
  decisionIndex: number;
  choices: Choice[];
  flaggedForDebrief: boolean;
  startedAt: string | null;
};

type TravelPhase = "storeOut" | "road" | "roadOut";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Typewriter({ text, className }: { text: string; className?: string }) {
  const [n, setN] = useState(() => (prefersReducedMotion() ? text.length : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          window.clearInterval(id);
          return v;
        }
        return Math.min(text.length, v + 2);
      });
    }, 16);
    return () => window.clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  return (
    <p className={className}>
      {text.slice(0, n)}
      {!done && <span className="mart-type-caret" aria-hidden="true" />}
    </p>
  );
}

function OutcomeDot({ outcome }: { outcome?: "good" | "mixed" | "bad" }) {
  const tone = outcome ?? "mixed";
  const label = tone === "good" ? "Went well" : tone === "bad" ? "Went poorly" : "Mixed result";
  const color = tone === "good" ? "#2F9E44" : tone === "bad" ? "#C0392B" : "#E0A106";
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: 12, height: 12, background: color, boxShadow: `0 0 0 2px ${color}33` }}
      title={label}
      aria-label={label}
    />
  );
}

export default function MartApp({ mode = "live" }: { mode?: "live" | "try" }) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const game = useDecisionGame();
  const workshopCode = useRuntimeWorkshopCode(MART_WORKSHOP_CODE);
  const qs = `workshopCode=${encodeURIComponent(workshopCode)}`;
  const apiBase = mode === "try" ? "/api/try" : "/api/mart";
  const configPath =
    mode === "try" ? undefined : `${MART_CONFIG_PATH}?${qs}`;
  const liveConfig = useSessionConfig(configPath);
  const [session, setSession] = useState<MartSession | null>(null);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingOption, setPendingOption] = useState<Choice["optionId"] | null>(null);
  const [justChosen, setJustChosen] = useState<Choice | null>(null);
  const [revealStep, setRevealStep] = useState(0);
  const [blink, setBlink] = useState(false);
  const [traveling, setTraveling] = useState<null | { from: DecisionItem; to: DecisionItem; phase: TravelPhase }>(null);
  const [arrive, setArrive] = useState(false);
  const showHotspots = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("hotspot");

  const load = async () => {
    const url =
      mode === "try"
        ? `${apiBase}/sessions/${sessionId}`
        : `${apiBase}/sessions/${sessionId}?${qs}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as MartSession;
    setSession(data);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [sessionId, apiBase, qs, mode]);

  useEffect(() => {
    if (session?.currentScreen === "reveal") setRevealStep(0);
  }, [session?.currentScreen]);

  const start = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: mode === "try" ? "{}" : JSON.stringify({ workshopCode }),
      });
      if (res.ok) setSession((await res.json()) as MartSession);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (decisionId: string, optionId: Choice["optionId"]) => {
    if (busy || justChosen) return;
    setBusy(true);
    setPendingOption(optionId);
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}/choice`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decisionId,
          optionId,
          ...(mode === "try" ? {} : { workshopCode }),
        }),
      });
      if (!res.ok) return;
      const next = (await res.json()) as MartSession;
      setSession(next);
      setJustChosen({ decisionId, optionId, at: new Date().toISOString() });
    } finally {
      setBusy(false);
      setPendingOption(null);
    }
  };

  const askModerator = async () => {
    if (!session) return;
    const ok = window.confirm("Ask the moderator to join your breakout room?");
    if (!ok) return;
    await fetch(`${apiBase}/sessions/${session.id}/flag`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        flagged: true,
        ...(mode === "try" ? {} : { workshopCode }),
      }),
    });
    setBlink(true);
    setTimeout(() => setBlink(false), 15000);
  };

  if (!session) {
    return (
      <div className="mart-shell flex items-center justify-center">
        Loading your team…
      </div>
    );
  }

  const tryClock = {
    startedAt: session.startedAt,
    durationMinutes: MART_DURATION_MINUTES,
    endedAt: null,
  };
  const config = mode === "try" ? tryClock : liveConfig;

  const answered =
    justChosen && game.decisions.find((d) => d.id === justChosen.decisionId);
  const incoming = game.decisions[session.decisionIndex];
  const onScreen = traveling?.from ?? answered ?? incoming;
  const lastChoice =
    justChosen &&
    session.choices.find((c) => c.decisionId === justChosen.decisionId);
  const lastOption =
    lastChoice &&
    answered?.options.find((o) => o.id === lastChoice.optionId);
  const scene = onScreen ? sceneSrc(game, onScreen) : game.assets.sceneImage;
  const decision = onScreen;

  const goNextBranch = () => {
    const done =
      session.currentScreen === "reveal" || session.choices.length >= game.decisions.length;
    if (done || prefersReducedMotion() || !incoming) {
      setJustChosen(null);
      setTraveling(null);
      return;
    }
    const from = answered ?? incoming;
    if (!from) return;
    setArrive(false);
    setTraveling({ from, to: incoming, phase: "storeOut" });
    window.setTimeout(() => {
      setJustChosen(null);
      setTraveling((current) => (current ? { ...current, phase: "road" } : current));
    }, 520);
    window.setTimeout(() => {
      setTraveling((current) => (current ? { ...current, phase: "roadOut" } : current));
    }, 2920);
    window.setTimeout(() => {
      setTraveling(null);
      setArrive(true);
    }, 3440);
  };

  return (
    <div className="mart-shell">
      <Header
        teamName={formatTeamLabel(session)}
        teamEmoji={session.emoji}
        configPath={configPath}
        clock={mode === "try" ? tryClock : undefined}
        liveLabel={mode === "try" ? "Try-out" : "Live"}
        sessionLabel={MART_SESSION_LABEL}
        titleOverride={game.scenario.title}
        hideFlowNav
        onAskModerator={mode === "try" ? undefined : askModerator}
        attentionBlinking={mode === "try" ? false : blink || session.flaggedForDebrief}
      />
      <TimeBanner
        config={config}
        expiredMessage={
          mode === "try"
            ? "This try-out has ended."
            : "Time's up. Please return to the main workshop room."
        }
      />

      {session.currentScreen === "intro" && (
        <div className="mx-auto max-w-[880px] px-6 py-10">
          <p className="mart-pixel text-[28px] text-[#301CA0] mb-3">{game.scenario.title}</p>
          <div className="flex flex-col gap-4">
            <div className="mart-card p-8">
              <p className="text-[22px] leading-snug m-0 mb-3 text-[#1A0F58]">{game.intro.role}</p>
              <p className="text-[18px] leading-relaxed m-0">{game.intro.setting}</p>
              {game.intro.goal ? (
                <p className="text-[18px] leading-relaxed m-0 mt-4">{game.intro.goal}</p>
              ) : null}
            </div>
            <div className="mart-card p-8">
              <h2 className="text-[22px] mt-0 mb-4">{game.playbook.title}</h2>
              <PlaybookRules rules={game.playbook.rules} />
              <div className="mt-8">
                <PrimaryButton onClick={start} disabled={busy}>
                  Start the week
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {(session.currentScreen === "decision" || justChosen) && decision && (
        <div className="relative min-h-[calc(100dvh-110px)] bg-[#fce1c0]">
          <div className="absolute inset-0 flex items-start justify-center pt-2 pointer-events-none">
            <div
              className={`relative mart-scene-frame ${
                traveling ? "is-store-out" : arrive ? "is-store-in" : ""
              }`}
            >
              <img
                key={scene}
                src={scene}
                alt=""
                width={1416}
                height={941}
                className="mart-scene block w-auto h-auto max-w-[min(1416px,100%)] max-h-[min(941px,calc(100dvh-150px))] select-none"
              />
              {!traveling && !justChosen && (
                <div
                  className={`absolute pointer-events-none rounded-sm mart-hotspot ${showHotspots ? "outline outline-2 outline-lime-400" : ""}`}
                  style={{
                    left: `${decision.hotspot.x}%`,
                    top: `${decision.hotspot.y}%`,
                    width: `${decision.hotspot.w}%`,
                    height: `${decision.hotspot.h}%`,
                  }}
                />
              )}
            </div>
          </div>

          {(traveling?.phase === "road" || traveling?.phase === "roadOut") && (
            <div
              className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#fce1c0] ${
                traveling.phase === "roadOut" ? "mart-travel-overlay is-leaving" : "mart-travel-overlay"
              }`}
            >
              <p className="mart-pixel text-[28px] md:text-[34px] text-[#1A0F58] px-6 text-center mb-4">
                On the road to {placeName(traveling.to.location.name)}
              </p>
              {travelSrc(game, traveling.to) && (
                <img
                  src={travelSrc(game, traveling.to) ?? ""}
                  alt=""
                  className="mart-car-pulse w-[min(920px,88vw)] h-auto select-none pointer-events-none"
                />
              )}
            </div>
          )}

          <div className="relative z-10 flex flex-col min-h-[calc(100dvh-110px)] pt-4 pb-2">
            <div className="mx-auto w-full max-w-[1280px] flex flex-wrap items-center justify-end gap-3">
              <span className="mart-pixel text-[20px] text-[#1A0F58] rounded-full bg-[#F8F6EF]/90 px-3 py-1">
                Branch {decision.order} of {game.decisions.length}
              </span>
              <button
                type="button"
                onClick={() => setPlaybookOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#F8F6EF] text-[#301CA0] font-semibold px-4 py-2"
              >
                <BookOpen className="h-4 w-4" />
                Playbook
              </button>
            </div>
            <div className="flex justify-center mt-3">
              <p className="mart-pixel text-center text-[18px] m-0 text-white rounded-full bg-[#1A0F58]/80 px-4 py-1.5 shadow-sm backdrop-blur-[2px]">
                {decision.location.name}
              </p>
            </div>

            <div
              className={`mt-auto mx-auto w-full max-w-[1280px] ${traveling ? "opacity-0 pointer-events-none" : ""}`}
            >
              {justChosen && lastOption ? (
                <div className="mart-card px-5 py-3 flex flex-wrap items-center gap-3">
                  <Typewriter
                    key={`${justChosen.decisionId}-${justChosen.optionId}`}
                    text={lastOption.immediate}
                    className="text-[20px] md:text-[22px] leading-snug m-0 flex-1 min-w-[16rem]"
                  />
                  <PrimaryButton onClick={goNextBranch}>
                    {session.currentScreen === "reveal" ||
                    session.choices.length >= game.decisions.length
                      ? "See what happened"
                      : "Next branch"}
                  </PrimaryButton>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="mart-card px-6 py-4">
                    <Typewriter
                      key={decision.id}
                      text={decision.situation}
                      className="text-[20px] md:text-[22px] leading-snug m-0 text-center"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {decision.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        disabled={busy}
                        onClick={() => choose(decision.id, o.id)}
                        className="mart-card mart-option px-4 py-3 flex items-center gap-4 text-left disabled:opacity-50"
                      >
                        <img
                          src={optionIconSrc(game, decision, o)}
                          alt=""
                          className={`${o.id === "call" ? "h-[72px]" : "h-[84px]"} w-auto shrink-0 object-contain`}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = o.id === "call" ? game.assets.phoneImage : game.assets.doorImage;
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] md:text-[16px] font-semibold leading-snug">
                            {o.label}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pendingOption && <p className="text-[14px] text-[#6C6975] mt-2">Saving…</p>}
            </div>
          </div>
        </div>
      )}

      {session.currentScreen === "reveal" && !justChosen && (
        <RevealScreen
          sessionId={session.id}
          teamName={session.displayName}
          game={game}
          step={revealStep}
          setStep={setRevealStep}
          apiBase={apiBase}
          workshopCode={mode === "try" ? undefined : workshopCode}
        />
      )}

      {playbookOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setPlaybookOpen(false)}>
          <div className="mart-card max-w-[560px] w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[24px] mt-0 mb-4">{game.playbook.title}</h2>
            <PlaybookRules rules={game.playbook.rules} />
            <button type="button" className="text-[#301CA0] font-semibold underline mt-4" onClick={() => setPlaybookOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RevealScreen({
  sessionId,
  teamName,
  game,
  step,
  setStep,
  apiBase,
  workshopCode,
}: {
  sessionId: string;
  teamName: string;
  game: DecisionGame;
  step: number;
  setStep: (n: number) => void;
  apiBase: string;
  workshopCode?: string;
}) {
  const [payload, setPayload] = useState<RevealPayload | null>(null);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [paperIn, setPaperIn] = useState(reduced);

  useEffect(() => {
    const q = workshopCode
      ? `?workshopCode=${encodeURIComponent(workshopCode)}`
      : "";
    fetch(`${apiBase}/sessions/${sessionId}/reveal${q}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setPayload(data as RevealPayload));
  }, [sessionId, apiBase, workshopCode]);

  useEffect(() => {
    if (reduced) {
      setStep(2);
      setPaperIn(true);
      return;
    }
    setPaperIn(false);
    const t = window.setTimeout(() => setPaperIn(true), 700);
    return () => window.clearTimeout(t);
  }, [reduced, setStep]);

  const stories = payload?.stories ?? [];
  const lead = stories[0];
  const rest = stories.slice(1);
  const scoring = payload?.scoring;

  return (
    <div className="mx-auto max-w-[960px] px-6 py-8">
      <p className="mart-pixel text-[32px] text-center text-[#301CA0] mb-6">{game.reveal.title.toUpperCase()}</p>
      {(step >= 0 || reduced) && (
        <div className="mart-print-well mb-6">
          <article className={`mart-paper bg-[#fbf8f0] text-[#1D1D24] p-6 md:p-8 ${paperIn ? "is-printed" : ""}`}>
            <p className="font-serif text-[40px] text-center m-0 leading-none">{game.reveal.masthead}</p>
            <p className="text-center text-[14px] uppercase tracking-[0.2em] mt-2 mb-5 border-y border-[#1D1D24] py-2">
              {game.reveal.dateline}
            </p>
            {lead && (
              <div className="mb-5">
                <h2 className="font-serif text-[32px] mt-0 mb-2 leading-tight flex gap-3 items-start">
                  <OutcomeDot outcome={lead.outcome} />
                  <span>{lead.headline}</span>
                </h2>
                <p className="text-[18px] m-0">{lead.standfirst}</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {rest.map((s) => (
                <div key={s.headline}>
                  <h3 className="text-[18px] font-semibold mt-0 mb-1 flex gap-2 items-start">
                    <OutcomeDot outcome={s.outcome} />
                    <span>{s.headline}</span>
                  </h3>
                  <p className="text-[15px] m-0">{s.standfirst}</p>
                </div>
              ))}
            </div>
            <span className="mart-paper-serration" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="12" preserveAspectRatio="none">
                <defs>
                  <pattern id="mart-receipt-zig" x="0" y="0" width="22" height="12" patternUnits="userSpaceOnUse">
                    <polygon points="0,0 22,0 11,11" fill="#fbf8f0" />
                  </pattern>
                </defs>
                <rect width="100%" height="12" fill="url(#mart-receipt-zig)" />
              </svg>
            </span>
          </article>
        </div>
      )}
      {step >= 1 && payload && (
        <div className="mart-card p-6 mb-4">
          <p className="mart-pixel text-[22px] text-[#301CA0] m-0 mb-1">
            Your decisions and your manager's review of them
          </p>
          <p className="text-[15px] text-[#6C6975] m-0 mb-4">
            This is your manager's read, based on the company's field playbook.
          </p>
          <div className="space-y-3">
            {payload.breakdown.map((row) => (
              <div
                key={row.decisionId}
                className={`rounded-xl border px-4 py-3 ${
                  row.gradeKey === "judgment" ? "bg-[#F4F3F8] border-[#C8C6D4]" : "bg-white border-[#E7E4DD]"
                }`}
              >
                <div className="text-[13px] uppercase tracking-wide text-[#6C6975] mb-1">
                  Question {row.order} · {row.location}
                </div>
                {row.situation ? (
                  <p className="text-[15px] m-0 mb-2 text-[#1D1D24]">{row.situation}</p>
                ) : null}
                <div className="text-[13px] uppercase tracking-wide text-[#6C6975] mb-0.5">You chose</div>
                <div className="text-[16px] font-semibold text-[#1A0F58] mb-1">{row.optionLabel ?? "—"}</div>
                <div className="flex flex-wrap items-center gap-2 text-[14px] mb-1">
                  {row.gradeKey === "best" ? (
                    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: gradeTone("best") }}>
                      <Check className="h-4 w-4" strokeWidth={3} />
                      {row.gradeLabel}
                    </span>
                  ) : (
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          row.gradeKey === "worst" || row.gradeKey === "poor"
                            ? "#C0392B"
                            : gradeTone(row.gradeKey),
                      }}
                    >
                      {[row.gradeLabel, row.tagLabel].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span className="text-[#6C6975]">
                    {row.rules.length === 0 ? "Discuss" : row.rules.map((n) => `Rule ${n}`).join(" · ")}
                  </span>
                </div>
                {row.rationale && <p className="text-[15px] m-0">{row.rationale}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {step >= 2 && payload && (
        <div className="mart-card !bg-white p-6 mb-4">
          <p className="mart-pixel text-[22px] text-[#301CA0] m-0 mb-3">{scoring?.ui.styleHeading ?? "Your decision-making style"}</p>
          {scoring ? (
            <StyleGrid scoring={scoring} current={payload.score?.style} teamName={teamName} />
          ) : null}
          {payload.score?.styleLabel?.description ? (
            <p className="text-[18px] m-0 mt-4 mb-3">
              <strong>Your style:</strong> {payload.score.styleLabel.description}
            </p>
          ) : null}
          <p className="text-[16px] m-0 mb-2">
            <strong>{scoring?.ui.thisWeek ?? "What you did:"}</strong>{" "}
            {payload.weekLine ?? [payload.slowLine, payload.fastLine].filter(Boolean).join(" ")}
          </p>
          {payload.score?.styleLabel?.tip ? (
            <p className="text-[16px] m-0">
              <strong>{scoring?.ui.suggestion ?? "Suggestion:"}</strong> {payload.score.styleLabel.tip}
            </p>
          ) : null}
        </div>
      )}
      {step >= 2 && (
        <div className="flex justify-end">
          <p className="rounded-xl bg-[#301CA0] text-white text-[18px] font-medium m-0 px-6 py-5 w-fit text-right">
            When you are ready, return to the main workshop room ↗
          </p>
        </div>
      )}
      {step < 2 && (
        <div className="flex justify-end mt-4">
          <PrimaryButton onClick={() => setStep(step + 1)}>Next</PrimaryButton>
        </div>
      )}
    </div>
  );
}

function PlaybookRules({ rules }: { rules: string[] }) {
  return (
    <ul className="mart-playbook-list">
      {rules.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ul>
  );
}

function styleBand(key: StyleKey, band?: "good" | "mixed" | "poor") {
  if (band) return band;
  if (key === "operator") return "good";
  if (key === "bottleneck") return "poor";
  return "mixed";
}

function StyleGrid({
  scoring,
  current,
  teamName,
}: {
  scoring: Scoring;
  current?: StyleKey;
  teamName: string;
}) {
  const labels = scoring.styles?.labels;
  const axes = scoring.styles?.axes;
  if (!labels || !axes?.columns || !axes?.rows) return null;
  const tiles = (Object.entries(labels) as [StyleKey, Scoring["styles"]["labels"][StyleKey]][]).map(
    ([key, label]) => ({ key, ...label }),
  );
  const [colLeft, colRight] = axes.columns;
  const [rowTop, rowBottom] = axes.rows;
  return (
    <div className="mart-style-board" role="group" aria-label={scoring.ui.styleHeading}>
      <span className="mart-style-col-left">{colLeft}</span>
      <span className="mart-style-col-right">{colRight}</span>
      <span className="mart-style-row-top">{rowTop}</span>
      <span className="mart-style-row-bottom">{rowBottom}</span>
      {tiles.map((tile) => {
        const selected = tile.key === current;
        const tipId = `style-tip-${tile.key}`;
        const band = styleBand(tile.key, tile.band);
        return (
          <div
            key={tile.key}
            className={`mart-style-tile mart-style-${tile.grid} is-${band} ${selected ? "is-current" : "is-faded"}`}
            tabIndex={0}
            aria-current={selected ? "true" : undefined}
            aria-describedby={tipId}
          >
            {selected && <span className="sr-only">{scoring.ui.yourStyle}</span>}
            <span className="mart-style-markers">
              {tile.ideal && <span className="mart-style-ideal">{scoring.ui.idealMarker}</span>}
              {selected && <span className="mart-style-here">{teamName}</span>}
            </span>
            <span className="mart-style-tile-name">
              {selected && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
              {tile.name}
            </span>
            <span className="mart-style-tip" id={tipId} role="tooltip">
              {tile.hover ?? tile.description}
            </span>
          </div>
        );
      })}
    </div>
  );
}
