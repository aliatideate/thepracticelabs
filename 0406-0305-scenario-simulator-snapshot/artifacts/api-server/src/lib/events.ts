import { EventEmitter } from "node:events";

export type SubmissionEventType =
  | "submission.created"
  | "submission.updated"
  | "submission.deleted";

export type ModeratorEventType =
  | "note.created"
  | "note.dismissed"
  | "flag.changed"
  | "access.requested"
  | "access.responded";

export type AppEventType = SubmissionEventType | ModeratorEventType;

export interface AppEvent {
  type: AppEventType;
  sessionId: string;
  at: string;
  // Workshop scoping — present on session-scoped events so SSE consumers can
  // filter without an extra round-trip. Optional for backwards compatibility
  // with note/access events that may not always carry it.
  workshopId?: string;
  workshopCode?: string;
  // Optional payload — only present for some event types.
  noteId?: string;
  requestId?: string;
  status?: "pending" | "granted" | "declined";
  flagged?: boolean;
}

// Backwards-compat alias for callers still importing SubmissionEvent.
export type SubmissionEvent = AppEvent;

class SubmissionsBus extends EventEmitter {
  emitSubmission(event: AppEvent): void {
    this.emit("event", event);
  }
}

export const submissionsBus: SubmissionsBus = new SubmissionsBus();
submissionsBus.setMaxListeners(0);
