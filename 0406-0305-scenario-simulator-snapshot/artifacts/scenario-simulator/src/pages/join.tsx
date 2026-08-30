import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  getListSessionsQueryKey,
  useCreateOrResumeSession,
  useListSessions,
} from "@workspace/api-client-react";
import { TEAM_NAMES, WORKSHOP_CODE } from "../lib/constants";
import { readStoredTeam, writeStoredTeam } from "../lib/teamStorage";
import { Header, PrimaryButton } from "../simulation/components";
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
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header />
      <div className="mx-auto max-w-[720px] px-6 py-16">
        <p className="text-[14px] uppercase tracking-wide text-[#301CA0] font-semibold mb-2">
          the Practice Labs by Ideate Innovation
        </p>
        <h1 className="text-[36px] mt-0 mb-3">Join your team</h1>
        <p className="text-[16px] text-[#6C6975] mb-8">
          {scenario.title}. One shared screen per team. Claim a slot — if you refresh, you come back
          to the same team.
        </p>
        {stored && claimed.get(stored.teamName)?.id === stored.sessionId && (
          <div className="mb-6">
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
                className={`rounded-xl border px-4 py-6 text-[18px] font-semibold ${
                  disabled
                    ? "bg-[#E7E4DD] text-[#6C6975] cursor-not-allowed"
                    : "bg-white border-[#E7E4DD] hover:border-[#301CA0] hover:bg-[#EAE8F6] text-[#301CA0]"
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
      </div>
    </div>
  );
}
