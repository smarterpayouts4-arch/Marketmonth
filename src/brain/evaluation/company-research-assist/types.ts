import { z } from "zod";

export const COMPANY_RESEARCH_IMPORT_VERSION =
  "company-research-import-v1" as const;

export const researchFindingTypeSchema = z.enum([
  "company_fact",
  "catalog_candidate",
  "comparison_attribute",
  "decision_criterion",
  "audience_problem",
  "industry_opportunity",
  "competitor_fact",
]);

export type ResearchFindingType = z.infer<typeof researchFindingTypeSchema>;

export const researchFindingSchema = z.object({
  type: researchFindingTypeSchema,
  label: z.string().trim().min(2).max(200),
  sourceUrl: z.string().url(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const companyResearchImportSchema = z.object({
  schemaVersion: z.literal(COMPANY_RESEARCH_IMPORT_VERSION),
  retrievedAt: z.string().min(4),
  findings: z.array(researchFindingSchema).max(80),
  unknowns: z.array(z.string().trim().min(1).max(300)).max(40).default([]),
});

export type CompanyResearchImportV1 = z.infer<
  typeof companyResearchImportSchema
>;

export type CompanyResearchPromptContext = {
  companyName: string;
  websiteUrl: string;
  selectedObjective: string;
  knownCategories: string[];
  knownIndexedProducts: string[];
  knownCapabilities: string[];
  knownAudiences: string[];
  knownCustomerProblems: string[];
  knownComparisonAttributes: string[];
  knownFaqQuestions: string[];
  knownInformationGaps: string[];
};
