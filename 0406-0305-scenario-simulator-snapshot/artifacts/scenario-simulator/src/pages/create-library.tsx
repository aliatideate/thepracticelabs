import React, { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { PrimaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import {
  CreateShell,
  StatusTag,
  formatExerciseFormat,
  formatFromCategory,
} from "./create-shell";

const LABELS: Record<string, string> = {
  "problem-framing": "Problem framing",
  "decision-making": "Decision-making",
  ideation: "Ideation",
  prototyping: "Prototyping",
};

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

function Library() {
  const [, setLocation] = useLocation();
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
                  : formatFromCategory(item.category);
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
