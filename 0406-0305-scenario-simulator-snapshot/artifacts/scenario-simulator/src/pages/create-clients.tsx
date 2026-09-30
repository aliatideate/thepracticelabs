import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "../simulation/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import AuthGate from "./auth-gate";
import { CreateShell, StatusTag, formatRanOn } from "./create-shell";

type ClientRow = {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
  lastModifiedAt: string;
  sessions: {
    id: string;
    title: string;
    status: string;
    workshopCode: string;
    createdAt: string;
    endedAt: string | null;
  }[];
};

function formatModifiedAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Modified today";
  if (days === 1) return "Modified 1 day ago";
  return `Modified ${days} days ago`;
}

function ClientsHome() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["create-clients"],
    queryFn: async () => {
      const res = await fetch("/api/create/clients", { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { clients: ClientRow[] };
    },
  });

  const resetForm = () => {
    setName("");
    setNotes("");
    setError(null);
    setBusy(false);
  };

  const openChange = (open: boolean) => {
    setShowNew(open);
    if (!open) resetForm();
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/create/clients", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, notes: notes || null }),
      });
      if (!res.ok) {
        setError("Could not create client.");
        setBusy(false);
        return;
      }
      const row = (await res.json()) as { id: string };
      await queryClient.invalidateQueries({ queryKey: ["create-clients"] });
      setShowNew(false);
      resetForm();
      setLocation(`/create/clients/${row.id}`);
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  };

  const deleteClient = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/create/clients/${deleteTarget.id}`, {
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
      setDeleteTarget(null);
      setDeleteBusy(false);
    } catch {
      setDeleteError("Could not reach the server.");
      setDeleteBusy(false);
    }
  };

  return (
    <CreateShell
      activeTab="clients"
      actions={
        <PrimaryButton type="button" icon="plus" onClick={() => setShowNew(true)}>
          New client
        </PrimaryButton>
      }
    >
      <Dialog open={showNew} onOpenChange={openChange}>
        <DialogContent className="max-w-[520px] gap-0 border-[#E7E4DD] bg-white p-6 shadow-[0_24px_64px_rgba(29,29,36,0.18)] sm:rounded-xl">
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="text-[22px] font-semibold text-[#1D1D24]">
              New client
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#6C6975]">
              Add a name to open their client page. You can start a session from there.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createClient}>
            <label className="block text-[14px] font-semibold mb-2" htmlFor="client-name">
              Name
            </label>
            <input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
              required
              autoFocus
            />
            <label className="block text-[14px] font-semibold mb-2" htmlFor="client-notes">
              Notes (optional)
            </label>
            <textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[16px] mb-4"
            />
            {error && <p className="text-[#B42318] mb-3">{error}</p>}
            <div className="flex gap-3">
              <PrimaryButton type="submit" disabled={busy || !name.trim()}>
                {busy ? "Saving…" : "Create"}
              </PrimaryButton>
              <SecondaryButton onClick={() => openChange(false)} disabled={busy}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
            setDeleteBusy(false);
          }
        }}
      >
        <DialogContent className="max-w-[440px] gap-0 border-[#E7E4DD] bg-white p-6 shadow-[0_24px_64px_rgba(29,29,36,0.18)] sm:rounded-xl">
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="text-[22px] font-semibold text-[#1D1D24]">
              Delete {deleteTarget?.name}?
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
              onClick={() => setDeleteTarget(null)}
              disabled={deleteBusy}
            >
              Cancel
            </SecondaryButton>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading && <p className="text-[#6C6975]">Loading…</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(data?.clients ?? []).map((c) => {
          const canDelete = c.sessions.length === 0;
          return (
            <div
              key={c.id}
              className="group relative bg-white border border-[#E7E4DD] rounded-xl p-5 hover:border-[#301CA0]"
            >
              <div className="flex justify-between gap-4 items-start">
                <div className="min-w-0">
                  <Link
                    href={`/create/clients/${c.id}`}
                    className="text-[22px] font-semibold text-[#1D1D24] no-underline hover:text-[#301CA0]"
                  >
                    {c.name}
                  </Link>
                  {c.notes && <p className="text-[15px] text-[#6C6975] m-0 mt-1">{c.notes}</p>}
                </div>
                <span className="text-[14px] text-[#6C6975] whitespace-nowrap shrink-0">
                  {formatModifiedAgo(c.lastModifiedAt ?? c.createdAt)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E7E4DD] relative min-h-[28px] pr-10">
                {c.sessions.length === 0 ? (
                  <p className="text-[14px] text-[#6C6975] m-0">No sessions yet</p>
                ) : (
                  <ul className="m-0 p-0 list-none space-y-2">
                    {c.sessions.map((s) => {
                      const ranOn =
                        s.status === "ended" ? formatRanOn(s.endedAt) : null;
                      return (
                        <li key={s.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/create/sessions/${s.id}`}
                              className="text-[15px] text-[#301CA0] no-underline hover:underline block truncate"
                            >
                              {s.title}
                            </Link>
                            {ranOn && (
                              <div className="text-[13px] text-[#6C6975] mt-0.5">
                                Ran {ranOn}
                              </div>
                            )}
                          </div>
                          <StatusTag status={s.status} />
                        </li>
                      );
                    })}
                  </ul>
                )}
                {canDelete && (
                  <button
                    type="button"
                    aria-label={`Delete ${c.name}`}
                    title="Delete client"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteError(null);
                      setDeleteTarget(c);
                    }}
                    className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-[#6C6975] opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-[#F1F0EC] hover:text-[#B42318] focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#301CA0] cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!isLoading && (data?.clients.length ?? 0) === 0 && (
        <p className="text-[#6C6975]">No clients yet. Create one to start a session.</p>
      )}
    </CreateShell>
  );
}

export default function CreateClientsPage() {
  return (
    <AuthGate>
      <ClientsHome />
    </AuthGate>
  );
}
