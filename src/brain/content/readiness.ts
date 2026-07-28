import type { ContentBrainContext } from "./types";

export type ReadinessAssessment = {
  status: "ready" | "partially_ready" | "blocked";
  missingFields: string[];
  warnings: string[];
};

const CORE_FIELDS: Array<{
  key: keyof ContentBrainContext | "productsOrServices";
  label: string;
  required: boolean;
}> = [
  { key: "brandName", label: "brandName", required: true },
  { key: "domain", label: "domain", required: true },
  { key: "website", label: "website", required: true },
  { key: "description", label: "description", required: false },
  { key: "audience", label: "audience", required: false },
  { key: "valueProposition", label: "valueProposition", required: false },
  { key: "marketingOpportunity", label: "marketingOpportunity", required: false },
  { key: "productsOrServices", label: "products|services", required: false },
];

/**
 * Gate: never invent generic wellness filler to hit six variations.
 * blocked → no master/variations; partially_ready → generate with warnings.
 */
export function assessReadiness(context: ContentBrainContext): ReadinessAssessment {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!context.brandName?.trim()) missingFields.push("brandName");
  if (!context.domain?.trim()) missingFields.push("domain");
  if (!context.website?.trim()) missingFields.push("website");

  if (!context.description?.trim()) warnings.push("Missing description");
  if (!context.audience?.trim()) warnings.push("Missing audience");
  if (!context.valueProposition?.trim()) {
    warnings.push("Missing valueProposition");
  }
  if (!context.marketingOpportunity?.trim()) {
    warnings.push("Missing marketingOpportunity");
  }
  if (context.products.length === 0 && context.services.length === 0) {
    warnings.push("Missing products and services");
  }
  if (Object.keys(context.evidenceById).length === 0) {
    warnings.push("No evidence rows available");
  }

  if (missingFields.length > 0) {
    return { status: "blocked", missingFields, warnings };
  }

  const softMissing = CORE_FIELDS.filter((f) => {
    if (f.required) return false;
    if (f.key === "productsOrServices") {
      return context.products.length === 0 && context.services.length === 0;
    }
    const v = context[f.key as keyof ContentBrainContext];
    return typeof v === "string" ? !v.trim() : false;
  });

  if (softMissing.length >= 4 || !context.description?.trim()) {
    return {
      status: "partially_ready",
      missingFields: [],
      warnings,
    };
  }

  if (warnings.length > 0) {
    return { status: "partially_ready", missingFields: [], warnings };
  }

  return { status: "ready", missingFields: [], warnings: [] };
}
