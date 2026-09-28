import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  MART_DURATION_MINUTES,
  MART_SESSION_LABEL,
  TEAM_EMOJIS,
} from "../lib/constants";
import { clearMartTryTeam, readMartTryTeam, writeMartTryTeam } from "../lib/teamStorage";
import { Header, LivePill, MetaGrid, PrimaryButton, TeamCallout } from "../simulation/components";
import { useDecisionGame } from "../lib/decisionGame";

type TrySession = {
  id: string;
  teamName: string;
  displayName: string;
  emoji: string;
  currentScreen: string;
};

export default function TryJoin() {
  const [, setLocation] = useLocation();
  const game = useDecisionGame();
  const stored = typeof window !== "undefined" ? readMartTryTeam() : null;
  const [resume, setResume] = useState<TrySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState<(typeof TEAM_EMOJIS)[number] | "">("");
  const [pending, setPending] = useState(false);

  React.useEffect(() => {
    if (!stored?.sessionId) return;
    fetch(`/api/try/sessions/${stored.sessionId}`).then(async (res) => {
      if (!res.ok) {
        clearMartTryTeam();
        return;
      }
      setResume((await res.json()) as TrySession);
    });
  }, [stored?.sessionId]);

  const nameOk =
    displayName.trim().replace(/\s+/g, " ").length >= 2 &&
    displayName.trim().replace(/\s+/g, " ").length <= 24;

  const goToPlay = (sessionId: string) => setLocation(`/mart/try/play/${sessionId}`);

  const startNew = async () => {
    if (!nameOk || !emoji) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/try/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim().replace(/\s+/g, " "),
          emoji,
        }),
      });
      if (!res.ok) {
        setError("Could not start a try-out. Try again.");
        return;
      }
      const session = (await res.json()) as TrySession;
      writeMartTryTeam({ sessionId: session.id, teamName: session.teamName });
      goToPlay(session.id);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        sessionLabel={MART_SESSION_LABEL}
        titleOverride={game.scenario.title}
        hideFlowNav
        clock={{ startedAt: null, durationMinutes: MART_DURATION_MINUTES, endedAt: null }}
      />
      <div className="mx-auto max-w-[720px] px-6 py-14 tpl-page-in">
        <div className="flex justify-center mb-6">
          <LivePill label="Try-out — not the live workshop" />
        </div>
        <h1 className="text-[36px] mt-0 mb-3 text-center">Try the game</h1>
        <p className="text-[16px] text-[#6C6975] mb-8 text-center">
          Your own 15-minute clock starts when you begin the week. This does not affect the live
          workshop.
        </p>
        <div className="mb-6">
          <MetaGrid
            items={[
              { label: "Session", value: "Mart try-out" },
              { label: "Scenario", value: game.scenario.title },
              { label: "Duration", value: `${MART_DURATION_MINUTES} minutes` },
              { label: "Clock", value: "Starts with you" },
            ]}
          />
        </div>
        <div className="mb-8">
          <TeamCallout kicker="Sandbox">
            Share /mart/try with colleagues. Each person gets a private run and timer.
          </TeamCallout>
        </div>

        {resume && (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 mb-6 text-center">
            <p className="text-[16px] m-0 mb-4">
              You have a try-out in progress as {resume.emoji} {resume.displayName}.
            </p>
            <PrimaryButton onClick={() => goToPlay(resume.id)}>Resume try-out</PrimaryButton>
            <p className="mt-4 mb-0">
              <button
                type="button"
                className="text-[16px] text-[#301CA0] underline"
                onClick={() => {
                  clearMartTryTeam();
                  setResume(null);
                }}
              >
                Start a new try-out instead
              </button>
            </p>
          </div>
        )}

        {!resume && (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6">
            <h2 className="text-[24px] mt-0 mb-2">Name your team</h2>
            <p className="text-[16px] text-[#6C6975] mb-5">
              Pick a name and an emoji. This is only for your try-out.
            </p>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="try-team-name">
              Team name
            </label>
            <input
              id="try-team-name"
              type="text"
              maxLength={24}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Supply Wizards"
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-5"
            />
            <p className="text-[14px] font-semibold mb-2">Emoji</p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
              {TEAM_EMOJIS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEmoji(item)}
                  className={`h-12 rounded-xl border text-[24px] transition-all ${
                    emoji === item
                      ? "border-[#301CA0] bg-[#EAE8F6] scale-[1.05]"
                      : "border-[#E7E4DD] bg-white hover:border-[#301CA0]"
                  }`}
                  aria-label={`Choose ${item}`}
                  aria-pressed={emoji === item}
                >
                  {item}
                </button>
              ))}
            </div>
            {error && <p className="text-[#B42318] text-[16px] mb-4">{error}</p>}
            <PrimaryButton onClick={startNew} disabled={!nameOk || !emoji || pending}>
              {pending ? "Starting…" : "Start try-out"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
