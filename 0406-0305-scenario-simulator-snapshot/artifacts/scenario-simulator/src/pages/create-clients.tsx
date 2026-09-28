import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton } from "../simulation/components";
import AuthGate from "./auth-gate";
import { CreateShell, formatStatus } from "./create-shell";

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

  const { data, isLoading } = useQuery({
    queryKey: ["create-clients"],
    queryFn: async () => {
      const res = await fetch("/api/create/clients", { credentials: "same-origin" });
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { clients: ClientRow[] };
    },
  });

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
      setLocation(`/create/clients/${row.id}`);
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
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
      {isLoading && <p className="text-[#6C6975]">Loading…</p>}
      {showNew && (
        <form
          onSubmit={createClient}
          className="bg-white border border-[#E7E4DD] rounded-xl p-6 mb-8 max-w-[520px]"
        >
          <h2 className="text-[22px] mt-0 mb-4">New client</h2>
          <label className="block text-[14px] font-semibold mb-2" htmlFor="client-name">
            Name
          </label>
          <input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#E7E4DD] px-4 py-3 text-[18px] mb-4"
            required
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
            <SecondaryButton onClick={() => setShowNew(false)}>Cancel</SecondaryButton>
          </div>
        </form>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(data?.clients ?? []).map((c) => (
          <div
            key={c.id}
            className="bg-white border border-[#E7E4DD] rounded-xl p-5 hover:border-[#301CA0]"
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

            <div className="mt-4 pt-4 border-t border-[#E7E4DD]">
              {c.sessions.length === 0 ? (
                <p className="text-[14px] text-[#6C6975] m-0">No sessions yet</p>
              ) : (
                <ul className="m-0 p-0 list-none space-y-2">
                  {c.sessions.map((s) => (
                    <li key={s.id} className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/create/sessions/${s.id}`}
                        className="text-[15px] text-[#301CA0] no-underline hover:underline min-w-0 truncate"
                      >
                        {s.title}
                      </Link>
                      <span className="text-[14px] text-[#6C6975] shrink-0">
                        {formatStatus(s.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
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
