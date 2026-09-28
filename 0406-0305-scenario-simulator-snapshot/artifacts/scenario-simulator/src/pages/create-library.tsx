import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AuthGate from "./auth-gate";
import { CreateShell } from "./create-shell";

const LABELS: Record<string, string> = {
  "problem-framing": "Problem framing",
  "decision-making": "Decision-making",
  ideation: "Ideation",
  prototyping: "Prototyping",
};

function Library() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["create-exercises"],
    queryFn: async () => {
      const res = await fetch("/api/create/exercises", { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{
        categories: string[];
        exercises: {
          id: string;
          title: string;
          category: string;
          format: string;
          status: string;
          latestVersion: number;
        }[];
      }>;
    },
  });

  const detailQ = useQuery({
    queryKey: ["create-exercise", openId],
    enabled: !!openId,
    queryFn: async () => {
      const res = await fetch(`/api/create/exercises/${openId}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{
        title: string;
        versions: {
          id: string;
          version: number;
          variables: unknown;
          facilitatorNotes: string | null;
          createdAt: string;
        }[];
        clientCopies: { clientName: string }[];
      }>;
    },
  });

  const grouped = useMemo(() => {
    type Ex = NonNullable<typeof data>["exercises"][number];
    const map = new Map<string, Ex[]>();
    for (const cat of data?.categories ?? []) map.set(cat, []);
    for (const ex of data?.exercises ?? []) {
      const list = map.get(ex.category) ?? [];
      list.push(ex);
      map.set(ex.category, list);
    }
    return map;
  }, [data]);

  return (
    <CreateShell activeTab="library">
      {isLoading && <p className="text-[#6C6975]">Loading…</p>}
      {[...grouped.entries()].map(([cat, list]) => (
        <section key={cat} className="mb-10">
          <h2 className="text-[20px] mt-0 mb-3">{LABELS[cat] ?? cat}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {list.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setOpenId(openId === ex.id ? null : ex.id)}
                className="w-full text-left bg-white border border-[#E7E4DD] rounded-xl p-5 hover:border-[#301CA0]"
              >
                <div className="font-semibold text-[18px]">{ex.title}</div>
                <div className="text-[14px] text-[#6C6975] mt-1">
                  {ex.format} · {ex.status} · v{ex.latestVersion ?? "—"}
                </div>
                {openId === ex.id && detailQ.data && (
                  <div className="mt-4 pt-4 border-t border-[#E7E4DD] text-[14px] text-[#1D1D24]">
                    <p className="m-0 mb-2">
                      Clients with copies:{" "}
                      {detailQ.data.clientCopies.map((c) => c.clientName).join(", ") || "none"}
                    </p>
                    {detailQ.data.versions.map((v) => (
                      <div key={v.id} className="mb-3">
                        <div className="font-semibold">Version {v.version}</div>
                        <div className="text-[#6C6975]">
                          Variables: {JSON.stringify(v.variables)}
                        </div>
                        {v.facilitatorNotes && (
                          <pre className="whitespace-pre-wrap text-[13px] mt-2 bg-[#F8F6EF] p-3 rounded-lg">
                            {v.facilitatorNotes}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
          {list.length === 0 && (
            <p className="text-[#6C6975]">No exercises in this category yet.</p>
          )}
        </section>
      ))}
    </CreateShell>
  );
}

export default function CreateLibraryPage() {
  return (
    <AuthGate>
      <Library />
    </AuthGate>
  );
}
