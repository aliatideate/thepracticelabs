import { assets } from "./data";

export type StatusType = "onTrack" | "slow" | "attention" | "complete" | "notStarted";
export type StepState = "complete" | "active" | "notStarted";

export interface Team {
  id: string;
  name: string;
  currentStatus: string;
  currentStep: "Brief" | "Stakeholders" | "Interview" | "Evidence" | "Define Problem" | "Submitted";
  stakeholder: { name: string; role: string; image?: string } | null;
  evidence: string | null;
  latestActivity: string;
  timeOnStep: string;
  statusType: StatusType;
  statusLabel: string;
  attention: string | null;
  confidence?: "Low" | "Medium" | "High";
  progress: {
    brief: StepState;
    stakeholder: StepState;
    interview: StepState;
    evidence: StepState;
    define: StepState;
    submit: StepState;
  };
  capturedLearnings: string[];
  problemStatement: string | null;
  debriefFlag?: string;
  assumptionToTest?: string;
}

export const moderator = {
  workshop: "Workshop 2: Solving the Right Problem",
  scenario: "The Demand Spike",
  phase: "Investigation + Problem Framing",
  timer: "42:06",
};

export const teams: Team[] = [
  {
    id: "team-01",
    name: "Team 01",
    currentStatus: "Interviewing stakeholder",
    currentStep: "Interview",
    stakeholder: { name: "Rohini Agarwal", role: "Regional Demand Planner", image: assets.rohini },
    evidence: null,
    latestActivity: "Asking Question 3 of 4",
    timeOnStep: "07:12",
    statusType: "onTrack",
    statusLabel: "On track",
    attention: null,
    progress: {
      brief: "complete",
      stakeholder: "complete",
      interview: "active",
      evidence: "notStarted",
      define: "notStarted",
      submit: "notStarted",
    },
    capturedLearnings: [
      "Demand spike appears uneven across SKUs and markets.",
      "Retail pressure is concentrated in UAE and KSA.",
      "Forecast changes may have been visible but not escalated clearly.",
    ],
    problemStatement: null,
  },
  {
    id: "team-02",
    name: "Team 02",
    currentStatus: "Choosing evidence",
    currentStep: "Evidence",
    stakeholder: { name: "Fatima Al-Harbi", role: "Procurement Lead", image: assets.fatima },
    evidence: null,
    latestActivity: "Completed stakeholder interview",
    timeOnStep: "03:48",
    statusType: "slow",
    statusLabel: "Slightly slow",
    attention: "Evidence not selected yet",
    progress: {
      brief: "complete",
      stakeholder: "complete",
      interview: "complete",
      evidence: "active",
      define: "notStarted",
      submit: "notStarted",
    },
    capturedLearnings: [
      "Supplier lead times may not support sudden SKU shifts.",
      "Procurement is working from older forecast assumptions.",
      "Some supplier flexibility exists but may increase cost.",
    ],
    problemStatement: null,
  },
  {
    id: "team-03",
    name: "Team 03",
    currentStatus: "Writing problem statement",
    currentStep: "Define Problem",
    stakeholder: { name: "Rohini Agarwal", role: "Regional Demand Planner", image: assets.rohini },
    evidence: "Retailer Complaints",
    latestActivity: "Selected Medium confidence",
    timeOnStep: "05:36",
    statusType: "onTrack",
    statusLabel: "On track",
    attention: null,
    confidence: "Medium",
    progress: {
      brief: "complete",
      stakeholder: "complete",
      interview: "complete",
      evidence: "complete",
      define: "active",
      submit: "notStarted",
    },
    capturedLearnings: [
      "Demand spike is concentrated in specific SKUs and channels.",
      "Retailers are concerned about inconsistent replenishment.",
      "Teams may need faster alignment on SKU/account priorities.",
      "Overall stock is not the only issue.",
    ],
    problemStatement:
      "The real problem may not be total supply. Based on what we learned, the more important problem appears to be cross-functional SKU prioritization because teams are reacting to different signals under retailer pressure.",
  },
  {
    id: "team-04",
    name: "Team 04",
    currentStatus: "Reviewing evidence",
    currentStep: "Evidence",
    stakeholder: { name: "James Okoro", role: "Factory Manager", image: assets.james },
    evidence: "Production Capacity Memo",
    latestActivity: "Reviewing plant constraints",
    timeOnStep: "09:44",
    statusType: "attention",
    statusLabel: "Needs attention",
    attention: "Slow on evidence review",
    progress: {
      brief: "complete",
      stakeholder: "complete",
      interview: "complete",
      evidence: "active",
      define: "notStarted",
      submit: "notStarted",
    },
    capturedLearnings: [
      "Manufacturing can flex some output, but changeovers create delays.",
      "Plant capacity is constrained by SKU mix, not just total volume.",
      "The team may be over-focusing on factory constraints.",
    ],
    problemStatement: null,
    debriefFlag: "Useful contrast: this team may frame the issue primarily as production capacity.",
  },
  {
    id: "team-05",
    name: "Team 05",
    currentStatus: "Submitted",
    currentStep: "Submitted",
    stakeholder: { name: "Rakesh Memon", role: "Finance Manager", image: assets.rakesh },
    evidence: "SKU Availability Snapshot",
    latestActivity: "Submitted problem statement",
    timeOnStep: "Done",
    statusType: "complete",
    statusLabel: "Complete",
    attention: null,
    confidence: "High",
    progress: {
      brief: "complete",
      stakeholder: "complete",
      interview: "complete",
      evidence: "complete",
      define: "complete",
      submit: "complete",
    },
    capturedLearnings: [
      "Working capital constraints limit blanket stock increases.",
      "Availability gaps vary by SKU and account.",
      "Finance is concerned about overcorrecting with expensive inventory moves.",
      "The team connected risk, allocation, and prioritization.",
    ],
    problemStatement:
      "The real problem may not be a lack of total inventory. Based on what we learned, the more important problem appears to be deciding which SKUs and accounts to prioritize under financial and service-level constraints.",
    assumptionToTest: "That the delisting threat is immediate rather than a negotiating tactic.",
  },
];

