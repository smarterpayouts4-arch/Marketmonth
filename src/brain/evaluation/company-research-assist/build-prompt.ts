import type { ContentBrainContext } from "@/brain/content/types";

import type { CompanyResearchPromptContext } from "./types";
import { COMPANY_RESEARCH_IMPORT_VERSION } from "./types";

/** Allowlisted prompt packet from Brand Core context — never raw CSV. */
export function promptContextFromBrain(
  context: ContentBrainContext,
  selectedObjective: string
): CompanyResearchPromptContext {
  return {
    companyName: context.brandName,
    websiteUrl: context.website || `https://${context.domain}`,
    selectedObjective,
    knownCategories: [],
    knownIndexedProducts: context.indexedProducts
      .map((p) => p.name)
      .filter(Boolean)
      .slice(0, 12),
    knownCapabilities: context.products.slice(0, 12),
    knownAudiences: context.audience ? [context.audience] : [],
    knownCustomerProblems: context.marketingOpportunity
      ? [context.marketingOpportunity]
      : [],
    knownComparisonAttributes: context.contentOpportunities
      .filter((o) =>
        /\b(label|price|serving|form|brand|compare|criteria)\b/i.test(o)
      )
      .slice(0, 12),
    knownFaqQuestions: context.contentOpportunities
      .filter((o) => /^(how|what|why|questions)\b/i.test(o))
      .slice(0, 12),
    knownInformationGaps: [],
  };
}

function bulletList(items: string[], empty = "(none listed)"): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean).slice(0, 12);
  if (cleaned.length === 0) return empty;
  return cleaned.map((s) => `- ${s}`).join("\n");
}

/**
 * Personalized market-analysis prompt for the user to paste into
 * ChatGPT / Gemini / similar. No raw CSV. No confidential fields.
 */
export function buildPersonalizedResearchPrompt(
  ctx: CompanyResearchPromptContext
): string {
  const company = ctx.companyName.trim() || "the company";
  const website = ctx.websiteUrl.trim() || "(website unknown)";
  const objective = ctx.selectedObjective.trim() || "(not selected)";

  return `Research ${company} at ${website}.

You are gathering cited market and company findings for MarketMonth's topic engine.
Return ONLY valid JSON matching the schema below. Do not write topic titles, hooks,
content ideas, candidate lists, or marketing copy.

Use the official company website as the primary source for company and catalog facts.
Use credible external sources for industry shopping questions, decision criteria,
comparison attributes, audience problems, and competitor public facts.

KNOWN PUBLIC CONTEXT (hints — verify; do not invent beyond sources):
Company: ${company}
Website: ${website}
Selected marketing objective: ${objective}

Known categories:
${bulletList(ctx.knownCategories)}

Known catalog products (official only if confirmed):
${bulletList(ctx.knownIndexedProducts)}

Known platform capabilities (not catalog products):
${bulletList(ctx.knownCapabilities)}

Known audiences:
${bulletList(ctx.knownAudiences)}

Known customer problems:
${bulletList(ctx.knownCustomerProblems)}

Known comparison attributes:
${bulletList(ctx.knownComparisonAttributes)}

Known FAQ / education questions:
${bulletList(ctx.knownFaqQuestions)}

Known information gaps:
${bulletList(ctx.knownInformationGaps)}

RESEARCH AND RETURN FINDINGS FOR:
1. Company facts from official pages
2. Catalog candidates ONLY with official product-page URLs (else omit)
3. Comparison attributes shoppers use (label, form, price per serving, etc.)
4. Decision criteria / buy checklists
5. Audience problems / shopping frictions (cited — no invented "most shoppers")
6. Industry educational opportunities (short questions shoppers ask)
7. Competitor public facts / alternatives (never invent company SKUs from third parties)

RULES:
- Every finding needs an exact sourceUrl
- Never invent products, ingredients, statistics, certifications, or medical claims
- Never classify a platform capability as a catalog product
- Do not return topic titles or hooks
- Put unresolved items in unknowns[]

OUTPUT JSON SCHEMA (schemaVersion "${COMPANY_RESEARCH_IMPORT_VERSION}"):
{
  "schemaVersion": "${COMPANY_RESEARCH_IMPORT_VERSION}",
  "retrievedAt": "ISO-8601 timestamp",
  "findings": [
    {
      "type": "company_fact|catalog_candidate|comparison_attribute|decision_criterion|audience_problem|industry_opportunity|competitor_fact",
      "label": "short noun phrase or educational question",
      "sourceUrl": "https://…",
      "confidence": "high|medium|low"
    }
  ],
  "unknowns": ["string"]
}

EXAMPLE (illustrative — replace with real researched findings):
{
  "schemaVersion": "${COMPANY_RESEARCH_IMPORT_VERSION}",
  "retrievedAt": "2026-07-27T12:00:00.000Z",
  "findings": [
    {
      "type": "comparison_attribute",
      "label": "price per serving on supplement labels",
      "sourceUrl": "https://example.com/label-guide",
      "confidence": "medium"
    }
  ],
  "unknowns": []
}`;
}
