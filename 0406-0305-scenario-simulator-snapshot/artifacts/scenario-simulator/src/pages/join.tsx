import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  getListSessionsQueryKey,
  useCreateOrResumeSession,
  useListSessions,
} from "@workspace/api-client-react";
import { SESSION_LABEL, TEAM_NAMES, WORKSHOP_CODE } from "../lib/constants";
import { readStoredTeam, writeStoredTeam } from "../lib/teamStorage";
import { Header, LivePill, MetaGrid, PrimaryButton, TeamCallout } from "../simulation/components";
import { useScenario } from "../lib/scenario";

export default function JoinScreen() {
  const [, setLocation] = useLocation();
  const scenario = useScenario();
  const stored = typeof window !== "undefined" ? readStoredTeam() : null;
  const listParams = { workshopCode: WORKSHOP_CODE };
  const { data: sessions = [] } = useListSessions(listParams, {
    query: { refetchInterval: 3000, queryKey: getListSessionsQueryKey(listParams) },
  });
  const create = useCreateOrResumeSession();
  const [error, setError] = useState<string | null>(null);

  const claimed = new Map(sessions.map((s) => [s.teamName, s]));
  const openSlots = TEAM_NAMES.filter((name) => !claimed.has(name)).length;

  const join = (teamName: string) => {
    setError(null);
    const existing = claimed.get(teamName);
    if (existing && stored?.sessionId === existing.id) {
      writeStoredTeam({ sessionId: existing.id, teamName });
      setLocation(`/play/${existing.id}/${existing.currentScreen || "brief"}`);
      return;
    }
    if (existing) {
      setError("That team is already in the session.");
      return;
    }
    create.mutate(
      { data: { workshopCode: WORKSHOP_CODE, teamName } },
      {
        onSuccess: (session) => {
          writeStoredTeam({ sessionId: session.id, teamName: session.teamName });
          setLocation(`/play/${session.id}/${session.currentScreen || "brief"}`);
        },
        onError: () => setError("That team was just claimed. Pick another."),
      },
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-[720px] px-6 py-14">
        <div className="flex justify-center mb-6">
          <LivePill label="Live session active" />
        </div>
        <h1 className="text-[36px] mt-0 mb-3 text-center">Join the simulation</h1>
        <p className="text-[16px] text-[#6C6975] mb-8 text-center">
          One shared screen per team. Claim a slot — if you refresh, you come back to the same team.
        </p>
        <div className="mb-6">
          <MetaGrid
            items={[
              { label: "Session", value: SESSION_LABEL.split(":")[0] },
              { label: "Scenario", value: scenario.title },
              { label: "Duration", value: `${scenario.timing.defaultMinutes} minutes` },
              { label: "Open slots", value: `${openSlots} of ${TEAM_NAMES.length}` },
            ]}
          />
        </div>
        <div className="mb-8">
          <TeamCallout kicker="Work as a team">
            Discuss each choice before you confirm. The goal is not to solve the situation
            immediately — it is to identify the problem worth solving.
          </TeamCallout>
        </div>
        {stored && claimed.get(stored.teamName)?.id === stored.sessionId && (
          <div className="mb-6 flex justify-center">
            <PrimaryButton
              onClick={() =>
                setLocation(
                  `/play/${stored.sessionId}/${claimed.get(stored.teamName)?.currentScreen || "brief"}`,
                )
              }
            >
              Resume {stored.teamName}
            </PrimaryButton>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {TEAM_NAMES.map((name) => {
            const taken = claimed.has(name);
            const mine = stored && claimed.get(name)?.id === stored.sessionId;
            const disabled = taken && !mine;
            return (
              <button
                key={name}
                type="button"
                disabled={disabled || create.isPending}
                onClick={() => join(name)}
                className={`rounded-xl border px-4 py-6 text-[18px] font-semibold transition-all duration-200 ${
                  disabled
                    ? "bg-[#E7E4DD] text-[#6C6975] cursor-not-allowed border-[#E7E4DD]"
                    : "bg-white border-[#E7E4DD] text-[#301CA0] hover:border-[#301CA0] hover:bg-[#EAE8F6] hover:shadow-[0_0_0_1px_rgba(48,28,160,0.2)]"
                }`}
              >
                {name}
                {disabled && <div className="text-[14px] font-normal mt-1">Claimed</div>}
                {mine && <div className="text-[14px] font-normal mt-1">Your team</div>}
              </button>
            );
          })}
        </div>
        {error && <p className="text-[#B42318] text-[16px] mt-4">{error}</p>}
        <p className="text-center text-[14px] text-[#6C6975] mt-12">
          the Practice Labs by Ideate Innovation
        </p>
      </div>
    </div>
  );
}