export const initialActivity: { time: string; text: string; tone?: "info" | "attention" | "moderator" }[] = [
  { time: "42:06", text: "Exercise started", tone: "info" },
  { time: "39:20", text: "Team 01 selected Rohini Agarwal" },
  { time: "37:45", text: "Team 02 selected Fatima Al-Harbi" },
  { time: "36:10", text: "Team 04 selected James Okoro" },
  { time: "34:52", text: "Team 05 selected Rakesh Memon" },
  { time: "31:18", text: "Team 03 selected Retailer Complaints" },
  { time: "29:06", text: "Team 05 selected SKU Availability Snapshot" },
  { time: "26:41", text: "Team 05 submitted problem statement" },
  { time: "24:55", text: "Team 04 has spent 9+ minutes on evidence review", tone: "attention" },
  { time: "24:20", text: "Moderator note sent to all teams", tone: "moderator" },
];

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

export const debriefSignals = {
  investigation: {
    stakeholders: [
      { name: "Rohini Agarwal", count: 2 },
      { name: "Fatima Al-Harbi", count: 1 },
      { name: "James Okoro", count: 1 },
      { name: "Rakesh Memon", count: 1 },
    ],
    evidence: [
      { name: "Retailer Complaints", count: 2 },
      { name: "SKU Availability Snapshot", count: 1 },
      { name: "Production Capacity Memo", count: 1 },
      { name: "Not selected yet", count: 1, muted: true },
    ],
  },
  themes: [
    "Most teams are moving beyond ‘ship more stock’ toward a more specific problem frame.",
    "Several teams are connecting demand volatility to SKU-level prioritization.",
    "One team is still treating the issue primarily as a factory capacity problem.",
    "Finance-led framing is surfacing working capital and risk trade-offs.",
  ],
  watchouts: [
    "Ask teams why they chose their stakeholder first.",
    "Compare teams that selected people-first evidence vs. operational data.",
    "Invite disagreement on whether the core issue is forecasting, allocation, or alignment.",
    "Use Team 04 as a prompt if they remain focused only on manufacturing capacity.",
  ],
};

export const supportTeams: { teamId: string; name: string; status: string }[] = [
  { teamId: "team-04", name: "Team 04", status: "Slow on evidence review" },
  { teamId: "team-02", name: "Team 02", status: "Evidence not selected yet" },
];

export const FLOW_STEPS = [
  { key: "brief", label: "Brief" },
  { key: "stakeholder", label: "Stakeholder" },
  { key: "interview", label: "Interview" },
  { key: "evidence", label: "Evidence" },
  { key: "define", label: "Define" },
  { key: "submit", label: "Submit" },
] as const;
