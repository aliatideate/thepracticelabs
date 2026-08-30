import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

export type EvidenceBlock =
  | { type: "heading"; text: string; level?: number }
  | { type: "paragraph"; text: string }
  | { type: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { type: "keyValue"; items: { label: string; value: string }[] }
  | { type: "callout"; text: string; label?: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "quote"; text: string; attribution: string };

export interface Scenario {
  id: string;
  title: string;
  exerciseType: string;
  timing: { defaultMinutes: number };
  company: {
    name: string;
    descriptor: string;
    logo: string;
    logoUrl: string;
    overview: string;
    facts: { label: string; value: string }[];
  };
  situation: string;
  stakeholders: {
    id: string;
    name: string;
    role: string;
    blurb: string;
    avatar: string;
    avatarUrl: string;
    sideNote: string;
    askLimit: number;
    questions: { id: string; text: string; answer: string }[];
  }[];
  evidence: {
    id: string;
    title: string;
    subtitle: string;
    teaser: string;
    sourceLabel: string;
    blocks: EvidenceBlock[];
  }[];
  submission: {
    prompt: string;
    placeholder: string;
    confidenceOptions: ("Low" | "Medium" | "High")[];
  };
}

const ScenarioContext = createContext<Scenario | null>(null);

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["scenario"],
    queryFn: async () => {
      const res = await fetch("/api/scenario");
      if (!res.ok) throw new Error("Failed to load scenario");
      return (await res.json()) as Scenario;
    },
    staleTime: Infinity,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--warm-white)] flex items-center justify-center text-[var(--muted)]">
        Loading scenario…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[var(--warm-white)] flex items-center justify-center text-[var(--error)] p-8 text-center">
        Could not load scenario content. Check that the API is running and content/scenario.json is present.
      </div>
    );
  }
  return <ScenarioContext.Provider value={data}>{children}</ScenarioContext.Provider>;
}

export function useScenario(): Scenario {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario must be used inside ScenarioProvider");
  return ctx;
}
