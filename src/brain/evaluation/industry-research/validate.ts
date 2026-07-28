import type { ContentBrainContext } from "@/brain/content/types";

import type { IndustryResearchOpportunity } from "./types";
import { INDUSTRY_RESEARCH_SOURCE_TYPE } from "./types";

const MEDICAL_TREATMENT_RE =
  /\b(treat(?:s|ment|ing)?|cure(?:s|d)?|heal(?:s|ing)?|diagnos(?:e|es|is)|prevent(?:s|ing)?\s+(?:disease|cancer|diabetes))\b/i;

const UNTRUSTED_INSTRUCTION_RE =
  /\b(ignore\s+(?:previous|all)\s+instructions?|system\s+prompt|jailbreak|exfiltrat)\b/i;

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function categoryTokens(context: ContentBrainContext): string[] {
  const blobs = [
    context.description ?? "",
    context.marketingOpportunity ?? "",
    ...context.contentOpportunities,
    ...context.products,
  ]
    .join(" ")
    .toLowerCase();
  const tokens: string[] = [];
  for (const t of [
    "supplement",
    "vitamin",
    "mineral",
    "comparison",
    "retail",
    "shopping",
    "label",
    "brand",
  ]) {
    if (blobs.includes(t)) tokens.push(t);
  }
  return tokens;
}

/**
 * Require grounded category anchor + audience relevance.
 * Reject off-topic / medical / untrusted instruction payloads.
 */
export function validateIndustryOpportunity(
  opportunity: IndustryResearchOpportunity,
  context: ContentBrainContext
): { ok: true } | { ok: false; reason: string } {
  if (opportunity.sourceType !== INDUSTRY_RESEARCH_SOURCE_TYPE) {
    return { ok: false, reason: "sourceType must be industry_research" };
  }
  if (!opportunity.opportunityId?.trim()) {
    return { ok: false, reason: "opportunityId required" };
  }
  if (!opportunity.educationalQuestion?.trim()) {
    return { ok: false, reason: "educationalQuestion required" };
  }
  if (!opportunity.categoryAnchor?.trim()) {
    return { ok: false, reason: "categoryAnchor required" };
  }
  if (!opportunity.retrievedAt?.trim()) {
    return { ok: false, reason: "retrievedAt required" };
  }
  if (!opportunity.sourceUrls?.length) {
    return { ok: false, reason: "sourceUrls required for provenance" };
  }
  if (!opportunity.evidenceIds?.length) {
    return { ok: false, reason: "evidenceIds required" };
  }

  const q = opportunity.educationalQuestion;
  if (MEDICAL_TREATMENT_RE.test(q) || MEDICAL_TREATMENT_RE.test(opportunity.categoryAnchor)) {
    return { ok: false, reason: "medical treatment implication" };
  }
  if (UNTRUSTED_INSTRUCTION_RE.test(q)) {
    return { ok: false, reason: "untrusted web instruction content" };
  }

  const anchors = categoryTokens(context);
  const anchorNorm = normalize(opportunity.categoryAnchor);
  const connected =
    anchors.some((t) => anchorNorm.includes(t)) ||
    anchors.some((t) => normalize(q).includes(t)) ||
    normalize(context.description ?? "").includes(anchorNorm.slice(0, 12));

  if (!connected && anchors.length > 0) {
    return { ok: false, reason: "weak category anchor" };
  }
  if (anchors.length === 0 && !opportunity.audienceNeed?.trim()) {
    return { ok: false, reason: "no category/audience anchor available" };
  }

  // Brand sells / catalog implication — reject
  const brand = context.brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const brandOwns = new RegExp(
    `\\b${brand}(?:'s|’s|\\s+'?s)\\b`,
    "i"
  ).test(q);
  if (
    brandOwns &&
    /\b(product|products|catalog|sku|sells|indexes|recommends)\b/i.test(q)
  ) {
    return { ok: false, reason: "implies brand catalog ownership" };
  }

  return { ok: true };
}

export function filterValidIndustryOpportunities(
  opportunities: IndustryResearchOpportunity[],
  context: ContentBrainContext
): IndustryResearchOpportunity[] {
  return opportunities.filter(
    (o) => validateIndustryOpportunity(o, context).ok
  );
}
