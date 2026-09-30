import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { Header, PrimaryButton, SecondaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import { CreateSelect } from "./create-select";
import { Breadcrumbs, formatExerciseFormat } from "./create-shell";
import { engineOf } from "../lib/engineContract";

const MAX_LOGO_BYTES = 500 * 1024;
const LOGO_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

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

type SchemaUpgrade = {
  fromVersion: number;
  toVersion: number;
  orphanKeys: string[];
  missingRequired: string[];
};

type CopyPrefill = {
  variableValues: Record<string, unknown>;
  variables: VariableDef[];
  exerciseVersionId: string;
  logoAssetId: string | null;
  copyVersion: number | null;
  latestVersion: number;
  schemaUpgrade: SchemaUpgrade | null;
};

const LONG_NAME_SAMPLES: Record<string, string> = {
  "company.name": "Arabian Peninsula Refreshment Company Ltd.",
  "company.shortName": "Arabian Peninsula Refreshments",
  "company.plantCity": "Ras Al Khaimah Industrial",
  "chain.name": "Horizon Neighbourhood Market",
  "chain.namePlural": "Horizon Neighbourhood Markets",
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

function deriveChainPlural(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `${trimmed}s` : "";
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
  const [logoFilename, setLogoFilename] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showLongNames, setShowLongNames] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localLogoUrl) URL.revokeObjectURL(localLogoUrl);
    };
  }, [localLogoUrl]);

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
  const schemaUpgrade = copyQ.data?.schemaUpgrade ?? null;

  useEffect(() => {
    if (!copyQ.data) return;
    const next: Record<string, string> = {};
    for (const def of copyQ.data.variables) {
      if (def.type !== "text") continue;
      if (def.key === "chain.namePlural") {
        const fromCopy = copyQ.data.variableValues[def.key];
        // Empty = use derived name+s; only keep an explicit override.
        next[def.key] =
          typeof fromCopy === "string" && fromCopy.trim() ? fromCopy : "";
        continue;
      }
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
    setLogoFilename(copyQ.data.logoAssetId ? "Saved logo" : null);
  }, [copyQ.data]);

  const pickExercise = (ex: Exercise) => {
    if (ex.status !== "published") return;
    setExerciseId(ex.id);
    setTitle(`${clientQ.data?.name ?? "Client"} — ${ex.title}`);
    setDurationMinutes(engineOf(ex.format).defaultDurationMinutes);
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

  const chainNameValue = effectiveValues["chain.name"]?.trim() ?? "";
  const pluralOverride = effectiveValues["chain.namePlural"]?.trim() ?? "";
  const resolvedPlural = pluralOverride || deriveChainPlural(chainNameValue);

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
    const mime = file.type || "image/png";
    if (!LOGO_MIME.has(mime)) {
      setError("Logo must be a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > MAX_LOGO_BYTES) {
      setError("Logo must be 500 KB or smaller.");
      return;
    }

    if (localLogoUrl) URL.revokeObjectURL(localLogoUrl);
    const objectUrl = URL.createObjectURL(file);
    setLocalLogoUrl(objectUrl);
    setLogoFilename(file.name);
    setLogoPreviewUrl(objectUrl);
    setLogoUploading(true);

    try {
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
          mimeType: mime,
          base64,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const message =
          res.status === 413
            ? "Logo is too large to upload. Use a file under 500 KB."
            : body.error || "Logo upload failed.";
        setError(message);
        setLogoAssetId(null);
        return;
      }
      const asset = (await res.json()) as { id: string; url: string };
      setLogoAssetId(asset.id);
      setLogoPreviewUrl(asset.url);
    } catch {
      setError("Could not reach the server to upload the logo.");
      setLogoAssetId(null);
    } finally {
      setLogoUploading(false);
    }
  };

  const createSession = async (preview: boolean) => {
    if (!exerciseId) return;
    if (companyNameError) {
      setError(companyNameError);
      return;
    }
    const logoAllowed = variables.some((v) => v.type === "image" && v.key === "company.logo");
    setBusy(true);
    setError(null);
    try {
      const payloadValues: Record<string, string> = { ...variableValues };
      const name = variableValues["chain.name"]?.trim();
      const customPlural = variableValues["chain.namePlural"]?.trim();
      if (name) {
        payloadValues["chain.namePlural"] = customPlural || deriveChainPlural(name);
      } else {
        delete payloadValues["chain.namePlural"];
      }
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
            // Demand only — Mart has no company.logo variable.
            logoAssetId: logoAllowed ? logoAssetId : null,
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

  const textVars = variables.filter(
    (v) => v.type === "text" && v.key !== "chain.namePlural",
  );
  const hasLogoVar = variables.some((v) => v.type === "image" && v.key === "company.logo");
  const hasChain = textVars.some((v) => v.key === "chain.name");
  const hasPluralField = variables.some((v) => v.key === "chain.namePlural");
  const companyPreviewName =
    effectiveValues["company.shortName"] ||
    effectiveValues["company.name"] ||
    "Company";
  const orphanSet = new Set(schemaUpgrade?.orphanKeys ?? []);
  const missingRequiredSet = new Set(schemaUpgrade?.missingRequired ?? []);
  const clientName = clientQ.data?.name ?? "Client";
  const categoryLabel =
    CATEGORIES.find((c) => c.key === category)?.label ?? "Categories";
  const stepTitle =
    step === "category"
      ? "Choose a category"
      : step === "exercise"
        ? "Choose an exercise"
        : "Customise session";
  const crumbItems =
    step === "category"
      ? [
          { label: "Clients", href: "/create" },
          { label: clientName, href: `/create/clients/${clientId}` },
          { label: stepTitle },
        ]
      : step === "exercise"
        ? [
            { label: "Clients", href: "/create" },
            { label: clientName, href: `/create/clients/${clientId}` },
            { label: "Categories", onClick: () => setStep("category") },
            { label: categoryLabel },
          ]
        : [
            { label: "Clients", href: "/create" },
            { label: clientName, href: `/create/clients/${clientId}` },
            { label: "Categories", onClick: () => setStep("category") },
            { label: categoryLabel, onClick: () => setStep("exercise") },
            { label: stepTitle },
          ];

  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[720px] px-6 py-10">
        <div className="mb-2">
          <Breadcrumbs items={crumbItems} />
        </div>
        <h1 className="text-[32px] mt-0 mb-8">{stepTitle}</h1>

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
                  <div className="text-[14px] text-[#6C6975] mt-1">
                    Engine: {formatExerciseFormat(ex.format)}
                  </div>
                </button>
              ))}
            {inCategory.filter((e) => e.status === "published").length === 0 && (
              <p className="text-[#6C6975]">
                {category === "ideation" || category === "prototyping"
                  ? "Coming soon — no exercises in this category yet."
                  : "No exercises in this category yet."}
              </p>
            )}
            <p className="text-[14px] text-[#6C6975] pt-4">
              Need a new exercise? Import JSON from Activities, or capture a brief.
            </p>
          </div>
        )}

        {step === "customise" && selected && (
          <div className="bg-white border border-[#E7E4DD] rounded-xl p-6">
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
            <div className="mb-6">
              <CreateSelect
                value={mode}
                onValueChange={(v) => setMode(v as typeof mode)}
                triggerClassName="text-[18px]"
                options={MODES.map((m) => ({ value: m.key, label: m.label }))}
              />
            </div>

            {variables.length > 0 && (
              <>
                <div className="rounded-xl border border-[#E7E4DD] bg-[#F8F6EF] px-4 py-3 mb-6 text-[14px] text-[#6C6975] leading-relaxed">
                  Renames work for UAE-based beverage or FMCG companies. Markets, currency, dates
                  and scene imagery stay as designed.
                </div>

                {schemaUpgrade && (
                  <div className="rounded-xl border border-[#D4A017] bg-[#FFF8E7] px-4 py-3 mb-6 text-[14px] text-[#5C4A00] leading-relaxed">
                    Saved values are from published v{schemaUpgrade.fromVersion}; latest is v
                    {schemaUpgrade.toVersion}. Prefilling saved values — review flagged fields
                    before create. No silent migration.
                    {schemaUpgrade.orphanKeys.length > 0 && (
                      <div className="mt-2">
                        No longer in schema:{" "}
                        <strong>{schemaUpgrade.orphanKeys.join(", ")}</strong>
                      </div>
                    )}
                    {schemaUpgrade.missingRequired.length > 0 && (
                      <div className="mt-2">
                        New required fields empty:{" "}
                        <strong>{schemaUpgrade.missingRequired.join(", ")}</strong>
                      </div>
                    )}
                  </div>
                )}

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
                    <label className="block text-[14px] font-semibold mb-2">
                      {def.label}
                      {missingRequiredSet.has(def.key) && (
                        <span className="ml-2 text-[#B42318] font-normal">
                          (new — required)
                        </span>
                      )}
                    </label>
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
                      className={`w-full rounded-xl border px-4 py-3 text-[18px] ${
                        missingRequiredSet.has(def.key)
                          ? "border-[#B42318]"
                          : "border-[#E7E4DD]"
                      }`}
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
                    {def.key === "chain.name" && hasChain && hasPluralField && (
                      <div className="mt-3">
                        <label className="block text-[14px] font-semibold mb-2">
                          Plural (if different)
                        </label>
                        <input
                          value={
                            showLongNames
                              ? effectiveValues["chain.namePlural"] ?? ""
                              : variableValues["chain.namePlural"] ?? ""
                          }
                          disabled={showLongNames}
                          maxLength={40}
                          placeholder="Leave blank to use name + s"
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              "chain.namePlural": e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px]"
                        />
                        <p className="text-[14px] text-[#6C6975] mt-2 mb-0">
                          Resolved plural:{" "}
                          <strong className="text-[#1A1A1A]">{resolvedPlural || "—"}</strong>
                          {!pluralOverride && chainNameValue ? " (name + s)" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {orphanSet.size > 0 && (
                  <div className="mb-6 rounded-xl border border-[#B42318]/30 bg-[#FEF3F2] px-4 py-3 text-[14px] text-[#B42318]">
                    Saved keys no longer in this exercise version (ignored on create):{" "}
                    {[...orphanSet].join(", ")}
                  </div>
                )}

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
                        {effectiveValues["branches.alNahda"] || "Al Nahda"} · {resolvedPlural}
                      </p>
                    )}
                  </div>
                )}

                {hasLogoVar && (
                  <div className="mb-6">
                    <label className="block text-[14px] font-semibold mb-2">Company logo</label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadLogo(file);
                      }}
                    />
                    <div className="rounded-xl border border-[#E7E4DD] bg-[#F8F6EF] px-4 py-4 mb-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <SecondaryButton
                          disabled={logoUploading || busy}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <span className="inline-flex items-center gap-2">
                            <ImagePlus className="h-4 w-4" strokeWidth={2.25} />
                            {logoUploading
                              ? "Uploading…"
                              : logoAssetId || logoPreviewUrl
                                ? "Replace logo"
                                : "Upload logo"}
                          </span>
                        </SecondaryButton>
                        <p className="text-[14px] text-[#6C6975] m-0 min-w-0 flex-1">
                          {logoFilename ? (
                            <span className="text-[#1A0F58] font-medium break-all">
                              {logoFilename}
                            </span>
                          ) : (
                            "PNG, JPEG, or WebP · max 500 KB"
                          )}
                        </p>
                      </div>
                    </div>
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
