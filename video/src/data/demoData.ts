export const steps = [
  "Brief",
  "Stakeholder",
  "Interview",
  "Evidence",
  "Define",
  "Submit"
] as const;

export type StepLabel = (typeof steps)[number];

export type StakeholderKey = "rohini" | "fatima" | "james" | "rakesh";

export const stakeholders: Record<
  StakeholderKey,
  { name: string; role: string; avatar: string }
> = {
  rohini: {
    name: "Rohini Agarwal",
    role: "Demand Planner",
    avatar: "assets/stakeholders/rohini.png"
  },
  fatima: {
    name: "Fatima Al-Harbi",
    role: "Procurement Lead",
    avatar: "assets/stakeholders/fatima.png"
  },
  james: {
    name: "James Okoro",
    role: "Factory Manager",
    avatar: "assets/stakeholders/james.png"
  },
  rakesh: {
    name: "Rakesh Memon",
    role: "Finance Manager",
    avatar: "assets/stakeholders/rakesh.png"
  }
};

export const evidenceSources = {
  retailer: "Retailer Complaints Summary",
  sku: "SKU Availability Snapshot",
  capacity: "Production Capacity & Changeover Memo"
} as const;

export type EvidenceKey = keyof typeof evidenceSources;

export type Confidence = "Low" | "Medium" | "High";

export type Team = {
  id: string;
  displayName: string;
  emoji: string;
  joinAt: number;
  stakeholderAt: number;
  interviewAt: number;
  evidenceAt: number;
  defineAt: number;
  submitAt: number;
  stakeholder: StakeholderKey;
  evidence: EvidenceKey;
  confidence: Confidence;
  statement: string;
  attentionStart?: number;
  attentionEnd?: number;
};

export const teams: Team[] = [
  {
    id: "gunners",
    displayName: "Gunners",
    emoji: "🎯",
    joinAt: 118,
    stakeholderAt: 252,
    interviewAt: 316,
    evidenceAt: 382,
    defineAt: 608,
    submitAt: 706,
    stakeholder: "rohini",
    evidence: "sku",
    confidence: "Medium",
    statement: "Forecast changes reached supply too late"
  },
  {
    id: "wizards",
    displayName: "The Wizards",
    emoji: "🦅",
    joinAt: 134,
    stakeholderAt: 274,
    interviewAt: 354,
    evidenceAt: 444,
    defineAt: 642,
    submitAt: 736,
    stakeholder: "fatima",
    evidence: "retailer",
    confidence: "High",
    statement: "Retailer feedback was not closed-looped",
    attentionStart: 430,
    attentionEnd: 520
  },
  {
    id: "signal-builders",
    displayName: "Signal Builders",
    emoji: "⚡",
    joinAt: 150,
    stakeholderAt: 296,
    interviewAt: 366,
    evidenceAt: 420,
    defineAt: 632,
    submitAt: 720,
    stakeholder: "james",
    evidence: "capacity",
    confidence: "Medium",
    statement: "Changeovers constrained the recovery plan"
  },
  {
    id: "shelf-truth",
    displayName: "The Planners",
    emoji: "🧭",
    joinAt: 166,
    stakeholderAt: 320,
    interviewAt: 392,
    evidenceAt: 468,
    defineAt: 674,
    submitAt: 754,
    stakeholder: "rakesh",
    evidence: "sku",
    confidence: "Low",
    statement: "Availability gaps hid the real demand"
  },
  {
    id: "forecast-crew",
    displayName: "Forecast Crew",
    emoji: "🚀",
    joinAt: 182,
    stakeholderAt: 340,
    interviewAt: 410,
    evidenceAt: 486,
    defineAt: 696,
    submitAt: 766,
    stakeholder: "rohini",
    evidence: "retailer",
    confidence: "Medium",
    statement: "Promo demand outpaced planning signals"
  }
];

export function getStepIndex(team: Team, frame: number) {
  if (frame >= team.submitAt) return 5;
  if (frame >= team.defineAt) return 4;
  if (frame >= team.evidenceAt) return 3;
  if (frame >= team.interviewAt) return 2;
  if (frame >= team.stakeholderAt) return 1;
  return 0;
}

export function isAttentionActive(team: Team, frame: number) {
  return (
    team.attentionStart !== undefined &&
    team.attentionEnd !== undefined &&
    frame >= team.attentionStart &&
    frame < team.attentionEnd
  );
}

export function getConfidenceRevealAt(team: Team) {
  if (team.confidence === "Low") return 738;
  if (team.confidence === "Medium") return team.id === "gunners" ? 756 : 766;
  return 786;
}
