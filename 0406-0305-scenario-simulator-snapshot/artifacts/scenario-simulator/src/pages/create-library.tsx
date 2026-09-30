import React, { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Upload } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import {
  CreateShell,
  StatusTag,
  formatCategoryLabel,
  formatExerciseFormat,
} from "./create-shell";
import { BUILT_ENGINES, type ExerciseEngine } from "../lib/engineContract";
import { CreateSelect } from "./create-select";

const LABELS: Record<string, string> = {
  "problem-framing": "Problem framing",
  "decision-making": "Decision-making",
  ideation: "Ideation",
  prototyping: "Prototyping",
};

const ENGINE_OPTIONS: { value: ExerciseEngine | ""; label: string }[] = [
  { value: "investigation", label: "Investigation" },
  { value: "branching", label: "Branching" },
];

const CATEGORY_OPTIONS = [
  { value: "problem-framing", label: "Problem framing" },
  { value: "decision-making", label: "Decision-making" },
  { value: "ideation", label: "Ideation (coming soon)" },
  { value: "prototyping", label: "Prototyping (coming soon)" },
];

type LibraryExercise = {
  id: string;
  kind: "exercise";
  title: string;
  category: string;
  format: string;
  status: string;
  latestVersion: number | null;
  clientNames: string[];
};

type LibraryBrief = {
  id: string;
  kind: "brief";
  title: string;
  category: string;
  status: string;
  clientName: string | null;
};

type LibraryItem = LibraryExercise | LibraryBrief;

function clientsLine(names: string[]): string {
  return names.length > 0 ? names.join(", ") : "none yet";
}

