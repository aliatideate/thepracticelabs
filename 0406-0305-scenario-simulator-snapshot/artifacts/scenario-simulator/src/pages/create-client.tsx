import React from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header, PrimaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import { Breadcrumbs, StatusTag, formatRanOn } from "./create-shell";

function Shell({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F6EF]">
      <Header brandOnly hideFlowNav />
      <div className="mx-auto max-w-[960px] px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="mb-1">
              <Breadcrumbs
                items={[{ label: "Clients", href: "/create" }, { label: title }]}
              />
            </div>
            <h1 className="text-[32px] mt-0 mb-0">{title}</h1>
          </div>
          <div className="flex flex-wrap gap-3 items-center">{actions}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["create-client", id],
    queryFn: async () => {
      const res = await fetch(`/api/create/clients/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{
        id: string;
        name: string;
        notes: string | null;
        sessions: {
          id: string;
          title: string;
          status: string;
          workshopCode: string;
          durationMinutes: number;
          teamCount: number;
          mode: string;
          createdAt: string;
          endedAt: string | null;
        }[];
      }>;
    },
  });

  if (isLoading) {
    return (
      <Shell title="Client">
        <p className="text-[#6C6975]">Loading…</p>
      </Shell>
    );
  }
  if (isError || !data) {
    return (
      <Shell title="Client">
        <p className="text-[#B42318]">Client not found.</p>
      </Shell>
    );
  }

  const upcoming = data.sessions.filter((s) => s.status === "ready" || s.status === "live");
  const past = data.sessions.filter((s) => s.status === "ended");

  return (
    <Shell
      title={data.name}
      actions={
        <Link href={`/create/clients/${data.id}/new`}>
          <PrimaryButton type="button">New session</PrimaryButton>
        </Link>
      }
    >
      {data.notes && <p className="text-[16px] text-[#6C6975] mb-8">{data.notes}</p>}

      <h2 className="text-[20px] mt-0 mb-3 ml-2">Upcoming & live</h2>
      <div className="space-y-3 mb-10">
        {upcoming.map((s) => (
          <Link
            key={s.id}
            href={`/create/sessions/${s.id}`}
            className="block bg-white border border-[#E7E4DD] rounded-xl p-4 no-underline text-inherit hover:border-[#301CA0]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-[18px] min-w-0 truncate">{s.title}</div>
              <StatusTag status={s.status} />
            </div>
            <div className="text-[14px] text-[#6C6975] mt-1">
              code {s.workshopCode} · {s.teamCount} teams · {s.durationMinutes} min
            </div>
          </Link>
        ))}
        {upcoming.length === 0 && (
          <p className="text-[#6C6975]">No upcoming sessions. Start one with New session.</p>
        )}
      </div>

      <h2 className="text-[20px] mt-0 mb-3 ml-2">Past</h2>
      <div className="space-y-3">
        {past.map((s) => {
          const ranOn = formatRanOn(s.endedAt);
          return (
            <Link
              key={s.id}
              href={`/create/sessions/${s.id}`}
              className="block bg-white border border-[#E7E4DD] rounded-xl p-4 no-underline text-inherit hover:border-[#301CA0]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-[18px] min-w-0 truncate">{s.title}</div>
                <StatusTag status={s.status} />
              </div>
              <div className="text-[14px] text-[#6C6975] mt-1">
                code {s.workshopCode}
                {ranOn ? ` · Ran ${ranOn}` : ""}
              </div>
            </Link>
          );
        })}
        {past.length === 0 && <p className="text-[#6C6975]">No past sessions yet.</p>}
      </div>
    </Shell>
  );
}

export default function CreateClientPage() {
  return (
    <AuthGate>
      <ClientDetail />
    </AuthGate>
  );
}
