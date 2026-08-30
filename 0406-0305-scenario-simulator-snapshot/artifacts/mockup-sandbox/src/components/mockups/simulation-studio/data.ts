import gulfLogo from "@assets/Gulf Beverages Co. copy Multi.png";
import rohiniImg from "@assets/Rohini_1777731466737.png";
import fatimaImg from "@assets/Fatima_1777731466737.png";
import jamesImg from "@assets/James_1777731466736.png";
import rakeshImg from "@assets/Rakesh_1777731466737.png";
import scenarioSimulatorLogo from "@assets/Scenario_Simulator_1777731824531.png";

export const assets = {
  gulfLogo,
  scenarioSimulatorLogo,
  rohini: rohiniImg,
  fatima: fatimaImg,
  james: jamesImg,
  rakesh: rakeshImg,
};

export const product = {
  name: "Scenario Simulator",
  subtitle: "Interactive Training Platform",
};

export const session = {
  team: "Team 03",
  workshop: "Solving the Right Problem",
  workshopNumber: 2,
  scenario: "The Demand Spike",
  duration: "45 minutes",
  timeRemaining: "42:06",
};

export const company = {
  name: "Gulf Beverages Co.",
  tagline: "Regional beverage manufacturer",
  description:
    "Gulf Beverages Co. is a fast-growing regional beverage manufacturer serving major retailers and distributors across the Gulf. The company has grown quickly, but its supply chain is under increasing pressure as demand becomes more volatile across markets and product lines.",
  attributes: [
    { label: "Markets", value: "UAE, Saudi Arabia, Qatar" },
    { label: "Product Lines", value: "Bottled juices, flavored water, ready-to-drink teas" },
    { label: "Channels", value: "Modern trade, convenience, hospitality, e-commerce" },
    { label: "Current Priority", value: "Maintain service levels while demand grows across key retail accounts" },
  ],
};

export const scenario = {
  type: "Crisis Management",
  domain: "Supply Chain Operations",
  title: "The Demand Spike",
  alertTitle: "Gulf Beverages Co. — Regional Supply Chain Alert",
  alertBody:
    "Gulf Beverages, a major beverage manufacturer, is experiencing a sudden 40% demand increase across three Gulf markets. Key retail partners are threatening to delist two product lines if availability doesn't improve within six weeks.",
  situation:
    "The situation is tense. Teams across the organization have different explanations, and no one agrees on what the real problem is.",
  perspectives: [
    {
      department: "Sales",
      statement: "says the answer is obvious — just ship more stock.",
      detail: "Pushing to release safety buffer inventory immediately. Sees this as a fulfilment execution problem, not a forecasting one.",
    },
    {
      department: "Planning",
      statement: "says the forecast was fine and blames procurement for slow supplier response.",
      detail: "Points to on-time forecast submissions as evidence. Believes the failure started downstream when procurement didn't act early enough.",
    },
    {
      department: "Procurement",
      statement: "says manufacturing won't flex capacity.",
      detail: "Claims orders were placed within the agreed lead time. The constraint isn't procurement speed — it's unconfirmed production slots.",
    },
    {
      department: "Manufacturing",
      statement: "says the forecast was wrong to begin with.",
      detail: "A 40% demand spike wasn't visible in the numbers provided. Production was planned and scheduled against stable projections.",
    },
    {
      department: "Finance",
      statement: "has concerns but hasn't been consulted.",
      detail: "No one looped them in when emergency replenishment was proposed. Cost exposure and margin impact are still unknown.",
    },
  ],
  objective:
    "You'll work as a team of four participants. Your task is not to solve this yet. It is to figure out what the real problem is.",
};

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  subtitle: string;
  image: string;
  functional: boolean;
  department?: string;
  location?: string;
  persona?: string;
  context?: string;
  responsibilities?: string[];
}

