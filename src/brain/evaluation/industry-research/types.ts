export const INDUSTRY_RESEARCH_SOURCE_TYPE = "industry_research" as const;

export type IndustryResearchConfidence = "high" | "medium" | "low";

/**
 * Typed research expander output — never a TopicCandidate.
 * Feeds subjects/seeds into the sole candidate generator only.
 */
export type IndustryResearchOpportunity = {
  opportunityId: string;
  categoryAnchor: string;
  audienceNeed?: string;
  educationalQuestion: string;
  evidenceIds: string[];
  sourceUrls: string[];
  retrievedAt: string;
  confidence: IndustryResearchConfidence;
  sourceType: typeof INDUSTRY_RESEARCH_SOURCE_TYPE;
};

export type IndustryResearchSubjectSource = "brand_observed" | "industry_research";
