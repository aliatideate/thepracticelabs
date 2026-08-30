// Shared in-memory + localStorage store for team submissions.
// The Scenario Simulator writes here on confirm; the Facilitator Dashboard reads from here.

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

const STORAGE_KEY = "sim_studio_submissions";

function load(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SubmissionRecord[];
  } catch {
    return [];
  }
}

function save(records: SubmissionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage errors in sandboxed environments
  }
}

export function upsertSubmission(record: SubmissionRecord): void {
  const existing = load();
  const filtered = existing.filter((r) => r.id !== record.id);
  save([...filtered, record]);
}

export function loadSubmissions(): SubmissionRecord[] {
  return load().sort((a, b) => a.submittedTimestamp - b.submittedTimestamp);
}

export function clearSubmissions(): void {
  localStorage.removeItem(STORAGE_KEY);
}
