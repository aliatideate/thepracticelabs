import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateOrResumeSession } from "@workspace/api-client-react";
import {
  DEMAND_TRY_WORKSHOP_CODE,
  TEAM_EMOJIS,
  SESSION_LABEL,
} from "../lib/constants";
import { clearDemandTryTeam, readDemandTryTeam, writeDemandTryTeam } from "../lib/teamStorage";
import { Header, LivePill, MetaGrid, PrimaryButton, TeamCallout } from "../simulation/components";
import { useScenario } from "../lib/scenario";

type TrySession = {
  id: string;
  teamName: string;
  displayName: string;
  emoji: string;
  currentScreen: string;
};

export default function DemandTryJoin() {
  const [, setLocation] = useLocation();
  const scenario = useScenario();
  const stored = typeof window !== "undefined" ? readDemandTryTeam() : null;
  const create = useCreateOrResumeSession();
  const [resume, setResume] = useState<TrySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState<(typeof TEAM_EMOJIS)[number] | "">("");

  React.useEffect(() => {
    if (!stored?.sessionId) return;
    fetch(`/api/sessions/${stored.sessionId}`).then(async (res) => {
      if (!res.ok) {
        clearDemandTryTeam();
        return;
      }
      setResume((await res.json()) as TrySession);
    });
  }, [stored?.sessionId]);

  const nameOk =
    displayName.trim().replace(/\s+/g, " ").length >= 2 &&
    displayName.trim().replace(/\s+/g, " ").length <= 24;

  const goToPlay = (sessionId: string, screen?: string | null) =>
    setLocation(`/demand/try/play/${sessionId}/${screen || "brief"}`);

  const startNew = () => {
    if (!nameOk || !emoji) return;
    setError(null);
    create.mutate(
      {
        data: {
          workshopCode: DEMAND_TRY_WORKSHOP_CODE,
          teamName: "try",
          displayName: displayName.trim().replace(/\s+/g, " "),
          emoji,
        },
      },
      {
        onSuccess: (session) => {
          writeDemandTryTeam({ sessionId: session.id, teamName: session.teamName });
          goToPlay(session.id, session.currentScreen);
        },
        onError: () => setError("Could not start a try-out. Try again."),
      },
    );
  };

  return (
    <div className="min-h-screen">
      <Header
        sessionLabel={SESSION_LABEL}
        titleOverride={scenario.title}
        hideFlowNav
        clock={{ startedAt: null, durationMinutes: scenario.timing.defaultMinutes, endedAt: null }}
      />
      <div className="mx-auto max-w-[720px] px-6 py-14 tpl-page-in">
        <div className="flex justify-center mb-6">
          <LivePill label="Try-out — not the live workshop" />
        </div>
        <h1 className="text-[36px] mt-0 mb-3 text-center">Try the simulation</h1>
        <p className="text-[16px] text-[#6C6975] mb-8 text-center">
          Your own {scenario.timing.defaultMinutes}-minute clock starts when you join. This does not
          affect the live workshop.
        </p>
        <div className="mb-6">
          <MetaGrid
            items={[
              { label: "Session", value: "Demand try-out" },
              { label: "Scenario", value: scenario.title },
              { label: "Duration", value: `${scenario.timing.defaultMinutes} minutes` },
              { label: "Clock", value: "Starts with you" },
            ]}
          />
        </div>
        <div className="mb-8">
          <TeamCallout kicker="Sandbox">
            Share /demand/try with colleagues. Each person gets a private run and timer.
          </TeamCallout>
        </div>

        {resume && (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6 mb-6 text-center">
            <p className="text-[16px] m-0 mb-4">
              You have a try-out in progress as {resume.emoji} {resume.displayName}.
            </p>
            <PrimaryButton onClick={() => goToPlay(resume.id, resume.currentScreen)}>
              Resume try-out
            </PrimaryButton>
            <p className="mt-4 mb-0">
              <button
                type="button"
                className="text-[16px] text-[#301CA0] underline"
                onClick={() => {
                  clearDemandTryTeam();
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
            <label className="block text-[14px] font-semibold mb-2" htmlFor="demand-try-team-name">
              Team name
            </label>
            <input
              id="demand-try-team-name"
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
            <PrimaryButton onClick={startNew} disabled={!nameOk || !emoji || create.isPending}>
              {create.isPending ? "Starting…" : "Start try-out"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
