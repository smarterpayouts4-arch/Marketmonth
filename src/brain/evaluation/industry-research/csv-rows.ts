import {
  serializeDiscoveryCsv,
  type DiscoveryCsvRow,
} from "@/lib/company-profile/csv-contract";

import type { IndustryResearchOpportunity } from "./types";
import { INDUSTRY_RESEARCH_SOURCE_TYPE } from "./types";

/**
 * Append-only industry research CSV rows.
 * Never invents indexedProducts / brand_profile product fields.
 */
export function buildIndustryResearchCsvRows(
  opportunities: IndustryResearchOpportunity[],
  fallbackSourceUrl: string
): DiscoveryCsvRow[] {
  return opportunities.map((opp) => ({
    record_type: "evidence",
    field: "industryEducationalQuestion",
    value: opp.educationalQuestion,
    source_url: opp.sourceUrls[0] || fallbackSourceUrl,
    evidence_type: INDUSTRY_RESEARCH_SOURCE_TYPE,
    confidence: opp.confidence,
    source_snippet: opp.educationalQuestion.slice(0, 180),
    notes: [
      "industry_research",
      `categoryAnchor=${opp.categoryAnchor}`,
      opp.audienceNeed ? `audienceNeed=${opp.audienceNeed.slice(0, 80)}` : "",
      `retrievedAt=${opp.retrievedAt}`,
      `opportunityId=${opp.opportunityId}`,
    ]
      .filter(Boolean)
      .join(";"),
    retrieved_at: opp.retrievedAt,
  }));
}

/** Merge brand CSV text with industry rows without rewriting brand rows. */
export function appendIndustryRowsToCsv(
  existingCsv: string,
  industryRows: DiscoveryCsvRow[]
): string {
  if (industryRows.length === 0) return existingCsv;
  // serialize includes header — extract body lines only
  const industryCsv = serializeDiscoveryCsv(industryRows);
  const industryBody = industryCsv
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => l.trim())
    .join("\n");
  const base = existingCsv.trimEnd();
  return industryBody ? `${base}\n${industryBody}\n` : `${base}\n`;
}
