import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  getGetSessionQueryKey,
  useGetSession,
  useSubmitSession,
  useUpdateSession,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ALL_SCREENS,
  MIN_INTERVIEW_QUESTIONS,
  type Screen,
  screenIndex,
} from "../lib/constants";
import { clearDemandTryTeam, clearStoredTeam } from "../lib/teamStorage";
import { AnimatePresence, motion } from "framer-motion";
import { Header, TimeBanner, useSessionConfig } from "./components";
import { useScenario } from "../lib/scenario";
import {
  ScreenBrief,
  ScreenConfirm,
  ScreenDefine,
  ScreenEvidence,
  ScreenInterview,
  ScreenStakeholder,
} from "./screens";

export default function SimulationApp({ mode = "live" }: { mode?: "live" | "try" }) {
  const { sessionId, screen } = useParams<{ sessionId: string; screen: string }>();
  const [, setLocation] = useLocation();
  const scenario = useScenario();
  const playBase = mode === "try" ? "/demand/try/play" : "/demand/play";
  const joinPath = mode === "try" ? "/demand/try" : "/demand";
  const queryClient = useQueryClient();
  const currentScreen = ((ALL_SCREENS as readonly string[]).includes(screen)
    ? screen
    : "brief") as Screen;

  const { data: session, isLoading, isError } = useGetSession(sessionId, {
    query: {
      enabled: !!sessionId,
      retry: false,
      queryKey: getGetSessionQueryKey(sessionId),
    },
  });

  useEffect(() => {
    if (!isError) return;
    if (mode === "try") clearDemandTryTeam();
    else clearStoredTeam();
    setLocation(joinPath);
  }, [isError, setLocation, mode, joinPath]);
  const updateSession = useUpdateSession();
  const submitSession = useSubmitSession();
  const liveConfig = useSessionConfig(mode === "try" ? undefined : "/api/session-config");

  const [localProblem, setLocalProblem] = useState("");
  const [attentionBlinking, setAttentionBlinking] = useState(false);
  const attentionTimer = useRef<number | null>(null);
  const initializedForId = useRef<string | null>(null);
  const lastSavedProblem = useRef("");
  const mutateRef = useRef(updateSession.mutate);
  mutateRef.current = updateSession.mutate;

  useEffect(() => {
    if (!session) return;
    if (initializedForId.current !== session.id) {
      initializedForId.current = session.id;
      setLocalProblem(session.problemStatement || "");
      lastSavedProblem.current = session.problemStatement || "";
      const serverScreen = session.currentScreen as Screen;
      if (
        serverScreen &&
        serverScreen !== currentScreen &&
        (ALL_SCREENS as readonly string[]).includes(serverScreen)
      ) {
        setLocation(`${playBase}/${session.id}/${serverScreen}`, { replace: true });
      }
    }
  }, [session, currentScreen, setLocation, playBase]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [currentScreen]);

  useEffect(() => {
    if (initializedForId.current !== sessionId) return;
    const timer = setTimeout(() => {
      if (localProblem !== lastSavedProblem.current) {
        mutateRef.current({ id: sessionId, data: { problemStatement: localProblem } });
        lastSavedProblem.current = localProblem;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localProblem, sessionId]);

  const furthestIndex = session ? screenIndex(session.currentScreen) : 0;
  const viewingIndex = screenIndex(currentScreen);
  const readOnly = viewingIndex < furthestIndex || !!session?.submittedAt;
  const interviewComplete =
    (session?.answers?.length ?? 0) >= MIN_INTERVIEW_QUESTIONS ||
    screenIndex(session?.currentScreen ?? "brief") > screenIndex("interview");

  useEffect(() => {
    if (!session || !sessionId) return;
    if (interviewComplete) return;
    if (screenIndex(currentScreen) <= screenIndex("interview")) return;
    setLocation(`${playBase}/${sessionId}/interview`, { replace: true });
  }, [session, sessionId, currentScreen, interviewComplete, setLocation, playBase]);

  const goTo = useCallback(
    (s: Screen, persist = true) => {
      setLocation(`${playBase}/${sessionId}/${s}`);
      if (!persist || !session) return;
      if (screenIndex(s) >= screenIndex(session.currentScreen)) {
        mutateRef.current({ id: sessionId, data: { currentScreen: s } });
        queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: typeof session) =>
          old ? { ...old, currentScreen: s } : old,
        );
      }
    },
    [session, sessionId, setLocation, queryClient, playBase],
  );

  const patch = (data: Record<string, unknown>) => {
    updateSession.mutate({ id: sessionId, data: data as never });
    queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: typeof session) =>
      old ? { ...old, ...data } : old,
    );
  };

  const onStepClick = (step: number) => {
    const map: Screen[] = ["brief", "stakeholder", "interview", "evidence", "define"];
    const target = map[step];
    if (target) goTo(target, false);
  };

  const askModerator = () => {
    const ok = window.confirm(
      "Ask the moderator to join your breakout room?",
    );
    if (!ok || !sessionId) return;
    void fetch(`/api/sessions/${sessionId}/flag`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ flagged: true }),
    });
    setAttentionBlinking(true);
    if (attentionTimer.current) window.clearTimeout(attentionTimer.current);
    attentionTimer.current = window.setTimeout(() => {
      setAttentionBlinking(false);
      attentionTimer.current = null;
    }, 15_000);
  };

  useEffect(() => () => {
    if (attentionTimer.current) window.clearTimeout(attentionTimer.current);
  }, []);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#6C6975]">Loading team…</div>
    );
  }

  const interviewLocked = screenIndex(session.currentScreen) > screenIndex("interview");
  const stakeholderLocked = !!session.selectedStakeholder;
  const evidenceLocked = !!session.selectedEvidenceSource;
  const config =
    mode === "try"
      ? {
          startedAt: session.createdAt,
          durationMinutes: scenario.timing.defaultMinutes,
          endedAt: session.submittedAt,
        }
      : liveConfig;

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header
        teamName={session.displayName?.trim() || session.teamName}
        teamEmoji={session.emoji || undefined}
        currentScreen={currentScreen}
        furthestIndex={furthestIndex}
        onStepClick={onStepClick}
        onAskModerator={askModerator}
        attentionBlinking={attentionBlinking}
        configPath={mode === "try" ? undefined : "/api/session-config"}
        clock={mode === "try" ? config : undefined}
      />
      <TimeBanner config={config} />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
      {currentScreen === "brief" && <ScreenBrief onNext={() => goTo("stakeholder")} />}
      {currentScreen === "stakeholder" && (
        <ScreenStakeholder
          selectedId={session.selectedStakeholder}
          locked={stakeholderLocked}
          readOnly={readOnly && stakeholderLocked}
          onConfirm={(id) => {
            patch({ selectedStakeholder: id, currentScreen: "interview" });
            goTo("interview");
          }}
        />
      )}
      {currentScreen === "interview" && session.selectedStakeholder && (
        <ScreenInterview
          stakeholderId={session.selectedStakeholder}
          answers={session.answers || []}
          locked={interviewLocked}
          onAsk={(questionId) => {
            const next = [
              ...(session.answers || []),
              { questionId, askedAt: new Date().toISOString() },
            ];
            patch({ answers: next });
          }}
          onContinue={() => {
            if ((session.answers || []).length < MIN_INTERVIEW_QUESTIONS) return;
            goTo("evidence");
          }}
        />
      )}
      {currentScreen === "evidence" && (
        <ScreenEvidence
          selectedId={session.selectedEvidenceSource}
          locked={evidenceLocked}
          stakeholderId={session.selectedStakeholder}
          answers={session.answers || []}
          readOnly={readOnly && evidenceLocked}
          onConfirm={(id) => {
            patch({ selectedEvidenceSource: id });
          }}
          onNext={() => goTo("define")}
        />
      )}
      {currentScreen === "define" && (
        <ScreenDefine
          problem={localProblem}
          setProblem={setLocalProblem}
          confidence={session.confidence}
          setConfidence={(val) => patch({ confidence: val })}
          submitting={submitSession.isPending}
          readOnly={!!session.submittedAt}
          onSubmit={() => {
            submitSession.mutate(
              {
                id: sessionId,
                data: {
                  problemStatement: localProblem,
                  assumption: session.assumption || "",
                  confidence: session.confidence || "Medium",
                  selectedStakeholder: session.selectedStakeholder || "",
                  selectedEvidenceSource: session.selectedEvidenceSource || "",
                },
              },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
                  goTo("confirm");
                },
              },
            );
          }}
        />
      )}
      {currentScreen === "confirm" && (
        <ScreenConfirm
          teamName={session.displayName?.trim() || session.teamName}
          teamEmoji={session.emoji || undefined}
          problem={session.problemStatement || localProblem}
          confidence={session.confidence}
        />
      )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
