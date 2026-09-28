import React, { useEffect, useMemo, useState } from "react";
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

type VariableDef = {
  key: string;
  label: string;
  type: "text" | "image";
  default?: string;
  maxLength?: number;
  required?: boolean;
};

type CopyPrefill = {
  variableValues: Record<string, unknown>;
  variables: VariableDef[];
  exerciseVersionId: string;
  logoAssetId: string | null;
};

const LONG_NAME_SAMPLES: Record<string, string> = {
  "company.name": "Arabian Peninsula Refreshment Company Ltd.",
  "company.shortName": "Arabian Peninsula Refreshments",
  "company.plantCity": "Ras Al Khaimah Industrial",
  "chain.name": "Horizon Neighbourhood Market",
  "branches.alNahda": "Al Nahda North Extension",
  "branches.muwaileh": "Muwaileh Commercial Hub",
  "branches.alMajaz": "Al Majaz Waterfront East",
  "branches.ajmanCorniche": "Ajman Corniche Central Plaza",
  "branches.alRashidiya": "Al Rashidiya Garden District",
  "branches.universityCity": "University City Innovation Park",
};

function startsWithThe(value: string): boolean {
  return /^\s*the\s+/i.test(value);
}

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
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [showLongNames, setShowLongNames] = useState(false);
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

  const copyQ = useQuery({
    queryKey: ["create-copy", clientId, exerciseId],
    enabled: !!clientId && !!exerciseId && step === "customise",
    queryFn: async () => {
      const res = await fetch(`/api/create/clients/${clientId}/copies/${exerciseId}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<CopyPrefill>;
    },
  });

  const inCategory = useMemo(
    () => (exercisesQ.data?.exercises ?? []).filter((e) => e.category === category),
    [exercisesQ.data, category],
  );

  const selected = inCategory.find((e) => e.id === exerciseId);
  const variables = copyQ.data?.variables ?? [];

  useEffect(() => {
    if (!copyQ.data) return;
    const next: Record<string, string> = {};
    for (const def of copyQ.data.variables) {
      if (def.type !== "text") continue;
      const fromCopy = copyQ.data.variableValues[def.key];
      next[def.key] =
        typeof fromCopy === "string" && fromCopy.trim()
          ? fromCopy
          : String(def.default ?? "");
    }
    setVariableValues(next);
    setLogoAssetId(copyQ.data.logoAssetId);
    setLogoPreviewUrl(
      copyQ.data.logoAssetId ? `/api/create/assets/${copyQ.data.logoAssetId}` : null,
    );
  }, [copyQ.data]);

  const pickExercise = (ex: Exercise) => {
    if (ex.status !== "published") return;
    setExerciseId(ex.id);
    setTitle(`${clientQ.data?.name ?? "Client"} — ${ex.title}`);
    setDurationMinutes(ex.format === "branching" ? 15 : 30);
    setStep("customise");
  };

  const effectiveValues = useMemo(() => {
    if (!showLongNames) return variableValues;
    const next = { ...variableValues };
    for (const def of variables) {
      if (def.type === "text" && LONG_NAME_SAMPLES[def.key]) {
        next[def.key] = LONG_NAME_SAMPLES[def.key]!;
      }
    }
    return next;
  }, [showLongNames, variableValues, variables]);

  const chainPlural =
    effectiveValues["chain.name"]?.trim()
      ? `${effectiveValues["chain.name"].trim()}s`
      : "";

  const companyNameError = (() => {
    for (const key of ["company.name", "company.shortName"] as const) {
      const v = variableValues[key];
      if (v && startsWithThe(v)) {
        return `${key === "company.name" ? "Company name" : "Short name"} can’t start with “The ”`;
      }
    }
    return null;
  })();

  const uploadLogo = async (file: File) => {
    setError(null);
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    const base64 = btoa(binary);
    const res = await fetch("/api/create/assets", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || "image/png",
        base64,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Logo upload failed.");
      return;
    }
    const asset = (await res.json()) as { id: string; url: string };
    setLogoAssetId(asset.id);
    setLogoPreviewUrl(asset.url);
  };

  const createSession = async (preview: boolean) => {
    if (!exerciseId) return;
    if (companyNameError) {
      setError(companyNameError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payloadValues: Record<string, string> = { ...variableValues };
      const name = variableValues["chain.name"]?.trim();
      if (name) payloadValues["chain.namePlural"] = `${name}s`;
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
            variableValues: payloadValues,
            logoAssetId,
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

  const textVars = variables.filter((v) => v.type === "text");
  const hasLogoVar = variables.some((v) => v.type === "image" && v.key === "company.logo");
  const hasChain = textVars.some((v) => v.key === "chain.name");
  const companyPreviewName =
    effectiveValues["company.shortName"] ||
    effectiveValues["company.name"] ||
    "Company";

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
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-6"
            >
              {MODES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>

            {variables.length > 0 && (
              <>
                <div className="rounded-xl border border-[#E7E4DD] bg-[#F8F6EF] px-4 py-3 mb-6 text-[14px] text-[#6C6975] leading-relaxed">
                  Renames are <strong className="text-[#1A1A1A]">UAE-only</strong> and{" "}
                  <strong className="text-[#1A1A1A]">beverage / FMCG-only</strong> for now.
                  Scene art (fruit icons, juice cartons) implies a drinks company — a food or snack
                  rename would mismatch the imagery. Markets, long weekend, and the Sharjah &amp;
                  Ajman dateline stay locked.
                </div>

                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-[18px] m-0">Company &amp; place names</h2>
                  <label className="text-[14px] text-[#6C6975]">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={showLongNames}
                      onChange={(e) => setShowLongNames(e.target.checked)}
                    />
                    Preview long names
                  </label>
                </div>

                {textVars.map((def) => (
                  <div key={def.key} className="mb-4">
                    <label className="block text-[14px] font-semibold mb-2">{def.label}</label>
                    <input
                      value={
                        showLongNames
                          ? effectiveValues[def.key] ?? ""
                          : variableValues[def.key] ?? ""
                      }
                      disabled={showLongNames}
                      maxLength={def.maxLength}
                      onChange={(e) =>
                        setVariableValues((prev) => ({ ...prev, [def.key]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px]"
                    />
                    {def.maxLength != null && (
                      <p className="text-[13px] text-[#6C6975] mt-1 mb-0">
                        {(showLongNames
                          ? effectiveValues[def.key] ?? ""
                          : variableValues[def.key] ?? ""
                        ).length}
                        /{def.maxLength}
                      </p>
                    )}
                    {def.key === "chain.name" && hasChain && (
                      <p className="text-[14px] text-[#6C6975] mt-2 mb-0">
                        Plural in headlines:{" "}
                        <strong className="text-[#1A1A1A]">{chainPlural || "—"}</strong>{" "}
                        (derived as name + “s”)
                      </p>
                    )}
                  </div>
                ))}

                {(effectiveValues["company.name"] || effectiveValues["chain.name"]) && (
                  <div className="mb-6 rounded-xl border border-[#E7E4DD] p-4">
                    <div className="text-[13px] uppercase tracking-wide text-[#6C6975] mb-2">
                      Copy preview
                    </div>
                    <p className="text-[16px] m-0 mb-2">
                      You&apos;re a field rep for{" "}
                      <strong>
                        {effectiveValues["company.name"] || companyPreviewName}
                      </strong>
                      .
                    </p>
                    <p className="text-[16px] m-0 mb-2">
                      The <strong>{effectiveValues["company.name"] || companyPreviewName}</strong>{" "}
                      Playbook
                    </p>
                    {effectiveValues["chain.name"] && (
                      <p className="text-[16px] m-0 text-[#6C6975]">
                        {effectiveValues["chain.name"]},{" "}
                        {effectiveValues["branches.alNahda"] || "Al Nahda"} · {chainPlural}
                      </p>
                    )}
                  </div>
                )}

                {hasLogoVar && (
                  <div className="mb-6">
                    <label className="block text-[14px] font-semibold mb-2">Company logo</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file);
                      }}
                      className="mb-3 text-[14px]"
                    />
                    <p className="text-[13px] text-[#6C6975] mt-0 mb-3">
                      Preview on the same dark and light surfaces used in the exercise. Try a wide
                      and a square mark to check odd aspect ratios.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#1A0F58] p-5 flex items-center justify-center min-h-[120px]">
                        {logoPreviewUrl ? (
                          <img
                            src={logoPreviewUrl}
                            alt="Logo on dark"
                            className="max-h-[72px] max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-white/60 text-[14px]">Dark surface</span>
                        )}
                      </div>
                      <div className="rounded-xl bg-white border border-[#E7E4DD] p-5 flex items-center justify-center min-h-[120px]">
                        {logoPreviewUrl ? (
                          <img
                            src={logoPreviewUrl}
                            alt="Logo on light"
                            className="max-h-[72px] max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[#6C6975] text-[14px]">Light surface</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="rounded-xl bg-[#F8F6EF] border border-[#E7E4DD] p-4 flex items-center justify-center h-[88px]">
                        {logoPreviewUrl ? (
                          <img
                            src={logoPreviewUrl}
                            alt="Wide frame"
                            className="h-10 w-full object-contain"
                          />
                        ) : (
                          <span className="text-[13px] text-[#6C6975]">Wide frame</span>
                        )}
                      </div>
                      <div className="rounded-xl bg-[#F8F6EF] border border-[#E7E4DD] p-4 flex items-center justify-center h-[88px] w-full max-w-[88px] mx-auto">
                        {logoPreviewUrl ? (
                          <img
                            src={logoPreviewUrl}
                            alt="Square frame"
                            className="h-14 w-14 object-contain"
                          />
                        ) : (
                          <span className="text-[13px] text-[#6C6975]">Square</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {variables.length === 0 && !copyQ.isLoading && (
              <p className="text-[14px] text-[#6C6975] mb-6">
                This exercise has no renameable fields on the published version yet.
              </p>
            )}

            {(error || companyNameError) && (
              <p className="text-[#B42318] mb-4">{error || companyNameError}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <SecondaryButton
                disabled={busy || !!companyNameError}
                onClick={() => createSession(true)}
              >
                Preview
              </SecondaryButton>
              <PrimaryButton
                type="button"
                disabled={busy || !title.trim() || !!companyNameError}
                onClick={() => createSession(false)}
              >
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