function ClientsFooter({
  names,
  showArrow,
}: {
  names: string[];
  showArrow?: boolean;
}) {
  return (
    <div className="mt-4 pt-4 border-t border-[#E7E4DD] flex items-center justify-between gap-3 w-full">
      <p className="m-0 text-[14px] text-[#1D1D24] min-w-0">
        Clients: <span className="text-[#6C6975]">{clientsLine(names)}</span>
      </p>
      {showArrow ? (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-[#301CA0]"
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("problem-framing");
  const [engine, setEngine] = useState<ExerciseEngine>("investigation");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [contentText, setContentText] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string | null>(null);
  const [contentName, setContentName] = useState<string | null>(null);
  const contentRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  const engineBuilt = (BUILT_ENGINES as string[]).includes(engine);
  const categoryComingSoon = category === "ideation" || category === "prototyping";

  const submit = async () => {
    setError(null);
    if (!engineBuilt) {
      setError("That engine is not built yet.");
      return;
    }
    if (!contentText) {
      setError("Choose a content JSON file.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    let content: unknown;
    try {
      content = JSON.parse(contentText);
    } catch {
      setError("Content file is not valid JSON.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/create/exercises/import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          engine,
          content,
          facilitatorNotes: notesText,
          variables: [],
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: { path: string; message: string }[];
      };
      if (!res.ok) {
        const detail = (body.errors ?? [])
          .map((e) => `${e.path}: ${e.message}`)
          .join("; ");
        setError(detail || body.error || "Import failed.");
        setBusy(false);
        return;
      }
      setOpen(false);
      setTitle("");
      setContentText(null);
      setNotesText(null);
      setContentName(null);
      onDone();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <SecondaryButton onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-2">
          <Upload className="h-4 w-4" strokeWidth={2.25} />
          Import exercise
        </span>
      </SecondaryButton>
    );
  }

  return (
    <div className="mb-8 bg-white border border-[#E7E4DD] rounded-xl p-5">
      <h2 className="text-[20px] mt-0 mb-1">Import exercise</h2>
      <p className="text-[14px] text-[#6C6975] mt-0 mb-4">
        New content for engines that already exist. Validation runs before anything is saved.
      </p>
      <label className="block text-[14px] font-semibold mb-2">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[16px] mb-4"
      />
      <label className="block text-[14px] font-semibold mb-2">Category</label>
      <div className="mb-4">
        <CreateSelect
          value={category}
          onValueChange={setCategory}
          options={CATEGORY_OPTIONS}
        />
      </div>
      <label className="block text-[14px] font-semibold mb-2">Engine</label>
      <div className="mb-4">
        <CreateSelect
          value={engine}
          onValueChange={(v) => setEngine(v as ExerciseEngine)}
          options={ENGINE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
      </div>
      {categoryComingSoon && (
        <p className="text-[14px] text-[#6C6975] mb-4">
          This category has no published exercises yet — you can still import into it when the
          engine matches.
        </p>
      )}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          type="button"
          className="rounded-full border border-[#E7E4DD] px-4 py-2 text-[14px] font-semibold"
          onClick={() => contentRef.current?.click()}
        >
          {contentName ? `Content: ${contentName}` : "Choose content JSON"}
        </button>
        <button
          type="button"
          className="rounded-full border border-[#E7E4DD] px-4 py-2 text-[14px] font-semibold"
          onClick={() => notesRef.current?.click()}
        >
          {notesText != null ? "Notes attached" : "Optional notes Markdown"}
        </button>
        <input
          ref={contentRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setContentName(f.name);
            setContentText(await f.text());
          }}
        />
        <input
          ref={notesRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setNotesText(await f.text());
          }}
        />
      </div>
      {error && <p className="text-[14px] text-[#B42318] mb-3">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <PrimaryButton type="button" disabled={busy} onClick={submit}>
          {busy ? "Importing…" : "Import"}
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}

function Library() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["create-exercises"],
    queryFn: async () => {
      const res = await fetch("/api/create/exercises", { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{
        categories: string[];
        exercises: LibraryExercise[];
        briefs: LibraryBrief[];
      }>;
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const cat of data?.categories ?? []) map.set(cat, []);
    for (const ex of data?.exercises ?? []) {
      const list = map.get(ex.category) ?? [];
      list.push(ex);
      map.set(ex.category, list);
    }
    for (const brief of data?.briefs ?? []) {
      const list = map.get(brief.category) ?? [];
      list.push(brief);
      map.set(brief.category, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "published" ? -1 : 1;
        }
        return a.title.localeCompare(b.title);
      });
    }
    return map;
  }, [data]);

  return (
    <CreateShell
      activeTab="library"
      actions={
        <PrimaryButton
          type="button"
          icon="plus"
          onClick={() => setLocation("/create/briefs/new")}
        >
          New activity
        </PrimaryButton>
      }
    >
      <ImportPanel
        onDone={() => {
          void queryClient.invalidateQueries({ queryKey: ["create-exercises"] });
        }}
      />
      {isLoading && <p className="text-[#6C6975]">Loading…</p>}
      {[...grouped.entries()].map(([cat, list]) => (
        <section key={cat} className="mb-10">
          <h2 className="text-[20px] mt-0 mb-3 ml-2">{LABELS[cat] ?? cat}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {list.map((item) => {
              const isBrief = item.kind === "brief";
              const isInDesign = item.status === "in_design";
              const meta =
                item.kind === "exercise"
                  ? isInDesign
                    ? formatExerciseFormat(item.format)
                    : `${formatExerciseFormat(item.format)} · v${item.latestVersion ?? 1}`
                  : formatCategoryLabel(item.category);
              const clientNames =
                item.kind === "exercise"
                  ? item.clientNames ?? []
                  : item.clientName
                    ? [item.clientName]
                    : [];

              if (isBrief) {
                return (
                  <Link
                    key={item.id}
                    href={`/create/briefs/${item.id}`}
                    className="block no-underline text-inherit"
                  >
                    <div className="w-full text-left bg-white border border-[#E7E4DD] rounded-xl p-5 hover:border-[#301CA0] opacity-90">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-[18px] leading-snug min-w-0 text-[#6C6975]">
                          {item.title}
                        </div>
                        <StatusTag status={item.status} />
                      </div>
                      <div className="text-[14px] text-[#6C6975] mt-1">{meta}</div>
                      <ClientsFooter names={clientNames} showArrow />
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={item.id}
                  className="w-full text-left bg-white border border-[#E7E4DD] rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="font-semibold text-[18px] leading-snug min-w-0 text-[#1D1D24]">
                      {item.title}
                    </div>
                    <StatusTag status={item.status} />
                  </div>
                  <div className="text-[14px] text-[#6C6975] mt-1">{meta}</div>
                  <ClientsFooter names={clientNames} />
                </div>
              );
            })}
          </div>
          {list.length === 0 && (
            <p className="text-[#6C6975]">
              {cat === "ideation" || cat === "prototyping"
                ? "Coming soon — no exercises in this category yet."
                : "No exercises in this category yet."}
            </p>
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
