import React, { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header, PrimaryButton, SecondaryButton } from "../simulation/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const deleteClient = async () => {
    if (!data) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/create/clients/${data.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.status === 409) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setDeleteError(body?.message ?? "Clients with sessions can’t be deleted.");
        setDeleteBusy(false);
        return;
      }
      if (!res.ok) {
        setDeleteError("Could not delete client.");
        setDeleteBusy(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["create-clients"] });
      setLocation("/create");
    } catch {
      setDeleteError("Could not reach the server.");
      setDeleteBusy(false);
    }
  };

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
  const canDelete = data.sessions.length === 0;

  return (
    <Shell
      title={data.name}
      actions={
        <>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setConfirmDelete(true);
              }}
              className="text-[15px] font-semibold text-[#6C6975] bg-transparent border-0 p-0 cursor-pointer hover:text-[#B42318]"
            >
              Delete
            </button>
          )}
          <Link href={`/create/clients/${data.id}/new`}>
            <PrimaryButton type="button">New session</PrimaryButton>
          </Link>
        </>
      }
    >
      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open);
          if (!open) {
            setDeleteError(null);
            setDeleteBusy(false);
          }
        }}
      >
        <DialogContent className="max-w-[440px] gap-0 border-[#E7E4DD] bg-white p-6 shadow-[0_24px_64px_rgba(29,29,36,0.18)] sm:rounded-xl">
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="text-[22px] font-semibold text-[#1D1D24]">
              Delete {data.name}?
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#6C6975]">
              This removes the client from your list. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-[#B42318] mb-3">{deleteError}</p>}
          <div className="flex gap-3">
            <PrimaryButton type="button" onClick={deleteClient} disabled={deleteBusy}>
              {deleteBusy ? "Deleting…" : "Delete client"}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => setConfirmDelete(false)}
              disabled={deleteBusy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </DialogContent>
      </Dialog>

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
