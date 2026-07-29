import type { ContentBrainContext, ContentEvidence } from "@/brain/content/types";

import type { CompanyResearchImportV1 } from "./types";

/**
 * Merge approved research findings into a run-scoped context copy.
 * Does not rewrite CSV. catalog_candidate never becomes indexedProducts in v1.
 * sourceType remains external / user research via evidenceType.
 */
export function mergeResearchImportIntoContext(
  base: ContentBrainContext,
  importData: CompanyResearchImportV1
): ContentBrainContext {
  const evidenceById: Record<string, ContentEvidence> = {
    ...base.evidenceById,
  };
  const contentOpportunities = [...base.contentOpportunities];
  let audience = base.audience;
  const products = [...base.products];

  let i = 0;
  for (const finding of importData.findings) {
    // Never auto-promote catalog candidates into indexedProducts
    if (finding.type === "catalog_candidate") {
      continue;
    }

    const id = `user_research_${i}_${finding.type}`;
    i += 1;
    evidenceById[id] = {
      id,
      recordType: "user_research_import",
      field: finding.type,
      value: finding.label,
      sourceUrl: finding.sourceUrl,
      sourceSnippet: finding.label.slice(0, 160),
      confidence: finding.confidence,
      evidenceType:
        finding.type === "company_fact"
          ? "external_research"
          : finding.type === "competitor_fact" ||
              finding.type === "industry_opportunity"
            ? "industry_research"
            : "external_research",
      notes: `user_research_import:${importData.schemaVersion}`,
    };

    switch (finding.type) {
      case "comparison_attribute":
      case "decision_criterion":
      case "industry_opportunity":
        contentOpportunities.push(finding.label);
        break;
      case "audience_problem":
        if (!audience?.trim()) {
          audience = finding.label;
        } else if (!audience.toLowerCase().includes(finding.label.toLowerCase())) {
          audience = `${audience}; ${finding.label}`;
        }
        contentOpportunities.push(finding.label);
        break;
      case "company_fact":
        contentOpportunities.push(finding.label);
        break;
      case "competitor_fact":
        contentOpportunities.push(finding.label);
        break;
      default:
        break;
    }
  }

  return {
    ...base,
    audience,
    products,
    contentOpportunities: dedupeStrings(contentOpportunities),
    evidenceById,
  };
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}
