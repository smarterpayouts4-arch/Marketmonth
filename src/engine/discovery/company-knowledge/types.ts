import type { BrandProfile } from "../brand-profile";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import type { CrawlCorpus } from "../types";
import type { DiscoveryAcceptanceReport } from "../acceptance-gate";

/** Third-party products the company indexes/compares — not inventory/SKUs. */
export type IndexedProductRelationship =
  | "indexed"
  | "compared"
  | "researched"
  | "referenced";

export type IndexedProduct = {
  name: string;
  sourceUrl: string;
  price?: string;
  relationship: IndexedProductRelationship;
};

/**
 * Canonical company knowledge used for draft → publish → Brand Core.
 * Maps from BrandProfile during vertical cutover; indexedProducts → indexedProducts.
 */
export type CompanyKnowledge = {
  businessName: string;
  website: string;
  description: string;
  audience: string;
  platformCapabilities: string[];
  services: string[];
  indexedProducts: IndexedProduct[];
  valueProposition: string;
  brandVoice: string;
  marketingOpportunity: string;
  colors: string[];
  socialProfiles: BrandProfile["socialProfiles"];
  seoSummary: BrandProfile["seoSummary"];
  competitors: BrandProfile["competitors"];
  faqs: Array<{ question: string; answer: string; sourceUrl?: string }>;
  differentiators: string[];
  problemsSolved: string[];
};

export type CompanyKnowledgeBuild = {
  knowledge: CompanyKnowledge;
  profile: BrandProfile;
  evidence: DiscoveryEvidence[];
  acceptance: DiscoveryAcceptanceReport;
  buildVersion: string;
  knowledgeHash: string;
  corpus: CrawlCorpus;
};

export const COMPANY_KNOWLEDGE_BUILD_VERSION = "company-knowledge-v1";
