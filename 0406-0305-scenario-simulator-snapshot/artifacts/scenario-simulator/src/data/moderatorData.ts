// Static moderator dashboard tokens. Team progress and submissions
// come from the API (live production data), not from this file.

export type StatusType = "onTrack" | "slow" | "attention" | "complete" | "notStarted";
export type StepState = "complete" | "active" | "notStarted";

export interface TeamProgress {
  brief: StepState;
  stakeholder: StepState;
  interview: StepState;
  evidence: StepState;
  define: StepState;
  submit: StepState;
}

export interface Team {
  id: string;
  name: string;
  currentStatus: string;
  currentStep:
    | "Brief"
    | "Stakeholders"
    | "Interview"
    | "Evidence"
    | "Define Problem"
    | "Submitted";
  stakeholder: { name: string; role: string; image?: string } | null;
  evidence: string | null;
  latestActivity: string;
  timeOnStep: string;
  statusType: StatusType;
  statusLabel: string;
  attention: string | null;
  confidence?: "Low" | "Medium" | "High";
  progress: TeamProgress;
  problemStatement: string | null;
  assumptionToTest?: string;
  capturedLearnings: string[];
  flaggedForDebrief: boolean;
}

export const moderator = {
  workshop: "Workshop 2: Solving the Right Problem",
  scenario: "The Demand Spike",
  phase: "Investigation + Problem Framing",
};

export const noteTemplates: { id: string; label: string; message: string }[] = [
  {
    id: "time",
    label: "Time nudge",
    message: "You have 10 minutes left. Start moving toward your problem statement.",
  },
  {
    id: "framing",
    label: "Problem framing reminder",
    message: "Don't solve yet. Focus on defining the problem worth solving.",
  },
  {
    id: "evidence",
    label: "Evidence reminder",
    message: "Use both your interview and evidence source before writing your statement.",
  },
  {
    id: "team",
    label: "Team discussion prompt",
    message: "Make sure everyone contributes before submitting.",
  },
  {
    id: "disagreement",
    label: "Disagreement prompt",
    message:
      "If your team disagrees, capture the disagreement — it may be useful in the debrief.",
  },
];

export const debriefThemes = [
  "Most teams are moving beyond ‘ship more stock’ toward a more specific problem frame.",
  "Several teams are connecting demand volatility to SKU-level prioritization.",
  "Some teams may be treating the issue primarily as a factory capacity problem.",
  "Finance-led framing surfaces working capital and risk trade-offs.",
];

export const debriefWatchouts = [
  "Ask teams why they chose their stakeholder first.",
  "Compare teams that selected people-first evidence vs. operational data.",
  "Invite disagreement on whether the core issue is forecasting, allocation, or alignment.",
  "Use teams that focused only on manufacturing capacity as a contrast prompt.",
];

export const FLOW_STEPS = [
  { key: "brief", label: "Brief" },
  { key: "stakeholder", label: "Stakeholder" },
  { key: "interview", label: "Interview" },
  { key: "evidence", label: "Evidence" },
  { key: "define", label: "Define" },
  { key: "submit", label: "Submit" },
] as const;
