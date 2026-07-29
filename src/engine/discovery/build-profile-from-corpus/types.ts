import type { CrawlMeta, DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

import type { BrandProfile, SocialProfile } from "../brand-profile";
import type {
  IndexedProduct,
  FaqEntry,
  OrganizationFacts,
} from "../types";

export const DISCOVERY_PROFILE_BUILD_VERSION = "discovery-profile-build-v1";

export type ObservedCompanyKnowledge = {
  businessName: string;
  website: string;
  indexedProducts: IndexedProduct[];
  faqs: FaqEntry[];
  contactEmails: string[];
  contactPhones: string[];
  organization: OrganizationFacts | null;
  /** Present social profiles only. */
  socialProfiles: SocialProfile[];
  logoUrl?: string;
};

export type DerivedCompanyKnowledge = {
  description: string;
  audience: string;
  /** LLM/rules descriptive wording — not catalog SKUs or curated platform caps. */
  products: string[];
  services: string[];
  valueProposition: string;
  brandVoice: string;
  marketingOpportunity: string;
  competitors: BrandProfile["competitors"];
  seoSummary: BrandProfile["seoSummary"];
};

export type CuratedCapability = {
  name: string;
  knowledgeClass: "curated_fixture";
};

export type PageSnapshotMetadata = {
  url: string;
  kind: string;
  title?: string;
};

export type DiscoveryDiagnostics = {
  notes: string[];
  modelName: string | null;
  extractorVersion: string;
};

export type DiscoveryProfileBuild = {
  profile: BrandProfile;
  observed: ObservedCompanyKnowledge;
  derived: DerivedCompanyKnowledge;
  curatedCapabilities: CuratedCapability[];
  evidence: DiscoveryEvidence[];
  pages: PageSnapshotMetadata[];
  diagnostics: DiscoveryDiagnostics;
  crawlMeta: CrawlMeta;
};

export type BuildDiscoveryProfileInput = {
  corpus: import("../types").CrawlCorpus;
  website: string;
  /** When set, profile.products becomes these curated platform capabilities. */
  curatedCapabilities?: string[];
  /** Skip LLM; use rules/fallback for derived fields. */
  derivedSource?: "rules" | "llm";
  seo?: BrandProfile["seoSummary"];
  social?: SocialProfile[];
  competitorHints?: import("../types").CompetitorHints;
};
