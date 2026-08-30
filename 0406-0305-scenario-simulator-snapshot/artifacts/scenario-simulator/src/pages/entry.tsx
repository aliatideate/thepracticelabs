import React, { useEffect, useState } from "react";
import { useLocation, useRoute, useParams } from "wouter";
import {
  useCreateOrResumeSession,
  useGetWorkshop,
  getGetWorkshopQueryKey,
} from "@workspace/api-client-react";
import { product, session as defaultSession } from "../data/data";
import { PageWrapper, Pill, Card, PrimaryButton } from "../simulation/components";

export default function EntryScreen() {
  const [, setLocation] = useLocation();
  const params = useParams<{ code: string }>();
  const [, matchedLegacy] = useRoute("/");
  const code = (params?.code ?? "").toUpperCase();

  const [teamName, setTeamName] = useState("");
  const createSession = useCreateOrResumeSession();
  const workshopQuery = useGetWorkshop(code, {
    query: { enabled: !!code, queryKey: getGetWorkshopQueryKey(code) },
  });

  // Honor `?view=moderator` so external links can deep-link to the dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    if (search.get("view") === "moderator") {
      const target = code ? `/moderator/${code}` : "/";
      setLocation(target, { replace: true });
    }
  }, [setLocation, code]);

  // Bounce back to landing if no code in the path.
  useEffect(() => {
    if (!code && matchedLegacy) {
      setLocation("/", { replace: true });
    }
  }, [code, matchedLegacy, setLocation]);

  const handleNext = () => {
    if (!teamName.trim() || !code) return;
    createSession.mutate(
      { data: { workshopCode: code, teamName: teamName.trim() } },
      {
        onSuccess: (session) => {
          setLocation(`/play/${session.id}/${session.currentScreen || "company"}`);
        },
      },
    );
  };

  const workshopLabel = workshopQuery.data?.label ?? `Workshop ${code}`;
  const workshopMissing = workshopQuery.isError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100f24] via-[#100a23] to-[#110322] text-white relative overflow-x-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[20%] w-[700px] h-[700px] rounded-full bg-purple-700/[0.04] blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-yellow-500/[0.025] blur-[120px]" />
      </div>

      <PageWrapper>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 relative z-10">
          <Pill variant="green">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Live Session Active
            </span>
          </Pill>

          <h1 className="text-white mt-6 mb-3 tracking-tight font-semibold text-[30px]">
            Welcome to the {product.name}
          </h1>
          <p className="text-white/50 text-base">
            You are entering a live team simulation for {workshopLabel}.
          </p>

          {workshopMissing && (
            <div className="mt-4 px-4 py-2 rounded-lg border border-red-400/30 bg-red-400/[0.05] text-red-200 text-[13px]">
              No workshop with code <span className="font-mono">{code}</span>.
              <button
                type="button"
                onClick={() => setLocation("/")}
                className="ml-2 underline-offset-4 hover:underline"
              >
                Pick another →
              </button>
            </div>
          )}

          <Card className="w-full max-w-xl p-6 mt-8 mb-6 text-left">
            <div className="grid grid-cols-2 gap-5 mb-5">
              {[
                { label: "Workshop", value: workshopLabel },
                { label: "Code", value: code || "—" },
                { label: "Scenario", value: defaultSession.scenario },
                { label: "Duration", value: defaultSession.duration },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-white/35 text-[10px] uppercase tracking-[0.14em] mb-1">{label}</div>
                  <div className="text-white font-medium text-sm">{value}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-5">
              <div className="text-white/35 text-[10px] uppercase tracking-[0.14em] mb-2">Your Team Name</div>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Team 03"
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] text-white px-4 py-2 text-sm focus:outline-none focus:border-yellow-400/40 focus:bg-white/[0.03] transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
              />
            </div>
          </Card>

          <Card className="w-full max-w-xl p-5 mb-8 border-yellow-400/15">
            <p className="text-white/60 text-[15px] leading-relaxed">
              <span className="text-yellow-400 font-medium">Work as a team.</span> Discuss each choice before submitting. Your goal is not to solve the situation immediately — it is to identify the problem worth solving.
            </p>
          </Card>

          <PrimaryButton
            onClick={handleNext}
            className="px-7 py-3"
            disabled={!teamName.trim() || !code || workshopMissing || createSession.isPending}
          >
            {createSession.isPending ? "Joining..." : "Enter Simulation"}
          </PrimaryButton>

          <div className="mt-5 flex items-center gap-4 text-[12px]">
            <button
              type="button"
              onClick={() => setLocation("/")}
              className="text-white/45 hover:text-white/80 underline-offset-4 hover:underline transition-colors"
            >
              ← All workshops
            </button>
            {code && (
              <button
                type="button"
                onClick={() => setLocation(`/moderator/${code}`)}
                className="text-white/45 hover:text-white/80 underline-offset-4 hover:underline transition-colors"
              >
                Open Moderator View →
              </button>
            )}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
