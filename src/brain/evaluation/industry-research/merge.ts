import type { ContentBrainContext } from "@/brain/content/types";

import type { IndustryResearchExpandResult } from "./perplexity-expand";
import type { IndustryResearchOpportunity } from "./types";
import { industryOpportunitiesFromEvidence } from "./from-evidence";

/**
 * Merge industry research into a context copy.
 * Preserves all brand crawl evidence/products/catalog — append only.
 */
export function mergeIndustryResearchIntoContext(
  context: ContentBrainContext,
  expansion: IndustryResearchExpandResult
): ContentBrainContext {
  if (
    expansion.opportunities.length === 0 &&
    Object.keys(expansion.evidenceById).length === 0
  ) {
    return context;
  }

  const existingOpp = new Set(
    context.contentOpportunities.map((o) => o.trim().toLowerCase())
  );
  const appended = expansion.opportunityTexts.filter((t) => {
    const key = t.trim().toLowerCase();
    if (!key || existingOpp.has(key)) return false;
    existingOpp.add(key);
    return true;
  });

  return {
    ...context,
    contentOpportunities: [...context.contentOpportunities, ...appended],
    evidenceById: {
      ...context.evidenceById,
      ...expansion.evidenceById,
    },
    // Never touch products / catalogProducts / brandName
  };
}

/** Opportunities already on context (CSV) plus any live expansion. */
export function collectIndustryOpportunities(
  context: ContentBrainContext,
  live?: IndustryResearchOpportunity[]
): IndustryResearchOpportunity[] {
  const fromCsv = industryOpportunitiesFromEvidence(context);
  const byId = new Map<string, IndustryResearchOpportunity>();
  for (const o of fromCsv) byId.set(o.opportunityId, o);
  for (const o of live ?? []) byId.set(o.opportunityId, o);
  return [...byId.values()];
}
