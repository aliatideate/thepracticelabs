import React, { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header, PrimaryButton, SecondaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";

const CATEGORIES = [
  { key: "problem-framing", label: "Problem framing" },
  { key: "decision-making", label: "Decision-making" },
  { key: "ideation", label: "Ideation" },
  { key: "prototyping", label: "Prototyping" },
] as const;

const MODES = [
  { key: "in_person", label: "In person" },
  { key: "remote", label: "Remote" },
  { key: "hybrid", label: "Hybrid" },
] as const;

type Exercise = {
  id: string;
  title: string;
  category: string;
  format: string;
  status: string;
};

function NewSessionWizard() {
  const { id: clientId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"category" | "exercise" | "customise">("category");
  const [category, setCategory] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [teamCount, setTeamCount] = useState(4);
  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("in_person");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientQ = useQuery({
    queryKey: ["create-client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/create/clients/${clientId}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ name: string }>;
    },
  });

  const exercisesQ = useQuery({
    queryKey: ["create-exercises"],
    queryFn: async () => {
      const res = await fetch("/api/create/exercises", { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ exercises: Exercise[] }>;
    },
  });

  const inCategory = useMemo(
    () => (exercisesQ.data?.exercises ?? []).filter((e) => e.category === category),
    [exercisesQ.data, category],
  );

  const selected = inCategory.find((e) => e.id === exerciseId);

  const pickExercise = (ex: Exercise) => {
    if (ex.status !== "published") return;
    setExerciseId(ex.id);
    setTitle(`${clientQ.data?.name ?? "Client"} — ${ex.title}`);
    setDurationMinutes(ex.format === "branching" ? 15 : 30);
    setStep("customise");
  };

  const createSession = async (preview: boolean) => {
    if (!exerciseId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        preview ? "/api/create/sessions/preview" : "/api/create/sessions",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientId,
            exerciseId,
            title,
            durationMinutes,
            teamCount,
            mode,
            variableValues: {},
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not create session.");
        setBusy(false);
        return;
      }
      const session = (await res.json()) as { id: string; paths: { join: string } };
      if (preview) {
        window.open(session.paths.join, "_blank", "noopener,noreferrer");
        setBusy(false);
        return;
      }
      setLocation(`/create/sessions/${session.id}`);
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <p className="text-[14px] text-[#6C6975] mb-2">
          <Link href={`/create/clients/${clientId}`} className="text-[#301CA0] underline">
            {clientQ.data?.name ?? "Client"}
          </Link>{" "}
          · New session
        </p>
        <h1 className="text-[32px] mt-0 mb-8">
          {step === "category" && "Choose a category"}
          {step === "exercise" && "Choose an exercise"}
          {step === "customise" && "Customise session"}
        </h1>

        {step === "category" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setCategory(c.key);
                  setStep("exercise");
                }}
                className="rounded-xl border border-[#E7E4DD] bg-white px-5 py-8 text-left text-[20px] font-semibold hover:border-[#301CA0]"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {step === "exercise" && (
          <div className="space-y-3">
            <button
              type="button"
              className="text-[16px] text-[#301CA0] underline mb-2"
              onClick={() => setStep("category")}
            >
              Back to categories
            </button>
            {inCategory
              .filter((e) => e.status === "published")
              .map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => pickExercise(ex)}
                  className="w-full text-left rounded-xl border border-[#E7E4DD] bg-white px-5 py-5 hover:border-[#301CA0]"
                >
                  <div className="text-[20px] font-semibold">{ex.title}</div>
                  <div className="text-[14px] text-[#6C6975] mt-1">{ex.format}</div>
                </button>
              ))}
            {inCategory.filter((e) => e.status === "published").length === 0 && (
              <p className="text-[#6C6975]">No exercises in this category yet.</p>
            )}
            <p className="text-[14px] text-[#6C6975] pt-4">
              New exercise (brief / import) arrives in the next phase.
            </p>
          </div>
        )}

        {step === "customise" && selected && (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6">
            <button
              type="button"
              className="text-[16px] text-[#301CA0] underline mb-4"
              onClick={() => setStep("exercise")}
            >
              Back
            </button>
            <p className="text-[14px] text-[#6C6975] mt-0 mb-4">
              Exercise: <strong>{selected.title}</strong>
            </p>
            <label className="block text-[14px] font-semibold mb-2">Session title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
            />
            <label className="block text-[14px] font-semibold mb-2">Duration (minutes)</label>
            <input
              type="number"
              min={5}
              max={180}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
            />
            <label className="block text-[14px] font-semibold mb-2">Teams (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={teamCount}
              onChange={(e) => setTeamCount(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
            />
            <label className="block text-[14px] font-semibold mb-2">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
            >
              {MODES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-[14px] text-[#6C6975] mb-6">
              Company rename and logo swap unlock after content tokenisation (Phase 4). For now the
              exercise content is used as-is.
            </p>
            {error && <p className="text-[#B42318] mb-4">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <SecondaryButton disabled={busy} onClick={() => createSession(true)}>
                Preview
              </SecondaryButton>
              <PrimaryButton type="button" disabled={busy || !title.trim()} onClick={() => createSession(false)}>
                {busy ? "Creating…" : "Create session"}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateNewSessionPage() {
  return (
    <AuthGate>
      <NewSessionWizard />
    </AuthGate>
  );
}
