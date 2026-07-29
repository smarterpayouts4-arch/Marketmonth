/**
 * Approved public positioning and capability claim ledger.
 *
 * Sole product-facing truth for landing copy, metadata, JSON-LD, and llms.txt.
 * Align every visitor-facing claim with project-knowledge/CURRENT_STATE.md.
 * Do not invent Live features, timing promises, ratings, or auto-publish claims.
 */

import { PRODUCT_IDENTITY } from "./product-identity";

export type CapabilityStatus =
  | "Live"
  | "Partial"
  | "Mocked"
  | "Planned"
  | "Illustrative";

export type ClaimLedgerEntry = {
  id: string;
  claim: string;
  status: CapabilityStatus;
  /** Canonical knowledge or code source that substantiates the claim. */
  evidence: string;
  visitorFacing: boolean;
};

/**
 * Canonical customer-facing process for the current Partial product.
 * Three stages only: Discover (action + reward), Strategize (investment),
 * Build (next useful output). Review/publish is not claimed until Live.
 */
export const PUBLIC_PROCESS = {
  stages: ["Discover", "Strategize", "Build"] as const,
  label: "Discover → Strategize → Build",
  steps: [
    {
      title: "Discover",
      body: "Paste a website. See evidence-grounded offers, audience cues, positioning, and trust signals revealed from your own site.",
    },
    {
      title: "Strategize",
      body: "Choose what to lead with. Pick one focused direction so the next step is clear, not a blank page.",
    },
    {
      title: "Build",
      body: "Turn that direction into strategy-linked content for the channels that are ready today.",
    },
  ],
} as const;

/**
 * Shared public positioning. Landing components and SEO surfaces consume these
 * fields; do not hardcode competing product promises elsewhere.
 */
export const PUBLIC_POSITIONING = {
  audience:
    "Business owners and marketers who already have a website but need a clearer next content direction.",
  problem:
    "Starting each marketing cycle from a blank page produces generic, disconnected ideas.",
  verifiedOutcome:
    "Analyzes a website, surfaces evidence-grounded business context, and helps the user select a focused content direction.",
  differentiator:
    "You stay in control - nothing goes out until you approve it. Strategy starts from your website evidence, not a blank brief.",
  positioningStatement: `For business owners and marketers who need a clearer next content direction, ${PRODUCT_IDENTITY.displayName} turns the context already on their website into evidence-grounded discovery and focused marketing ideas, without starting from a blank brief.`,
  heroHeadline:
    "Your website already contains the beginnings of your marketing strategy.",
  heroSubhead: `${PRODUCT_IDENTITY.displayName} reads the parts that matter: your offers, audience cues, positioning, and trust signals. Then it helps you choose what to lead with next.`,
  painLine:
    "Another month starts the same way - a blank page and no clear direction.",
  primaryCta: "Analyze my website",
  secondaryCta: "See an illustrative example",
  freeAnalysisLine:
    "See your results before you decide anything - no credit card, no signup required to run your analysis.",
  freeAnalysisNote:
    "Some later features (full monthly calendars, multi-channel publishing, analytics) are still being built. Running this analysis does not commit you to anything.",
  discoveryTitle: "See what your website already reveals",
  discoverySubhead:
    "Start with your URL. We’ll surface evidence-grounded context you can use to choose a direction.",
  finalCtaHeadline: "Ready to see what your website already knows?",
  finalCtaSubhead: `Start with ${PUBLIC_PROCESS.label} on your own site. You stay in control before anything goes out.`,
  offerDescription:
    "Free website analysis - no payment required. Pricing for later product stages is not finalized.",
  whyDifferentHeading: "Human control before anything ships",
  whyDifferentEyebrow: "Why it’s different",
  whatYouGetEyebrow: "What you get today",
  whatYouGetHeading: "From website to a focused direction",
  contentUniverseBadge: "Illustrative content system",
  contentUniverseHeadline: "One strategy topic. Multiple content formats.",
  contentUniverseSubhead:
    "A future-state concept of how one approved direction can expand into a connected content family.",
  contentUniverseDisclaimer:
    "Illustrative example - not live distribution or real analytics.",
  monthPlanEyebrow: "Illustrative future-state preview",
  monthPlanHeadline: "One strategy. An illustrative month of content.",
  monthPlanBody:
    "This demo shows how a discovery-informed roadmap can look. It is not a generated customer plan, and it is not ready-to-publish output.",
  capabilityBoundaryHeading: "What is ready today",
  capabilityBoundarySubhead:
    "Directional cues for the current product - not performance guarantees or customer results.",
} as const;

