import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  useListWorkshops,
  useCreateWorkshop,
  getListWorkshopsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { product } from "../data/data";
import { PageWrapper, Pill, Card, PrimaryButton } from "../simulation/components";

export default function LandingScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: workshops = [], isLoading } = useListWorkshops();
  const createWorkshop = useCreateWorkshop();

  const [label, setLabel] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });

  const handleCreate = () => {
    setError(null);
    const trimmed = label.trim();
    if (!trimmed) return;
    createWorkshop.mutate(
      { data: { label: trimmed } },
      {
        onSuccess: (ws) => {
          invalidate();
          setLabel("");
          setLocation(`/w/${ws.code}`);
        },
        onError: () => setError("Couldn't create workshop. Try again."),
      },
    );
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLocation(`/w/${code}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100f24] via-[#100a23] to-[#110322] text-white relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[20%] w-[700px] h-[700px] rounded-full bg-purple-700/[0.04] blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/[0.025] blur-[120px]" />
      </div>

      <PageWrapper>
        <div className="flex-1 flex flex-col items-center justify-start text-center py-12 relative z-10">
          <Pill variant="green">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Multi-workshop ready
            </span>
          </Pill>

          <h1 className="text-white mt-6 mb-3 tracking-tight font-semibold text-[30px]">
            {product.name}
          </h1>
          <p className="text-white/50 text-base max-w-xl">
            Pick a workshop to join, or spin up a fresh one for your group.
          </p>

          <Card className="w-full max-w-xl p-6 mt-8 mb-6 text-left">
            <div className="text-white/35 text-[10px] uppercase tracking-[0.14em] mb-2">
              Join an existing workshop
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Workshop code"
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] text-white px-4 py-2 text-sm focus:outline-none focus:border-yellow-400/40 focus:bg-white/[0.03] transition-all uppercase tracking-wider"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <PrimaryButton onClick={handleJoin} disabled={!joinCode.trim()} className="px-5 py-2">
                Join
              </PrimaryButton>
            </div>
          </Card>

          <Card className="w-full max-w-xl p-6 mb-6 text-left">
            <div className="text-white/35 text-[10px] uppercase tracking-[0.14em] mb-2">
              Create a new workshop
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Spring Cohort 2026"
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] text-white px-4 py-2 text-sm focus:outline-none focus:border-yellow-400/40 focus:bg-white/[0.03] transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <PrimaryButton
                onClick={handleCreate}
                disabled={!label.trim() || createWorkshop.isPending}
                className="px-5 py-2"
              >
                {createWorkshop.isPending ? "Creating…" : "Create"}
              </PrimaryButton>
            </div>
            {error && <p className="text-red-300 text-[12px] mt-2">{error}</p>}
          </Card>

          <Card className="w-full max-w-xl p-6 text-left">
            <div className="text-white/35 text-[10px] uppercase tracking-[0.14em] mb-3">
              All workshops
            </div>
            {isLoading ? (
              <div className="text-white/40 text-sm">Loading…</div>
            ) : workshops.length === 0 ? (
              <div className="text-white/40 text-sm">No workshops yet. Create one above.</div>
            ) : (
              <ul className="space-y-2">
                {workshops.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{w.label}</div>
                      <div className="text-white/40 text-[11px] font-mono tracking-wider mt-0.5">
                        {w.code}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setLocation(`/w/${w.code}`)}
                        className="rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] px-3 py-1 text-[11px] text-white/70"
                      >
                        Join →
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocation(`/moderator/${w.code}`)}
                        className="rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] px-3 py-1 text-[11px] text-white/70"
                      >
                        Moderate
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocation(`/results/${w.code}`)}
                        className="rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] px-3 py-1 text-[11px] text-white/70"
                      >
                        Results
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </PageWrapper>
    </div>
  );
}
