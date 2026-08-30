// Shared in-memory + localStorage store for the Scenario Simulator prototype.
// The participant Simulator writes progress, picks, activity, and submissions here.
// The Moderator Dashboard reads from here in (near) real time and writes notes
// and access requests back for the participant to see.
//
// Cross-tab sync uses the native `storage` event. Same-tab sync uses a custom
// "sim_studio_store_change" event dispatched on every write.

import { useEffect, useState } from "react";

// ─── Storage keys ────────────────────────────────────────────────────────────

const SUB_KEY = "sim_studio_submissions";
const PROGRESS_KEY = "sim_studio_progress";
const ACTIVITY_KEY = "sim_studio_activity";
const NOTES_KEY = "sim_studio_notes";
const ACCESS_KEY = "sim_studio_access_requests";

const STORE_EVENT = "sim_studio_store_change";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubmissionRecord {
  id: string;
  teamName: string;
  submittedAt: string;
  submittedTimestamp: number;
  problemStatement: string;
  confidence: "Low" | "Medium" | "High";
  assumption: string;
  stakeholderId: string;
  evidenceSourceId: string;
}

export type StepState = "complete" | "active" | "notStarted";

export type CurrentStep =
  | "Brief"
  | "Stakeholders"
  | "Interview"
  | "Evidence"
  | "Define Problem"
  | "Submitted";

export interface ProgressRecord {
  teamId: string;
  teamName: string;
  screen: string;
  currentStep: CurrentStep;
  currentStatus: string;
  latestActivity: string;
  progress: {
    brief: StepState;
    stakeholder: StepState;
    interview: StepState;
    evidence: StepState;
    define: StepState;
    submit: StepState;
  };
  stakeholderId: string | null;
  evidenceSourceId: string | null;
  problemStatement: string | null;
  confidence: "Low" | "Medium" | "High" | null;
  assumption: string | null;
  startedAt: number;
  stepStartedAt: number;
  updatedAt: number;
}

export interface ActivityEvent {
  id: string;
  teamId: string;
  teamName: string;
  text: string;
  tone?: "info" | "attention" | "moderator";
  timestamp: number;
}

export interface ModeratorNote {
  id: string;
  recipient: string; // teamId or "all"
  recipientLabel: string;
  message: string;
  timestamp: number;
}

export interface AccessRequest {
  id: string;
  teamId: string;
  timestamp: number;
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === "undefined") return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / sandbox errors
  }
  emitChange();
}

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORE_EVENT));
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Subscribe / hook ────────────────────────────────────────────────────────

export function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener("storage", handler);
  window.addEventListener(STORE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORE_EVENT, handler);
  };
}

export function useStoreSnapshot<T>(getter: () => T): T {
  const [state, setState] = useState<T>(getter);
  useEffect(() => {
    setState(getter());
    return subscribe(() => setState(getter()));
    // The getter is expected to be a stable read of the store; we intentionally
    // do not include it as a dependency to avoid resubscribing each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export function upsertSubmission(record: SubmissionRecord): void {
  const existing = readJson<SubmissionRecord[]>(SUB_KEY, []);
  const filtered = existing.filter((r) => r.id !== record.id);
  writeJson(SUB_KEY, [...filtered, record]);
}

export function loadSubmissions(): SubmissionRecord[] {
  return readJson<SubmissionRecord[]>(SUB_KEY, []).sort(
    (a, b) => a.submittedTimestamp - b.submittedTimestamp,
  );
}

export function clearSubmissions(): void {
  try {
    localStorage.removeItem(SUB_KEY);
  } catch {
    // ignore
  }
  emitChange();
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function upsertProgress(record: ProgressRecord): void {
  const existing = readJson<ProgressRecord[]>(PROGRESS_KEY, []);
  const filtered = existing.filter((r) => r.teamId !== record.teamId);
  writeJson(PROGRESS_KEY, [...filtered, record]);
}

export function loadProgress(): ProgressRecord[] {
  return readJson<ProgressRecord[]>(PROGRESS_KEY, []);
}

export function loadProgressForTeam(teamId: string): ProgressRecord | null {
  return loadProgress().find((p) => p.teamId === teamId) ?? null;
}

// ─── Activity events ─────────────────────────────────────────────────────────

const ACTIVITY_CAP = 100;

export function appendActivity(event: {
  teamId: string;
  teamName: string;
  text: string;
  tone?: ActivityEvent["tone"];
}): void {
  const next: ActivityEvent = {
    id: uid(),
    timestamp: Date.now(),
    ...event,
  };
  const existing = readJson<ActivityEvent[]>(ACTIVITY_KEY, []);
  const trimmed = [next, ...existing].slice(0, ACTIVITY_CAP);
  writeJson(ACTIVITY_KEY, trimmed);
}

export function loadActivity(): ActivityEvent[] {
  return readJson<ActivityEvent[]>(ACTIVITY_KEY, []);
}

// ─── Moderator notes ─────────────────────────────────────────────────────────

export function sendModeratorNote(note: {
  recipient: string;
  recipientLabel: string;
  message: string;
}): ModeratorNote {
  const record: ModeratorNote = {
    id: uid(),
    timestamp: Date.now(),
    ...note,
  };
  const existing = readJson<ModeratorNote[]>(NOTES_KEY, []);
  writeJson(NOTES_KEY, [record, ...existing].slice(0, 50));
  return record;
}

export function loadNotes(): ModeratorNote[] {
  return readJson<ModeratorNote[]>(NOTES_KEY, []);
}

// ─── Access requests ─────────────────────────────────────────────────────────

export function requestAccess(teamId: string): AccessRequest {
  const record: AccessRequest = {
    id: uid(),
    teamId,
    timestamp: Date.now(),
  };
  const existing = readJson<AccessRequest[]>(ACCESS_KEY, []);
  // De-dupe to most recent per team so the moderator UI can show a stable state.
  const filtered = existing.filter((r) => r.teamId !== teamId);
  writeJson(ACCESS_KEY, [record, ...filtered].slice(0, 50));
  return record;
}

export function loadAccessRequests(): AccessRequest[] {
  return readJson<AccessRequest[]>(ACCESS_KEY, []);
}

// ─── Reset everything (used by participant when restarting the simulation) ──

export function resetLiveSession(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(NOTES_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(SUB_KEY);
  } catch {
    // ignore
  }
  emitChange();
}
