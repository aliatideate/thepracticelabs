import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";

export type SessionRoomSummary = {
  id: string;
  workshopCode: string;
  title: string;
  format: "investigation" | "branching";
  teamCount: number;
  durationMinutes: number;
  status: string;
  isPreview: boolean;
  runtimeWorkshopCode: string | null;
};

const SessionRoomContext = createContext<SessionRoomSummary | null>(null);

export function useSessionRoom(): SessionRoomSummary | null {
  return useContext(SessionRoomContext);
}

export function useSessionRoomRequired(): SessionRoomSummary {
  const ctx = useContext(SessionRoomContext);
  if (!ctx) throw new Error("useSessionRoomRequired outside SessionRoomProvider");
  return ctx;
}

/** Runtime workshop code for API calls (DEFAULT / MART / new codes). */
export function useRuntimeWorkshopCode(fallback: string): string {
  const room = useSessionRoom();
  return room?.runtimeWorkshopCode || room?.workshopCode || fallback;
}

export function SessionRoomProvider({
  children,
  code,
}: {
  children: React.ReactNode;
  code: string;
}) {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["workshop-session", code.toUpperCase()],
    queryFn: async () => {
      const res = await fetch(
        `/api/workshop-sessions/by-code/${encodeURIComponent(code.toUpperCase())}`,
      );
      if (!res.ok) throw new Error("not_found");
      return (await res.json()) as SessionRoomSummary;
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#6C6975]">
        Loading session…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#B42318] p-8 text-center">
        That session code was not found.
      </div>
    );
  }

  return (
    <SessionRoomContext.Provider value={data}>{children}</SessionRoomContext.Provider>
  );
}

export function SessionRoomFromRoute({ children }: { children: React.ReactNode }) {
  const { code } = useParams<{ code: string }>();
  if (!code) {
    return (
      <div className="min-h-screen bg-[#F8F6EF] flex items-center justify-center text-[#B42318]">
        Missing session code.
      </div>
    );
  }
  return <SessionRoomProvider code={code}>{children}</SessionRoomProvider>;
}
