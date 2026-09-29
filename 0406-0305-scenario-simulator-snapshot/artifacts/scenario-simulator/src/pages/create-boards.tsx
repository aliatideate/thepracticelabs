import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AuthGate from "./auth-gate";
import { CreateShell, StatusTag, formatRanOn } from "./create-shell";

type BoardSession = {
  id: string;
  title: string;
  status: string;
  workshopCode: string;
  endedAt: string | null;
  clientId: string;
  clientName: string;
  paths: { facilitate: string; session: string };
};

const GROUPS: { key: "live" | "ready" | "ended"; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "ready", label: "Ready" },
  { key: "ended", label: "Ended" },
];

function BoardsHome() {
  const [clientFilter, setClientFilter] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["create-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/create/sessions", { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { sessions: BoardSession[] };
    },
  });

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of data?.sessions ?? []) {
      map.set(s.clientId, s.clientName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const filtered = useMemo(() => {
    const sessions = data?.sessions ?? [];
    if (clientFilter === "all") return sessions;
    return sessions.filter((s) => s.clientId === clientFilter);
  }, [data, clientFilter]);

  const grouped = useMemo(() => {
    const map: Record<"live" | "ready" | "ended", BoardSession[]> = {
      live: [],
      ready: [],
      ended: [],
    };
    for (const s of filtered) {
      if (s.status === "live" || s.status === "ready" || s.status === "ended") {
        map[s.status].push(s);
      }
    }
    return map;
  }, [filtered]);

  return (
    <CreateShell activeTab="boards">
      <p className="text-[16px] text-[#6C6975] mt-0 mb-4">
        Open the facilitator board for a session. Boards are tied to sessions, not exercises.
      </p>
      {clients.length > 1 && (
        <label className="block text-[14px] text-[#6C6975] mb-6">
          Client{" "}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="ml-2 rounded-lg border border-[#E7E4DD] bg-white px-3 py-2 text-[16px] text-[#1A1A1A]"
          >
            <option value="all">All clients</option>
            {clients.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      {isLoading && <p className="text-[#6C6975]">Loading…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-[#6C6975]">No sessions yet. Create one from the Clients tab.</p>
      )}
      {GROUPS.map((group) => {
        const list = grouped[group.key];
        if (list.length === 0) return null;
        return (
          <section key={group.key} className="mb-10">
            <h2 className="text-[20px] mt-0 mb-3">{group.label}</h2>
            <div className="space-y-3">
              {list.map((s) => {
                const ranOn = s.status === "ended" ? formatRanOn(s.endedAt) : null;
                return (
                  <Link
                    key={s.id}
                    href={s.paths.facilitate}
                    className="block bg-white border border-[#E7E4DD] rounded-xl p-4 no-underline text-inherit hover:border-[#301CA0]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[18px] truncate">{s.title}</div>
                        <div className="text-[14px] text-[#6C6975] mt-1">
                          {s.clientName}
                          {ranOn ? ` · Ran ${ranOn}` : ""}
                        </div>
                      </div>
                      <StatusTag status={s.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </CreateShell>
  );
}

export default function CreateBoardsPage() {
  return (
    <AuthGate>
      <BoardsHome />
    </AuthGate>
  );
}