export const PUBLIC_DIFFERENTIATORS = [
  {
    title: "Starts from your website",
    body: "No blank brief. Discovery learns from your site before anything is planned.",
  },
  {
    title: "Evidence before recommendations",
    body: `Observed site signals stay distinct from inferences and ${PRODUCT_IDENTITY.displayName} suggestions.`,
  },
  {
    title: "You approve what ships",
    body: "Human selection stays visible. Nothing publishes until you choose a direction and approve next steps.",
  },
  {
    title: "Strategy before assets",
    body: "Choose what to lead with before expanding into formats - not the other way around.",
  },
] as const;

export const PUBLIC_WHAT_YOU_GET = [
  "Website discovery from your live site",
  "Evidence-grounded business context and topic directions",
  "One human-selected direction before content expands",
  "YouTube Short generation path when you are ready to build",
  "A reviewable step before anything goes out",
] as const;

export const PUBLIC_ILLUSTRATIVE_STATS = [
  {
    label: "Start with one URL",
    value: "One site",
    note: "Illustrative entry point - not a timing promise",
  },
  {
    label: "Choose one direction",
    value: "Human pick",
    note: "Required selection before content expands",
  },
  {
    label: "Channels ready today",
    value: "YouTube Short",
    note: "Other channels remain scaffolds until connected",
  },
] as const;

/** Frozen claim ledger for visitor-facing and SEO claims. */
export const CLAIM_LEDGER: readonly ClaimLedgerEntry[] = [
  {
    id: "website-discovery",
    claim: "Website discovery crawl into brand, SEO, social, and competitor signals",
    status: "Partial",
    evidence: "project-knowledge/CURRENT_STATE.md; FEATURES/discovery-engine.md",
    visitorFacing: true,
  },
  {
    id: "direction-selection",
    claim: "Evidence-grounded topic/direction selection with human choice of one direction",
    status: "Partial",
    evidence: "project-knowledge/CONTENT_BRAIN.md; CURRENT_STATE.md",
    visitorFacing: true,
  },
  {
    id: "youtube-short-build",
    claim: "Build path currently enabled for YouTube Short only",
    status: "Partial",
    evidence: "project-knowledge/CURRENT_STATE.md",
    visitorFacing: true,
  },
  {
    id: "human-review-control",
    claim: "Nothing ships without human approval; no fully automated publishing",
    status: "Live",
    evidence: "approved-capabilities doesNotClaim; CURRENT_STATE.md",
    visitorFacing: true,
  },
  {
    id: "free-analysis-no-payment",
    claim: "Free website analysis with no payment wall / no credit card required today",
    status: "Live",
    evidence: "Landing final CTA; structured-data Offer price 0",
    visitorFacing: true,
  },
  {
    id: "month-plan-theater",
    claim: "Full-month calendar / multi-channel roadmap shown on landing",
    status: "Illustrative",
    evidence: "Landing month-plan demo; CURRENT_STATE Review/Calendar Mocked",
    visitorFacing: true,
  },
  {
    id: "content-universe-visual",
    claim: "Live multi-channel distribution and real-time updates",
    status: "Illustrative",
    evidence: "Landing content-universe visual only; publish Planned",
    visitorFacing: true,
  },
  {
    id: "analytics-publish",
    claim: "Analytics and automatic publishing",
    status: "Planned",
    evidence: "project-knowledge/CURRENT_STATE.md",
    visitorFacing: false,
  },
  {
    id: "under-30-minutes",
    claim: "A month of marketing in under 30 minutes",
    status: "Planned",
    evidence: "No full-loop benchmark; claim prohibited",
    visitorFacing: false,
  },
] as const;

/** Phrases that must not appear in public landing or SEO surfaces. */
export const PROHIBITED_PUBLIC_PHRASES = [
  "free trial",
  "under 30 minutes",
  "ready to publish",
  "live distribution",
  "updates in real time",
  "live content flow",
  "guaranteed ranking",
  "ai-approved",
  "ai certified",
] as const;
