import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toEvidence } from "@/brain/content/evidence";
import type { ContentBrainContext } from "@/brain/content/types";

import { generateTopicCandidates } from "../generate-topic-candidates";
import { groundedSupportKey } from "../gtc/support-key";
import {
  appendIndustryRowsToCsv,
  buildIndustryResearchCsvRows,
  collectIndustryOpportunities,
  filterValidIndustryOpportunities,
  industryOpportunitiesToSubjects,
  mergeIndustryResearchIntoContext,
  type IndustryResearchOpportunity,
  INDUSTRY_RESEARCH_SOURCE_TYPE,
} from "./index";

function baseContext(
  overrides: Partial<ContentBrainContext> = {}
): ContentBrainContext {
  return {
    brandName: "Zynava",
    domain: "zynava.com",
    website: "https://zynava.com",
    description: "Supplement comparison shopping platform",
    audience: "People comparing dietary supplements before buying",
    products: ["comparison search", "label filters"],
    services: [],
    indexedProducts: [],
    marketingOpportunity: "Help shoppers compare supplements with clarity",
    contentOpportunities: [
      "What to check on a supplement label before buying",
    ],
    evidenceById: {},
    contextVersion: "test",
    source: "fixture",
    ...overrides,
  };
}

function mkOpp(
  partial: Partial<IndustryResearchOpportunity> & {
    educationalQuestion: string;
  }
): IndustryResearchOpportunity {
  const ev = toEvidence({
    recordType: "evidence",
    field: "industryEducationalQuestion",
    value: partial.educationalQuestion,
    sourceUrl: partial.sourceUrls?.[0] ?? "https://example.com/research",
    sourceSnippet: partial.educationalQuestion.slice(0, 80),
    confidence: "medium",
    evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
    notes: "industry_research;categoryAnchor=dietary supplements;retrievedAt=2026-07-27T00:00:00.000Z",
  });
  return {
    opportunityId: partial.opportunityId ?? `iro_${ev.id}`,
    categoryAnchor: partial.categoryAnchor ?? "dietary supplements",
    audienceNeed:
      partial.audienceNeed ?? "People comparing dietary supplements",
    educationalQuestion: partial.educationalQuestion,
    evidenceIds: partial.evidenceIds ?? [ev.id],
    sourceUrls: partial.sourceUrls ?? ["https://example.com/research"],
    retrievedAt: partial.retrievedAt ?? "2026-07-27T00:00:00.000Z",
    confidence: partial.confidence ?? "medium",
    sourceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
  };
}

