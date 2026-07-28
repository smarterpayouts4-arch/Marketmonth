import { shortHash } from "@/brain/content/evidence";
import type { ContentBrainContext } from "@/brain/content/types";

import type { IndustryResearchOpportunity } from "./types";
import { INDUSTRY_RESEARCH_SOURCE_TYPE } from "./types";

/**
 * Rebuild typed opportunities from persisted industry_research evidence rows.
 * Does not call Perplexity — used when CSV already contains research.
 */
export function industryOpportunitiesFromEvidence(
  context: ContentBrainContext
): IndustryResearchOpportunity[] {
  const out: IndustryResearchOpportunity[] = [];

  for (const ev of Object.values(context.evidenceById)) {
    const isIndustry =
      ev.evidenceType === INDUSTRY_RESEARCH_SOURCE_TYPE ||
      ev.field === "industryEducationalQuestion" ||
      (ev.notes ?? "").toLowerCase().includes("industry_research");
    if (!isIndustry) continue;
    if (!ev.value.trim()) continue;

    const categoryAnchor =
      extractNoteField(ev.notes, "categoryAnchor") ||
      guessCategoryAnchor(context);
    const audienceNeed =
      extractNoteField(ev.notes, "audienceNeed") ||
      context.audience?.trim() ||
      undefined;
    const retrievedAt =
      extractNoteField(ev.notes, "retrievedAt") ||
      new Date(0).toISOString();

    out.push({
      opportunityId: `iro_${shortHash(ev.id)}`,
      categoryAnchor,
      audienceNeed,
      educationalQuestion: ev.value.trim(),
      evidenceIds: [ev.id],
      sourceUrls: ev.sourceUrl ? [ev.sourceUrl] : [],
      retrievedAt,
      confidence:
        ev.confidence === "high" ||
        ev.confidence === "medium" ||
        ev.confidence === "low"
          ? ev.confidence
          : "medium",
      sourceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
    });
  }

  return out;
}

function extractNoteField(notes: string | undefined, key: string): string {
  if (!notes) return "";
  const re = new RegExp(`${key}=([^;]+)`, "i");
  const m = notes.match(re);
  return m?.[1]?.trim() ?? "";
}

function guessCategoryAnchor(context: ContentBrainContext): string {
  const blob = [
    context.description ?? "",
    ...context.contentOpportunities,
  ]
    .join(" ")
    .toLowerCase();
  if (blob.includes("supplement")) return "supplements";
  if (blob.includes("vitamin")) return "vitamins";
  return context.marketingOpportunity?.trim() || "shopping";
}
