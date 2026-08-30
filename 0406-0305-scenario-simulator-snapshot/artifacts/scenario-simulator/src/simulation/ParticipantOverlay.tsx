import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSessionNotes,
  useDismissNote,
  useListSessionAccessRequests,
  useRespondAccessRequest,
  getListSessionNotesQueryKey,
  getListSessionAccessRequestsQueryKey,
  type ModeratorNote,
  type AccessRequest,
} from "@workspace/api-client-react";

interface Props {
  sessionId: string;
}

export function ParticipantOverlay({ sessionId }: Props) {
  const queryClient = useQueryClient();

  const { data: notes = [] } = useListSessionNotes(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListSessionNotesQueryKey(sessionId),
      refetchInterval: 15000,
    },
  });

  const { data: requests = [] } = useListSessionAccessRequests(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getListSessionAccessRequestsQueryKey(sessionId),
      refetchInterval: 15000,
    },
  });

  const dismissNote = useDismissNote();
  const respondRequest = useRespondAccessRequest();

  // Subscribe to SSE stream and invalidate per-session queries on relevant events.
  useEffect(() => {
    if (!sessionId) return;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const invalidateNotes = () =>
      queryClient.invalidateQueries({
        queryKey: getListSessionNotesQueryKey(sessionId),
      });
    const invalidateRequests = () =>
      queryClient.invalidateQueries({
        queryKey: getListSessionAccessRequestsQueryKey(sessionId),
      });

    const handle = (
      payloadStr: string,
      kind: "note" | "access",
    ) => {
      try {
        const payload = JSON.parse(payloadStr) as { sessionId?: string };
        if (payload.sessionId !== sessionId) return;
      } catch {
        return;
      }
      if (kind === "note") invalidateNotes();
      else invalidateRequests();
    };

    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource("/api/events");
      } catch {
        scheduleReconnect();
        return;
      }
      es.addEventListener("note.created", (e) =>
        handle((e as MessageEvent).data, "note"),
      );
      es.addEventListener("note.dismissed", (e) =>
        handle((e as MessageEvent).data, "note"),
      );
      es.addEventListener("access.requested", (e) =>
        handle((e as MessageEvent).data, "access"),
      );
      es.addEventListener("access.responded", (e) =>
        handle((e as MessageEvent).data, "access"),
      );
      es.onerror = () => {
        es?.close();
        es = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 3000);
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [sessionId, queryClient]);

  const activeNotes = notes.filter((n) => !n.dismissedAt);
  const pendingRequest = requests.find((r) => r.status === "pending") ?? null;

  // Briefly highlight a note when it first appears (incoming animation)
  const seenNoteIds = useRef<Set<string>>(new Set());
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fresh = activeNotes.filter((n) => !seenNoteIds.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seenNoteIds.current.add(n.id));
    setFlashing((prev) => {
      const next = new Set(prev);
      fresh.forEach((n) => next.add(n.id));
      return next;
    });
    const t = setTimeout(() => {
      setFlashing(new Set());
    }, 1200);
    return () => clearTimeout(t);
  }, [activeNotes]);

  if (activeNotes.length === 0 && !pendingRequest) return null;

  return (
    <div className="fixed top-20 right-4 z-[80] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)] pointer-events-none">
      {pendingRequest && (
        <AccessRequestToast
          request={pendingRequest}
          busy={respondRequest.isPending}
          onAllow={() =>
            respondRequest.mutate(
              { id: pendingRequest.id, data: { status: "granted" } },
              {
                onSettled: () =>
                  queryClient.invalidateQueries({
                    queryKey: getListSessionAccessRequestsQueryKey(sessionId),
                  }),
              },
            )
          }
          onDecline={() =>
            respondRequest.mutate(
              { id: pendingRequest.id, data: { status: "declined" } },
              {
                onSettled: () =>
                  queryClient.invalidateQueries({
                    queryKey: getListSessionAccessRequestsQueryKey(sessionId),
                  }),
              },
            )
          }
        />
      )}
      {activeNotes.map((note) => (
        <NoteToast
          key={note.id}
          note={note}
          flashing={flashing.has(note.id)}
          busy={dismissNote.isPending}
          onDismiss={() =>
            dismissNote.mutate(
              { id: note.id },
              {
                onSettled: () =>
                  queryClient.invalidateQueries({
                    queryKey: getListSessionNotesQueryKey(sessionId),
                  }),
              },
            )
          }
        />
      ))}
    </div>
  );
}

function NoteToast({
  note,
  flashing,
  busy,
  onDismiss,
}: {
  note: ModeratorNote;
  flashing: boolean;
  busy: boolean;
  onDismiss: () => void;
}) {
  const time = new Date(note.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-2xl border bg-[#100f24]/95 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-3.5 transition-all ${
        flashing
          ? "border-yellow-400/60 ring-2 ring-yellow-400/30"
          : "border-yellow-400/25"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold text-yellow-300">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Moderator note
        </span>
        <span className="font-mono text-[10px] text-white/40">{time}</span>
      </div>
      <p className="text-[12.5px] leading-snug text-white/90 mb-2">
        {note.message}
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDismiss}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/75 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function AccessRequestToast({
  request,
  busy,
  onAllow,
  onDecline,
}: {
  request: AccessRequest;
  busy: boolean;
  onAllow: () => void;
  onDecline: () => void;
}) {
  const time = new Date(request.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      role="alertdialog"
      className="pointer-events-auto rounded-2xl border border-violet-400/40 bg-[#100f24]/95 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-3.5 ring-2 ring-violet-400/20"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold text-violet-300">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Access request
        </span>
        <span className="font-mono text-[10px] text-white/40">{time}</span>
      </div>
      <p className="text-[12.5px] leading-snug text-white/90 mb-2.5">
        Your moderator would like to view your team's screen.
      </p>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/75 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onAllow}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-violet-400 to-violet-600 hover:from-violet-300 hover:to-violet-500 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Allow
        </button>
      </div>
    </div>
  );
}