export const stakeholders: Stakeholder[] = [
  {
    id: "rohini",
    name: "Rohini Agarwal",
    role: "Demand Planner",
    subtitle: "Regional demand planning and forecast coordination",
    image: assets.rohini,
    functional: true,
    department: "Supply Chain Planning",
    location: "Dubai regional office",
    persona:
      "Rohini manages regional demand forecasts across UAE, KSA, and Qatar. Her role is to consolidate inputs from sales, trade marketing, market leads, and historical demand data into weekly planning updates.",
    context:
      "She is analytical and detail-oriented, but currently frustrated. From her perspective, the problem is not simply that Gulf Beverages \"needs more stock.\" The demand spike is uneven across markets, product lines, and channels — and some late commercial decisions may have made the issue harder to detect early.",
    responsibilities: [
      "Consolidates weekly demand forecasts",
      "Coordinates with sales, trade marketing, and market teams",
      "Flags forecast risk and demand volatility",
      "Supports SKU-level planning decisions",
    ],
  },
  {
    id: "fatima",
    name: "Fatima Al-Harbi",
    role: "Procurement Lead",
    subtitle: "Supplier relationships and sourcing timelines",
    image: assets.fatima,
    functional: false,
  },
  {
    id: "james",
    name: "James Okoro",
    role: "Factory Manager",
    subtitle: "Production capacity and plant operations",
    image: assets.james,
    functional: false,
  },
  {
    id: "rakesh",
    name: "Rakesh Memon",
    role: "Finance Manager",
    subtitle: "Budget, working capital, and risk controls",
    image: assets.rakesh,
    functional: false,
  },
];

export interface InterviewQuestion {
  id: string;
  prompt: string;
  options: { label: "A" | "B" | "C"; text: string }[];
  happy: "A" | "B" | "C";
  response: string;
  learning: string;
  ctaNext: string;
}

export const questions: InterviewQuestion[] = [
  {
    id: "q1",
    prompt: "You start by asking Rohini what has changed in the demand picture.",
    options: [
      { label: "A", text: "Can you walk us through what changed in the forecast over the last few weeks?" },
      { label: "B", text: "Why didn't planning warn the business earlier?" },
      { label: "C", text: "Is sales exaggerating the demand increase?" },
    ],
    happy: "A",
    response:
      "The headline number is a 40% increase, but that hides a lot. The spike is not evenly spread across the business. It's concentrated in two product lines, mainly in UAE and KSA, and mostly through modern trade retailers. Some SKUs are moving much faster than expected, while others are still close to forecast.",
    learning:
      "The problem may not be a total supply shortage. It may be a more specific issue around certain SKUs, markets, and retail channels.",
    ctaNext: "Ask Next Question",
  },
  {
    id: "q2",
    prompt:
      "Rohini has explained that the demand spike is uneven. You now ask how visible this was before it became urgent.",
    options: [
      { label: "A", text: "Who first noticed the demand increase?" },
      { label: "B", text: "Why didn't the forecast automatically adjust earlier?" },
      { label: "C", text: "When did the demand signal start changing, and how was it communicated?" },
    ],
    happy: "C",
    response:
      "We started seeing unusual movement about three weeks ago, but it wasn't clean enough to trigger a major escalation at first. Some of it looked like normal promotional uplift. Then sales confirmed additional retailer activity quite late, and by the time the forecast was revised, procurement and manufacturing were already working off older assumptions.",
    learning:
      "The issue may involve delayed or fragmented demand signals, not just poor execution by one function.",
    ctaNext: "Ask Next Question",
  },
  {
    id: "q3",
    prompt: "You ask Rohini where the planning process struggled most.",
    options: [
      { label: "A", text: "Where did the planning process break down between sales, procurement, and manufacturing?" },
      { label: "B", text: "Should procurement have anticipated this earlier?" },
      { label: "C", text: "What would you do if you had unlimited budget?" },
    ],
    happy: "A",
    response:
      "The biggest gap was that different teams were reacting to different versions of the truth. Sales was responding to retailer pressure. Procurement was working with supplier lead times based on the previous forecast. Manufacturing was focused on capacity constraints. Planning saw the mismatch, but we didn't have a strong enough forum to align everyone quickly around SKU-level priorities.",
    learning:
      "The problem may be a cross-functional alignment issue around shared priorities, not just demand forecasting accuracy.",
    ctaNext: "Ask Next Question",
  },
  {
    id: "q4",
    prompt: "You ask Rohini what the team should investigate before deciding on a solution.",
    options: [
      { label: "A", text: "Should Gulf Beverages immediately increase production across all affected lines?" },
      { label: "B", text: "What should we understand before deciding whether the solution is more stock, faster production, or different allocation?" },
      { label: "C", text: "Who should be held accountable for the retailer delisting risk?" },
    ],
    happy: "B",
    response:
      "I'd want to know whether the most urgent issue is total volume, product mix, or allocation. If the wrong SKUs are in the wrong markets, producing more overall won't solve the retailer problem. We need to identify which products and accounts are at risk, agree on priorities, and then decide whether to shift inventory, adjust production, or renegotiate timelines with retailers.",
    learning:
      "The real problem may be about prioritizing the right SKUs and accounts under constraint, rather than simply increasing overall supply.",
    ctaNext: "Review Interview Insights",
  },
];

