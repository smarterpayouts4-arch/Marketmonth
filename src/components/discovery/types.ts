export type DiscoveryStatus =
  | "empty"
  | "loading"
  | "result"
  | "generating_strategy"
  | "strategy"
  | "error";

export type StageView = {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
};

export type BrandProfileView = {
  businessName: string;
  website: string;
  description: string;
  audience: string;
  products: string[];
  services: string[];
  valueProposition: string;
  brandVoice: string;
  marketingOpportunity: string;
  colors: string[];
  socialProfiles: {
    platform: string;
    status: "present" | "missing";
    url?: string;
  }[];
  seoSummary: {
    metadataCompleteness: "strong" | "partial" | "weak";
    pageSpeedNote: string;
    technicalObservations: string[];
    contentOpportunities: string[];
  };
  competitors: { name: string; reason: string; website?: string }[];
};

export type StrategyPreviewView = {
  strategyThesis: {
    headline: string;
    explanation: string;
    rationale: string;
    evidenceIds: string[];
    confidence: "high" | "medium" | "low";
  };
  leadOffer: {
    name: string;
    reason: string;
    evidenceIds: string[];
  };
  audienceMessage: {
    message: string;
    evidenceIds: string[];
  };
  contentPillars: Array<{
    name: string;
    purpose: string;
    exampleTopics: string[];
    evidenceIds: string[];
  }>;
  channelRoles: Array<{
    channel: string;
    role: string;
    status: "detected" | "recommended_test";
    rationale: string;
    evidenceIds: string[];
  }>;
  firstCampaign: {
    hook: string;
    premise: string;
    formats: Array<{ format: string; angle: string }>;
    evidenceIds: string[];
  };
  conversionPath: {
    audienceAction: string;
    destination: string;
    primaryCta: string;
    rationale: string;
    evidenceIds: string[];
  };
  postingRhythm: string;
  keyOpportunity: string;
  assumptions: string[];
};

export type DiscoveryIds = {
  analysisId: string;
  brandProfileId: string;
  strategyPreviewId?: string;
};

/** Full copy for overflow dialogs — not length-clamped for display. */
export type DiscoveryCardFullCopy = {
  business: string;
  valueProposition: string;
  brandPosition: string;
  audience: string;
  audienceNeed: string;
  audienceHook: string;
  coreOffering: string;
  offerFit: string;
  offerItems: string[];
  growthOpportunity: string;
  growthAngle: string;
  contentAngles: string[];
  activeChannels: string[];
  missedChannels: string[];
  missedArticlePlatforms: string[];
  suggestedCompetitors: string[];
};

export type DiscoveryTabOverflow = {
  businessOverview: boolean;
  targetAudience: boolean;
  coreOffering: boolean;
  growthOpportunity: boolean;
  meta: boolean;
};

export type DiscoveryCardSummary = {
  businessName: string;
  website: string;
  business: string;
  valueProposition: string;
  audience: string;
  audienceNeed: string;
  audienceHook: string;
  /** Presentation only — mapped from products/services. */
  coreOffering: string;
  offerItems: string[];
  products: string[];
  services: string[];
  offerFit: string;
  brandPosition: string;
  /** Presentation only — mapped from Brand Profile marketingOpportunity. */
  growthOpportunity: string;
  growthAngle: string;
  contentAngles: string[];
  activeChannels: string[];
  /** Social platforms detected as missing — presentation only. */
  missedChannels: string[];
  /** Article / long-form publish platforms not detected — presentation only. */
  missedArticlePlatforms: string[];
  suggestedCompetitors: string[];
  /** Unclamped / uncapped copy for Read more surfaces. */
  full: DiscoveryCardFullCopy;
  /** Deterministic overflow flags — true only when preview hides content. */
  overflow: DiscoveryTabOverflow;
};

export type StrategyIntentAnswers = {
  goal: "awareness" | "leads" | "sales" | "loyalty";
  promoteFirst: string;
  reach: "local" | "national" | "online_broad";
  /** Confirmed when reach is local — never invented. */
  targetLocation?: string;
  /** Activation Hook investments (optional; mapped from DiscoveryInvestments). */
  growthDirection?: string;
  growthThesis?: string;
  buyerTension?: string;
  brandCoreEdit?: string;
  /** Additive: Market Month cadence recommendation chosen by the owner. */
  cadenceLevel?: "light" | "consistent" | "active" | "daily";
  /** Additive: selected publishing channels. */
  channels?: string[];
};

export type StrategyMoveView = {
  number: 1 | 2 | 3;
  headline: string;
  body: string;
  headlineFull: string;
  bodyFull: string;
  overflow: boolean;
};

export type DetectedLocationView = {
  formattedAddress?: string;
  city?: string;
  region?: string;
  country?: string;
  sourceUrl: string;
  confidence: "high" | "medium" | "low";
};
