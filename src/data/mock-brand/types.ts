export type BrandChecklistItem = {
  id: string;
  label: string;
  ready: boolean;
};

export type BrandProfile = {
  companyName: string;
  website: string;
  description: string;
  industry: string;
  products: string[];
  audience: string[];
  valueProposition: string;
  voiceTraits: string[];
  voiceSpectra: {
    casualProfessional: number;
    warmAuthoritative: number;
  };
  faqs: { question: string; answer: string }[];
  colors: { hex: string; name: string }[];
  personality: string[];
  confidence: number;
  readiness: number;
  checklist: BrandChecklistItem[];
  reviewedAreas: number;
  totalAreas: number;
  status: "not_started" | "in_progress" | "ready" | "approved";
};

/** Dashboard workflow phases — Learn is not part of the dashboard. */
export type DashboardPhase =
  | "marketing-topic"
  | "content"
  | "review"
  | "results";

/** @deprecated Use DashboardPhase — alias kept for gradual import updates */
export type HomePhaseId = DashboardPhase;

export type HomePhaseStatus = "not_started" | "active" | "complete";