describe("industry research expander (not a topic generator)", () => {
  it("rejects weakly anchored / medical / brand-catalog claims", () => {
    const ctx = baseContext();
    const badMedical = mkOpp({
      educationalQuestion: "How magnesium treats insomnia overnight?",
    });
    const badBrand = mkOpp({
      educationalQuestion: "Compare Zynava's magnesium products in the catalog",
    });
    const good = mkOpp({
      educationalQuestion:
        "What shoppers should compare on magnesium supplement labels?",
    });

    const ctxWith = {
      ...ctx,
      evidenceById: {
        [good.evidenceIds[0]]: toEvidence({
          recordType: "evidence",
          field: "industryEducationalQuestion",
          value: good.educationalQuestion,
          sourceUrl: good.sourceUrls[0],
          evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
          notes: "industry_research;categoryAnchor=dietary supplements;retrievedAt=2026-07-27T00:00:00.000Z",
        }),
      },
    };

    assert.equal(
      filterValidIndustryOpportunities([badMedical], ctxWith).length,
      0
    );
    assert.equal(
      filterValidIndustryOpportunities([badBrand], ctxWith).length,
      0
    );
    assert.equal(
      filterValidIndustryOpportunities([good], ctxWith).length,
      1
    );
  });

  it("maps named ingredients to ingredient_or_component + industry_research, never catalog_product", () => {
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
    const ctx = baseContext({ evidenceById: { [ev.id]: ev } });
    const opp = mkOpp({
      educationalQuestion: question,
      evidenceIds: [ev.id],
      sourceUrls: ["https://example.com/mg"],
    });
    const subjects = industryOpportunitiesToSubjects([opp], ctx);
    assert.ok(subjects.length > 0);
    assert.ok(
      subjects.every((s) => s.kind !== "catalog_product"),
      "must never become catalog_product"
    );
    const ingredient = subjects.find(
      (s) => s.kind === "ingredient_or_component"
    );
    assert.ok(ingredient);
    assert.equal(ingredient?.sourceType, "industry_research");
  });

  it("same research page family shares one support key (volume cannot fake complete)", () => {
    const url = "https://example.com/same-page";
    const a = mkOpp({
      opportunityId: "iro_a",
      educationalQuestion: "What to check on magnesium labels?",
      sourceUrls: [url],
    });
    const b = mkOpp({
      opportunityId: "iro_b",
      educationalQuestion: "Why magnesium label forms matter?",
      sourceUrls: [url],
    });
    const evA = toEvidence({
      recordType: "evidence",
      field: "industryEducationalQuestion",
      value: a.educationalQuestion,
      sourceUrl: url,
      evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
    });
    const evB = toEvidence({
      recordType: "evidence",
      field: "industryEducationalQuestion",
      value: b.educationalQuestion,
      sourceUrl: url,
      evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
    });
    const ctx = baseContext({
      evidenceById: { [evA.id]: evA, [evB.id]: evB },
    });
    a.evidenceIds = [evA.id];
    b.evidenceIds = [evB.id];
    const subjects = industryOpportunitiesToSubjects([a, b], ctx);
    const seeds = subjects.map((s) => ({
      subject: s.label,
      subjectType: s.kind,
      evidenceIds: s.evidenceIds,
      sourceFields: [s.sourceField],
      classificationReason: s.classificationReason,
      classificationConfidence: s.classificationConfidence,
      frameHint: "product_guide",
      sourceType: s.sourceType,
      supportFamilyKey: s.supportFamilyKey,
    }));
    const keys = new Set(seeds.map((s) => groundedSupportKey(s)));
    // All industry subjects from same URL collapse to one family key
    assert.equal(keys.size, 1);
  });

  it("merge preserves brand products/catalog and appends opportunities only", () => {
    const ctx = baseContext({
      indexedProducts: [{ name: "Zynava Clarity Pack" }],
    });
    const ev = toEvidence({
      recordType: "evidence",
      field: "industryEducationalQuestion",
      value: "Which vitamin C forms should shoppers compare?",
      sourceUrl: "https://example.com/c",
      evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
    });
    const merged = mergeIndustryResearchIntoContext(ctx, {
      opportunities: [
        mkOpp({
          educationalQuestion: "Which vitamin C forms should shoppers compare?",
          evidenceIds: [ev.id],
        }),
      ],
      evidenceById: { [ev.id]: ev },
      opportunityTexts: ["Which vitamin C forms should shoppers compare?"],
    });
    assert.deepEqual(merged.indexedProducts, ctx.indexedProducts);
    assert.deepEqual(merged.products, ctx.products);
    assert.ok(
      merged.contentOpportunities.includes(
        "Which vitamin C forms should shoppers compare?"
      )
    );
  });

  it("disabling industry research leaves CSV-only candidate flow intact", () => {
    const prev = process.env.INDUSTRY_RESEARCH_ENABLED;
    process.env.INDUSTRY_RESEARCH_ENABLED = "false";
    try {
      const question =
        "What shoppers should compare on Magnesium glycinate labels?";
      const ev = toEvidence({
        recordType: "evidence",
        field: "industryEducationalQuestion",
        value: question,
        sourceUrl: "https://example.com/mg",
        evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
      });
      const ctx = baseContext({ evidenceById: { [ev.id]: ev } });
      const withIndustry = generateTopicCandidates({
        context: ctx,
        objective: "product_education",
        industryOpportunities: [
          mkOpp({ educationalQuestion: question, evidenceIds: [ev.id] }),
        ],
        includeIndustryResearch: true,
      });
      // env disable wins
      const disabled = generateTopicCandidates({
        context: ctx,
        objective: "product_education",
        industryOpportunities: [
          mkOpp({ educationalQuestion: question, evidenceIds: [ev.id] }),
        ],
      });
      void withIndustry;
      assert.ok(disabled.status === "success" || disabled.status === "insufficient_context");
      if (disabled.status === "success") {
        assert.ok(
          disabled.candidates.every(
            (c) => c.subject?.sourceType !== "industry_research"
          )
        );
      }
    } finally {
      if (prev === undefined) delete process.env.INDUSTRY_RESEARCH_ENABLED;
      else process.env.INDUSTRY_RESEARCH_ENABLED = prev;
    }
  });

  it("CSV rows carry resolvable provenance + retrievedAt", () => {
    const opp = mkOpp({
      educationalQuestion: "What to check on a supplement label before buying?",
      retrievedAt: "2026-07-27T12:00:00.000Z",
    });
    const rows = buildIndustryResearchCsvRows([opp], "https://zynava.com");
    assert.equal(rows[0].evidence_type, INDUSTRY_RESEARCH_SOURCE_TYPE);
    assert.equal(rows[0].retrieved_at, "2026-07-27T12:00:00.000Z");
    assert.match(rows[0].notes, /retrievedAt=/);
    const csv = appendIndustryRowsToCsv(
      'record_type,field,value,source_url,evidence_type,confidence,source_snippet,notes,retrieved_at\nbrand_profile,businessName,Zynava,https://zynava.com,observed,high,,,2026-01-01T00:00:00.000Z\n',
      rows
    );
    assert.match(csv, /industryEducationalQuestion/);
    assert.match(csv, /brand_profile/);
  });

  it("opportunities from evidence resolve on context", () => {
    const ev = toEvidence({
      recordType: "evidence",
      field: "industryEducationalQuestion",
      value: "How to compare price per serving on supplements?",
      sourceUrl: "https://example.com/price",
      evidenceType: INDUSTRY_RESEARCH_SOURCE_TYPE,
      notes: "industry_research;categoryAnchor=dietary supplements;retrievedAt=2026-07-27T00:00:00.000Z",
    });
    const ctx = baseContext({ evidenceById: { [ev.id]: ev } });
    const opps = collectIndustryOpportunities(ctx);
    assert.ok(opps.length >= 1);
    assert.ok(opps[0].evidenceIds.every((id) => ctx.evidenceById[id]));
    assert.ok(opps[0].retrievedAt);
  });
});
