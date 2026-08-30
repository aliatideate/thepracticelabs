import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSession, useUpdateSession, useSubmitSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Header } from "./components";
import { questions } from "../data/data";
import {
  ScreenCompany,
  ScreenScenario,
  ScreenInvestigate,
  ScreenIntro,
  ScreenQuestion,
  ScreenEvidence,
  ScreenEvidenceReveal,
  ScreenInsights,
  ScreenProblem,
  ScreenConfirm,
  FacilitatorNoteId,
} from "./screens";
import { ParticipantOverlay } from "./ParticipantOverlay";

const ALL_SCREENS = [
  "company",
  "scenario",
  "investigate",
  "intro",
  "q1",
  "q2",
  "q3",
  "q4",
  "evidence",
  "evidence_reveal",
  "insights",
  "problem",
  "confirm"
] as const;

type Screen = typeof ALL_SCREENS[number];

export default function SimulationApp() {
  const { sessionId, screen } = useParams<{ sessionId: string; screen: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const currentScreen = screen as Screen;
  
  const { data: session, isLoading } = useGetSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId),
      refetchOnWindowFocus: false,
    },
  });

  const updateSession = useUpdateSession();
  const submitSession = useSubmitSession();

  const [dismissedNotes, setDismissedNotes] = useState<Set<FacilitatorNoteId>>(new Set());

  // Debounced input state for problem and assumption
  const [localProblem, setLocalProblem] = useState("");
  const [localAssumption, setLocalAssumption] = useState("");

  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef({ problemStatement: "", assumption: "" });
  const mutateUpdateRef = useRef(updateSession.mutate);
  mutateUpdateRef.current = updateSession.mutate;

  useEffect(() => {
    if (session && initializedForId.current !== session.id) {
      initializedForId.current = session.id;
      setLocalProblem(session.problemStatement || "");
      setLocalAssumption(session.assumption || "");
      lastSaved.current = {
        problemStatement: session.problemStatement || "",
        assumption: session.assumption || "",
      };
      // Honor server-stored currentScreen on resume: if URL screen differs from
      // the server's last-known screen, redirect the URL to the server screen.
      // This prevents a stale URL from immediately overwriting saved progress.
      if (
        session.currentScreen &&
        session.currentScreen !== currentScreen &&
        (ALL_SCREENS as readonly string[]).includes(session.currentScreen)
      ) {
        setLocation(`/play/${session.id}/${session.currentScreen}`, { replace: true });
      }
    }
  }, [session, currentScreen, setLocation]);

  // Scroll to top whenever the screen changes (must stay before any early return
  // to keep hook order stable across renders)
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [currentScreen]);

  useEffect(() => {
    if (initializedForId.current !== sessionId) return;

    const timer = setTimeout(() => {
      if (
        localProblem !== lastSaved.current.problemStatement ||
        localAssumption !== lastSaved.current.assumption
      ) {
        mutateUpdateRef.current({
          id: sessionId,
          data: {
            problemStatement: localProblem,
            assumption: localAssumption,
          },
        });
        lastSaved.current = {
          problemStatement: localProblem,
          assumption: localAssumption,
        };
        // Optimistically update cache
        queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => 
          old ? { ...old, problemStatement: localProblem, assumption: localAssumption } : old
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localProblem, localAssumption, sessionId, queryClient]);


  // Update currentScreen on the backend whenever it changes
  useEffect(() => {
    if (session && currentScreen && session.currentScreen !== currentScreen) {
      mutateUpdateRef.current({
        id: sessionId,
        data: { currentScreen },
      });
      // Optimistically update
      queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => 
        old ? { ...old, currentScreen } : old
      );
    }
  }, [currentScreen, sessionId, session, queryClient]);

  const dismissNote = useCallback((id: FacilitatorNoteId) => {
    setDismissedNotes((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const goTo = (s: Screen) => {
    setLocation(`/play/${sessionId}/${s}`);
  };

  const goBack = () => {
    const currentIndex = ALL_SCREENS.indexOf(currentScreen);
    if (currentIndex > 0) {
      goTo(ALL_SCREENS[currentIndex - 1]);
    }
  };

  const handleAnswer = useCallback((questionId: string, choice: "A" | "B" | "C") => {
    if (!session) return;
    const existingAnswers = session.answers || [];
    const newAnswers = [...existingAnswers.filter(a => a.questionId !== questionId), { questionId, selected: choice }];
    
    updateSession.mutate({
      id: sessionId,
      data: { answers: newAnswers }
    });
    
    queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => 
      old ? { ...old, answers: newAnswers } : old
    );
  }, [session, sessionId, updateSession, queryClient]);

  const handleStakeholderSelect = useCallback((id: string) => {
    updateSession.mutate({ id: sessionId, data: { selectedStakeholder: id } });
    queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => 
      old ? { ...old, selectedStakeholder: id } : old
    );
  }, [sessionId, updateSession, queryClient]);

  const handleEvidenceSelect = useCallback((id: string) => {
    updateSession.mutate({ id: sessionId, data: { selectedEvidenceSource: id } });
    queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => 
      old ? { ...old, selectedEvidenceSource: id } : old
    );
  }, [sessionId, updateSession, queryClient]);

  const handleConfidenceSelect = useCallback((val: "Low" | "Medium" | "High") => {
    updateSession.mutate({ id: sessionId, data: { confidence: val } });
    queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => 
      old ? { ...old, confidence: val } : old
    );
  }, [sessionId, updateSession, queryClient]);

  const handleSubmit = () => {
    if (!session) return;
    // ensure we save latest problem/assumption before submit
    submitSession.mutate({
      id: sessionId,
      data: {
        problemStatement: localProblem,
        assumption: localAssumption,
        confidence: session.confidence || "Medium",
        selectedStakeholder: session.selectedStakeholder || "rohini",
        selectedEvidenceSource: session.selectedEvidenceSource || "retailer_complaints",
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
        goTo("confirm");
      }
    });
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#100f24] via-[#100a23] to-[#110322] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-yellow-400 border-r-2 border-r-transparent"></div>
      </div>
    );
  }

  const learnings = (session.answers || []).map((a) => {
    const q = questions.find((q) => q.id === a.questionId);
    return q?.learning ?? "";
  }).filter(Boolean);

  const questionScreens: Screen[] = ["q1", "q2", "q3", "q4"];
  const questionIndex = questionScreens.indexOf(currentScreen);
  const getNextAfterQuestion = (): Screen => {
    if (questionIndex >= 0 && questionIndex < questions.length - 1) {
      return questionScreens[questionIndex + 1];
    }
    return "evidence";
  };

  const showBack = ALL_SCREENS.indexOf(currentScreen) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100f24] via-[#100a23] to-[#110322] text-white relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[20%] w-[700px] h-[700px] rounded-full bg-purple-700/[0.04] blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/[0.025] blur-[120px]" />
      </div>

      <Header onExit={() => setLocation("/")} onHome={() => setLocation("/")} />

      <div
        key={currentScreen}
        className="relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
      >
        {currentScreen === "company" && (
          <ScreenCompany
            onNext={() => goTo("scenario")}
            onBack={showBack ? goBack : undefined}
            dismissedNotes={dismissedNotes}
            onDismissNote={dismissNote}
          />
        )}
        {currentScreen === "scenario" && (
          <ScreenScenario onNext={() => goTo("investigate")} onBack={goBack} />
        )}
        {currentScreen === "investigate" && (
          <ScreenInvestigate
            onNext={() => goTo("intro")}
            onBack={goBack}
            selected={session.selectedStakeholder}
            onSelect={handleStakeholderSelect}
          />
        )}
        {currentScreen === "intro" && (
          <ScreenIntro
            onNext={() => goTo("q1")}
            onBack={goBack}
            dismissedNotes={dismissedNotes}
            onDismissNote={dismissNote}
          />
        )}
        {questionIndex >= 0 && (
          <ScreenQuestion
            key={currentScreen}
            questionIndex={questionIndex}
            onNext={() => goTo(getNextAfterQuestion())}
            onBack={goBack}
            answers={session.answers || []}
            onAnswer={handleAnswer}
            learnings={learnings}
            dismissedNotes={dismissedNotes}
            onDismissNote={dismissNote}
          />
        )}
        {currentScreen === "evidence" && (
          <ScreenEvidence
            onNext={() => goTo("evidence_reveal")}
            onBack={goBack}
            selected={session.selectedEvidenceSource}
            onSelect={handleEvidenceSelect}
          />
        )}
        {currentScreen === "evidence_reveal" && (
          <ScreenEvidenceReveal onNext={() => goTo("insights")} onBack={goBack} />
        )}
        {currentScreen === "insights" && (
          <ScreenInsights
            onNext={() => goTo("problem")}
            onBack={goBack}
            dismissedNotes={dismissedNotes}
            onDismissNote={dismissNote}
          />
        )}
        {currentScreen === "problem" && (
          <ScreenProblem
            onNext={handleSubmit}
            onBack={goBack}
            problemStatement={localProblem}
            setProblemStatement={setLocalProblem}
            confidence={session.confidence}
            setConfidence={handleConfidenceSelect}
            assumption={localAssumption}
            setAssumption={setLocalAssumption}
          />
        )}
        {currentScreen === "confirm" && (
          <ScreenConfirm
            problemStatement={session.problemStatement || ""}
            confidence={session.confidence}
            assumption={session.assumption || ""}
            onReview={() => goTo("insights")}
            onBack={goBack}
            teamName={session.teamName}
          />
        )}
      </div>

      <ParticipantOverlay sessionId={sessionId} />
    </div>
  );
}