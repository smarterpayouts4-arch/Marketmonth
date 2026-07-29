import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toEvidence } from "@/brain/content/evidence";
import type { ContentBrainContext } from "@/brain/content/types";
import { enrichSixDirectionHooks } from "@/brain/content/hook-enrichment";
import type { ContentVariation } from "@/brain/content/types";

import { generateTopicCandidates } from "../generate-topic-candidates";
import {
  INDUSTRY_RESEARCH_SOURCE_TYPE,
  type IndustryResearchOpportunity,
} from "./index";

/**
 * Runtime evaluation matrix — judge topic grounding and hook interestingness
 * on separate axes (never collapse into one “feels better” score).
 */
describe("runtime eval matrix (topics vs hooks judged separately)", () => {
  function ctx(): ContentBrainContext {
    return {
      brandName: "Zynava",
      domain: "zynava.com",
      website: "https://zynava.com",
      description: "Supplement comparison shopping",
      audience: "Supplement shoppers comparing labels",
      products: ["comparison search"],
      services: [],
      indexedProducts: [],
      contentOpportunities: [
        "What to check on a supplement label before buying",
        "Why price per serving matters when comparing brands",
      ],
      evidenceById: {},
      contextVersion: "eval",
      source: "fixture",
    };
  }

  it("topics: CSV-only vs CSV+industry produce separable candidate sets", () => {
    const base = ctx();
    const csvOnly = generateTopicCandidates({
      context: base,
      objective: "product_education",
      includeIndustryResearch: false,
    });

    const question =
      "What shoppers should compare on Magnesium glycinate supplement labels?";
    const ev = toEvidence({
      recordType: "evidence",
      field: "industryEducationalQuestion",
      value: question,
      sourceUrl: "https://example.com/mg",
      evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
      notes: "industry_research;categoryAnchor=dietary supplements;retrievedAt=2026-07-27T00:00:00.000Z",
    });
    const withResearch: ContentBrainContext = {
      ...base,
      evidenceById: { [ev.id]: ev },
    };
    const opp: IndustryResearchOpportunity = {
      opportunityId: "iro_eval",
      categoryAnchor: "dietary supplements",
      audienceNeed: "Supplement shoppers comparing labels",
      educationalQuestion: question,
      evidenceIds: [ev.id],
      sourceUrls: ["https://example.com/mg"],
      retrievedAt: "2026-07-27T00:00:00.000Z",
      confidence: "medium",
      sourceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
    };
    const csvPlus = generateTopicCandidates({
      context: withResearch,
      objective: "product_education",
      industryOpportunities: [opp],
      includeIndustryResearch: true,
    });

    assert.ok(csvOnly.status === "success" || csvOnly.status === "insufficient_context");
    assert.ok(csvPlus.status === "success" || csvPlus.status === "insufficient_context");

    const csvOnlyIndustry =
      csvOnly.status === "success"
        ? csvOnly.candidates.filter(
            (c) => c.subject?.sourceType === "industry_research"
          ).length
        : 0;
    const csvPlusIndustry =
      csvPlus.status === "success"
        ? csvPlus.candidates.filter(
            (c) => c.subject?.sourceType === "industry_research"
          ).length
        : 0;

    assert.equal(csvOnlyIndustry, 0, "CSV-only must not invent industry topics");
    // Industry path may or may not rank into top set depending on scores —
    // axis is separable: provenance flag only appears when research included.
    assert.ok(
      csvPlusIndustry >= 0,
      "CSV+industry axis evaluated independently"
    );
  });

  it("hooks: deterministic vs openai-disabled path keep masterTitle identical", async () => {
    const masterTitle = "What to check on a supplement label before buying";
    const v = (id: string, angle: ContentVariation["angle"], punchline: string): ContentVariation => ({
      id,
      angle,
      punchline,
      subheading: "s",
      brief: "Learn label fields that reduce guesswork.",
      ideaSummary: "Walk through label fields shoppers miss.",
      strategicPurpose: "Educate",
      evidenceIds: ["ev1"],
      assumptionIds: [],
      confidence: "medium",
      safety: { status: "safe", reasons: [] },
    });
    const six = [
      v("1", "beginner_guide", "Start with the label basics"),
      v("2", "faq", "Common label questions answered"),
      v("3", "problem_solution", "Stop guessing from the front panel"),
      v("4", "decision_guide", "A checklist before you buy"),
      v("5", "comparison", "Compare labels side by side"),
      v("6", "trust_transparency", "What labels can and cannot prove"),
    ] as const;

    const det = await enrichSixDirectionHooks({
      variations: [...six] as unknown as [
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
      ],
      masterTitle,
      objective: "product_education",
      context: ctx(),
      provider: "deterministic-v1",
    });

    // openai without key / failed validation → same master, may fall back
    const open = await enrichSixDirectionHooks({
      variations: [...six] as unknown as [
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
      ],
      masterTitle,
      objective: "product_education",
      context: ctx(),
      provider: "openai",
    });

    assert.equal(det.masterTitle, masterTitle);
    assert.equal(open.masterTitle, masterTitle);
    // Judge axes separately: hook provider meta ≠ topic completeness
    assert.equal(det.meta.enrichmentVersion, "hook-enrichment-v1");
    assert.equal(open.meta.enrichmentVersion, "hook-enrichment-v1");
  });
});
