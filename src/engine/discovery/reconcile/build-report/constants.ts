/** Fixed platform capabilities used by refresh script — curated, not catalog SKUs. */
export const CURATED_PLATFORM_CAPABILITIES = [
  "Supplement search",
  "Price comparison",
  "Supplement plan builder",
  "AI supplement advisor",
] as const;

export type AnalyzeProfileSnapshot = {
  businessName?: string;
  website?: string;
  description?: string;
  audience?: string;
  products?: string[];
  services?: string[];
  indexedProducts?: Array<{ name: string; sourceUrl?: string } | string>;
  valueProposition?: string;
  brandVoice?: string;
  marketingOpportunity?: string;
  cached?: boolean;
  pageCount?: number;
  analysisId?: string;
  retrievedAt?: string;
};

export type BuildReconciliationInput = {
  approvedCsvPath: string;
  beforeCsvPath?: string | null;
  analyzeProfilePath?: string | null;
  frozenCorpusDir?: string | null;
  /** Optional in-memory analyze profile (tests). */
  analyzeProfile?: AnalyzeProfileSnapshot | null;
};
