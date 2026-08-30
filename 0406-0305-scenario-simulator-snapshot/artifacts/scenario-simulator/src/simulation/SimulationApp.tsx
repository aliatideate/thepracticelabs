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
  type Screen,
  screenIndex,
} from "../lib/constants";
import { clearStoredTeam } from "../lib/teamStorage";
import { Header, TimeBanner, useSessionConfig } from "./components";
import {
  ScreenBrief,
  ScreenConfirm,
  ScreenDefine,
  ScreenEvidence,
  ScreenInterview,
  ScreenStakeholder,
} from "./screens";

export default function SimulationApp() {
  const { sessionId, screen } = useParams<{ sessionId: string; screen: string }>();
  const [, setLocation] = useLocation();
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
    clearStoredTeam();
    setLocation("/");
  }, [isError, setLocation]);
  const updateSession = useUpdateSession();
  const submitSession = useSubmitSession();
  const config = useSessionConfig();

  const [localProblem, setLocalProblem] = useState("");
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
        setLocation(`/play/${session.id}/${serverScreen}`, { replace: true });
      }
    }
  }, [session, currentScreen, setLocation]);

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

  const goTo = useCallback(
    (s: Screen, persist = true) => {
      setLocation(`/play/${sessionId}/${s}`);
      if (!persist || !session) return;
      if (screenIndex(s) >= screenIndex(session.currentScreen)) {
        mutateRef.current({ id: sessionId, data: { currentScreen: s } });
        queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: typeof session) =>
          old ? { ...old, currentScreen: s } : old,
        );
      }
    },
    [session, sessionId, setLocation, queryClient],
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

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#6C6975]">Loading team…</div>
    );
  }

  const interviewLocked = screenIndex(session.currentScreen) > screenIndex("interview");
  const stakeholderLocked = !!session.selectedStakeholder;
  const evidenceLocked = !!session.selectedEvidenceSource;

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header
        teamName={session.teamName}
        currentScreen={currentScreen}
        furthestIndex={furthestIndex}
        onStepClick={onStepClick}
      />
      <TimeBanner config={config} />
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
          onContinue={() => goTo("evidence")}
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
          teamName={session.teamName}
          problem={session.problemStatement || localProblem}
          confidence={session.confidence}
        />
      )}
    </div>
  );
}
