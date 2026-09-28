import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  getListSessionsQueryKey,
  useCreateOrResumeSession,
  useListSessions,
} from "@workspace/api-client-react";
import { ArrowLeft, Lock } from "lucide-react";
import {
  SESSION_LABEL,
  TEAM_EMOJIS,
  TEAM_NAMES,
  WORKSHOP_CODE,
  formatTeamLabel,
} from "../lib/constants";
import { readStoredTeam, writeStoredTeam } from "../lib/teamStorage";
import { Header, LivePill, MetaGrid, PrimaryButton, TeamCallout } from "../simulation/components";
import { useScenario } from "../lib/scenario";
import { useSessionRoom } from "../lib/sessionRoom";

export default function JoinScreen() {
  const [, setLocation] = useLocation();
  const scenario = useScenario();
  const room = useSessionRoom();
  const workshopCode = room?.runtimeWorkshopCode || room?.workshopCode || WORKSHOP_CODE;
  const teamSlots = TEAM_NAMES.slice(0, room?.teamCount ?? TEAM_NAMES.length);
  const stored = typeof window !== "undefined" ? readStoredTeam() : null;
  const listParams = { workshopCode };
  const { data: sessions = [] } = useListSessions(listParams, {
    query: { refetchInterval: 3000, queryKey: getListSessionsQueryKey(listParams) },
  });
  const create = useCreateOrResumeSession();
  const [error, setError] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [claimingSlot, setClaimingSlot] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState<(typeof TEAM_EMOJIS)[number] | "">("");

  const claimed = new Map(sessions.map((s) => [s.teamName, s]));
  const openSlots = teamSlots.filter((name) => !claimed.has(name)).length;
  const mySession =
    stored && claimed.get(stored.teamName)?.id === stored.sessionId
      ? claimed.get(stored.teamName)
      : undefined;
  const resumeCollapsed = !!mySession && !showAllTeams;
  const nameOk = displayName.trim().replace(/\s+/g, " ").length >= 2
    && displayName.trim().replace(/\s+/g, " ").length <= 24;

  const goToPlay = (sessionId: string, screen?: string | null) => {
    const path = room
      ? `/s/${room.workshopCode}/play/${sessionId}/${screen || "brief"}`
      : `/demand/play/${sessionId}/${screen || "brief"}`;
    setLocation(path);
  };

  const join = (teamName: string) => {
    setError(null);
    const existing = claimed.get(teamName);
    if (existing && stored?.sessionId === existing.id) {
      writeStoredTeam({ sessionId: existing.id, teamName });
      goToPlay(existing.id, existing.currentScreen);
      return;
    }
    if (existing) {
      setError("That team is already in the session.");
      return;
    }
    if (mySession) {
      setError("This table already has a slot. Ask the facilitator to release it if that was a mistake.");
      return;
    }
    setClaimingSlot(teamName);
    setDisplayName("");
    setEmoji("");
  };

  const cancelClaim = () => {
    setClaimingSlot(null);
    setError(null);
    setDisplayName("");
    setEmoji("");
  };

  const confirmIdentity = () => {
    if (!claimingSlot || !nameOk || !emoji) return;
    setError(null);
    create.mutate(
      {
        data: {
          workshopCode,
          teamName: claimingSlot,
          displayName: displayName.trim().replace(/\s+/g, " "),
          emoji,
        },
      },
      {
        onSuccess: (session) => {
          writeStoredTeam({ sessionId: session.id, teamName: session.teamName });
          goToPlay(session.id, session.currentScreen);
        },
        onError: () => {
          setError("That team was just claimed. Pick another.");
          setClaimingSlot(null);
        },
      },
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-[720px] px-6 py-14 tpl-page-in">
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
              { label: "Session", value: room?.title || SESSION_LABEL.split(":")[0] },
              { label: "Scenario", value: scenario.title },
              {
                label: "Duration",
                value: `${room?.durationMinutes ?? scenario.timing.defaultMinutes} minutes`,
              },
              { label: "Open slots", value: `${openSlots} of ${teamSlots.length}` },
            ]}
          />
        </div>
        <div className="mb-8">
          <TeamCallout kicker="Work as a team">
            Discuss each choice before you confirm. The goal is not to solve the situation
            immediately — it is to identify the problem worth solving.
          </TeamCallout>
        </div>

        {claimingSlot ? (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6">
            <button
              type="button"
              onClick={cancelClaim}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#301CA0] mb-3"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
              Back
            </button>
            <p className="text-[14px] uppercase tracking-wide text-[#6C6975] font-semibold mb-1">
              Team {TEAM_NAMES.findIndex((n) => n === claimingSlot) + 1}
            </p>
            <h2 className="text-[24px] mt-0 mb-2">Name your team</h2>
            <p className="text-[16px] text-[#6C6975] mb-5">
              Pick a name and an emoji. Other tables will see this on the join screen.
            </p>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="team-display-name">
              Team name
            </label>
            <input
              id="team-display-name"
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
            <div className="flex flex-wrap items-center gap-4">
              <PrimaryButton onClick={confirmIdentity} disabled={!nameOk || !emoji || create.isPending}>
                {create.isPending ? "Joining…" : "Continue"}
              </PrimaryButton>
              <button
                type="button"
                className="text-[16px] text-[#301CA0] underline"
                onClick={cancelClaim}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : resumeCollapsed ? (
          <div className="text-center">
            <PrimaryButton
              onClick={() => goToPlay(mySession.id, mySession.currentScreen)}
            >
              Resume {formatTeamLabel(mySession)}
            </PrimaryButton>
            <p className="mt-4">
              <button
                type="button"
                className="text-[16px] text-[#301CA0] underline"
                onClick={() => setShowAllTeams(true)}
              >
                See all teams
              </button>
            </p>
          </div>
        ) : (
          <>
            {mySession && (
              <p className="text-[14px] text-[#6C6975] mb-3 text-center">
                This table already has a slot. Ask the facilitator to release it if that was a mistake.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {teamSlots.map((name, index) => {
                const existing = claimed.get(name);
                const taken = !!existing;
                const mine = !!mySession && mySession.teamName === name;
                const disabled = (taken && !mine) || (!!mySession && !mine) || create.isPending;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={disabled}
                    onClick={() => join(name)}
                    className={`rounded-xl border px-4 py-6 text-[18px] font-semibold transition-all duration-200 ease-out ${
                      mine
                        ? "bg-[#EAE8F6] border-[#301CA0] text-[#301CA0] hover:scale-[1.03] active:scale-[0.97]"
                        : disabled
                          ? "bg-[#E7E4DD] text-[#6C6975] cursor-not-allowed border-[#E7E4DD]"
                          : "bg-white border-[#E7E4DD] text-[#301CA0] hover:border-[#301CA0] hover:bg-[#EAE8F6] hover:shadow-[0_0_0_1px_rgba(48,28,160,0.2)] hover:scale-[1.03] active:scale-[0.97]"
                    }`}
                  >
                    {existing ? (
                      <>
                        <div className="text-[28px] leading-none mb-2">{existing.emoji || "•"}</div>
                        <div>{existing.displayName?.trim() || name}</div>
                      </>
                    ) : (
                      <>
                        <div>Pick slot</div>
                        <div className="text-[14px] font-normal mt-1 text-[#6C6975]">
                          Team {index + 1}
                        </div>
                      </>
                    )}
                    {taken && !mine && (
                      <div className="text-[14px] font-normal mt-1 inline-flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" strokeWidth={2} /> Slot taken
                      </div>
                    )}
                    {mine && <div className="text-[14px] font-normal mt-1">Your team</div>}
                  </button>
                );
              })}
            </div>
            {mySession && (
              <p className="text-center mt-4">
                <button
                  type="button"
                  className="text-[16px] text-[#301CA0] underline"
                  onClick={() => setShowAllTeams(false)}
                >
                  Hide team list
                </button>
              </p>
            )}
          </>
        )}
        {error && !claimingSlot && <p className="text-[#B42318] text-[16px] mt-4">{error}</p>}
        <p className="text-center text-[14px] text-[#6C6975] mt-12">
          the Practice Labs by Ideate Innovation
        </p>
      </div>
    </div>
  );
}