export const interviewInsights = [
  {
    title: "The demand spike is uneven",
    body: "The 40% increase is concentrated in specific product lines, SKUs, markets, and modern trade retailers.",
  },
  {
    title: "Signals changed late and unevenly",
    body: "Early movement looked like normal promotional uplift, but late sales inputs and retailer activity changed the picture quickly.",
  },
  {
    title: "Teams were working from different assumptions",
    body: "Sales, procurement, manufacturing, and planning were each responding to different versions of the situation.",
  },
  {
    title: "The key question may be about prioritization",
    body: "Before producing more stock, the team needs to understand whether the issue is total volume, SKU mix, allocation, or retailer-specific risk.",
  },
];

export const retailerInsights = [
  {
    title: "Complaints are concentrated",
    body: "The strongest complaints are coming from major modern trade retailers in UAE and KSA, not evenly across all markets.",
  },
  {
    title: "Two product lines are at risk",
    body: "Delisting threats are focused on two fast-moving product lines, especially specific SKUs used in current promotions.",
  },
  {
    title: "The issue is not just total stock",
    body: "Retailers are less concerned about Gulf Beverages' overall stock levels and more concerned about inconsistent replenishment of the right SKUs.",
  },
  {
    title: "Allocation may be part of the problem",
    body: "Some lower-risk accounts appear to be receiving stock while higher-risk accounts are escalating complaints.",
  },
];

export const synthesis =
  "The issue may not be a simple shortage. The stronger problem appears to sit at the intersection of uneven SKU-level demand, late retailer signals, allocation decisions, and cross-functional alignment.";

export const problemScaffold =
  "The real problem may not be ______. Based on what we learned, the more important problem appears to be ______ because ______.";

export interface EvidenceSource {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  functional: boolean;
}

export const evidenceSources: EvidenceSource[] = [
  {
    id: "retailer_complaints",
    title: "Retailer Complaints",
    subtitle: "Distributor and modern trade feedback summary",
    description:
      "Understand what retail partners are escalating, which markets are affected, and whether delisting risk is broad or concentrated.",
    tag: "Customer / Channel Signal",
    functional: true,
  },
  {
    id: "sku_availability",
    title: "SKU Availability Snapshot",
    subtitle: "Market-level stock and replenishment view",
    description:
      "Compare availability across markets, accounts, and product lines to see where gaps are most severe.",
    tag: "Operational Data",
    functional: false,
  },
  {
    id: "production_capacity",
    title: "Production Capacity Memo",
    subtitle: "Factory constraints and changeover notes",
    description:
      "Review plant-level constraints, changeover limitations, and what manufacturing says can realistically move in six weeks.",
    tag: "Internal Operations",
    functional: false,
  },
];
