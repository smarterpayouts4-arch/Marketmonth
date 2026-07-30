import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicEvidenceItem } from "../../evidence/types";
import { fetchLlmTopicCandidates } from "./fetch";
import {
  mapLlmCandidatesToFramed,
  __mapLlmSubjectTestables,
} from "./map-llm-candidates";
import { llmTopicCandidatesResponseSchema } from "./schema";
import { validateLlmTopicCandidate, __testables } from "./validate";

function evidenceItem(
  overrides: Partial<TopicEvidenceItem> & Pick<TopicEvidenceItem, "id">
): TopicEvidenceItem {
  return {
    recordType: "signal",
    field: "indexedProduct",
    value: "Omega-3 Fish Oil",
    normalizedText: "Omega-3 Fish Oil supports label comparison",
    sourceUrl: "https://example.com/products",
    evidenceType: "observed",
    confidence: "high",
    qualityScore: 0.9,
    signalType: "indexed_product",
    ...overrides,
  };
}

describe("llmTopicCandidatesResponseSchema", () => {
  it("accepts a well-formed candidates array", () => {
    const parsed = llmTopicCandidatesResponseSchema.safeParse({
      candidates: [
        {
          title: "What Omega-3 label language means on this catalog",
          strategicAngle: "Label education",
          whyItFits: "Grounded in indexed product evidence",
          evidenceRefs: ["E01"],
        },
      ],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects missing strategicAngle", () => {
    const parsed = llmTopicCandidatesResponseSchema.safeParse({
      candidates: [
        {
          title: "Some title long enough for validation",
          whyItFits: "because",
          evidenceRefs: ["E01"],
        },
      ],
    });
    assert.equal(parsed.success, false);
  });
});

describe("validateLlmTopicCandidate grounding", () => {
  const items = [
    evidenceItem({
      id: "ev_omega",
      normalizedText: "Omega-3 Fish Oil is listed in the catalog",
      value: "Omega-3 Fish Oil",
    }),
    evidenceItem({
      id: "ev_b1",
      field: "knowsAbout",
      normalizedText: "Vitamin B1 appears on supplement labels",
      value: "Vitamin B1",
      signalType: "educational_topic",
    }),
  ];
  const evidenceById = new Map(items.map((i) => [i.id, i]));
  const sentEvidenceIds = new Set(["E01", "E02"]);
  const displayToRealId = new Map([
    ["E01", "ev_omega"],
    ["E02", "ev_b1"],
  ]);

  it("accepts alias tolerance B1 vs Vitamin B1", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "What B1 wording on supplement labels actually describes",
        strategicAngle: "Ingredient education",
        whyItFits: "Uses observed knowsAbout evidence",
        evidenceRefs: ["E02"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
    });
    assert.equal(result.ok, true);
  });

  it("accepts Omega-3 title when present in evidence", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "How Omega-3 catalog entries read before you compare forms",
        strategicAngle: "Catalog education",
        whyItFits: "Grounded in indexed product evidence",
        evidenceRefs: ["E01"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
    });
    assert.equal(result.ok, true);
  });

  it("rejects evidenceRefs outside sent id set", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "How Omega-3 catalog entries read before you compare forms",
        strategicAngle: "Catalog education",
        whyItFits: "Grounded in indexed product evidence",
        evidenceRefs: ["E99"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /evidenceRefs/);
    }
  });

  it("rejects unsupported medical claims", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "Why Omega-3 cures inflammation for every shopper",
        strategicAngle: "Medical claim",
        whyItFits: "Not allowed",
        evidenceRefs: ["E01"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
    });
    assert.equal(result.ok, false);
  });

  it("rejects generic decision titles", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "How to make clearer marketing decisions about supplements",
        strategicAngle: "Generic",
        whyItFits: "Too generic",
        evidenceRefs: ["E01"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
    });
    assert.equal(result.ok, false);
  });
});

describe("customer_questions question-form titles (P1.3 defect fix)", () => {
  const items = [
    evidenceItem({
      id: "ev_omega",
      normalizedText: "Omega-3 Fish Oil is listed in the catalog",
      value: "Omega-3 Fish Oil",
    }),
  ];
  const evidenceById = new Map(items.map((i) => [i.id, i]));
  const sentEvidenceIds = new Set(["E01"]);
  const displayToRealId = new Map([["E01", "ev_omega"]]);

  const questionCandidate = {
    title: "Does Omega-3 Fish Oil belong in a daily routine?",
    strategicAngle: "Catalog education",
    whyItFits: "Answers a direct customer question about a listed product",
    evidenceRefs: ["E01"],
  };

  it("accepts a complete question title for customer_questions", () => {
    const result = validateLlmTopicCandidate({
      candidate: questionCandidate,
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
      categoryId: "customer_questions",
    });
    assert.equal(result.ok, true);
  });

  it("still rejects question titles for product_education", () => {
    const result = validateLlmTopicCandidate({
      candidate: questionCandidate,
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
      categoryId: "product_education",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "incomplete_sentence_title");
    }
  });

  it("rejects customer_questions candidates with neither question title nor audienceQuestion", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "How Omega-3 catalog entries read before you compare",
        strategicAngle: "Catalog education",
        whyItFits: "Grounded in indexed product evidence",
        evidenceRefs: ["E01"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
      categoryId: "customer_questions",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "category_mismatch");
    }
  });

  it("rejects titles introducing numbers absent from evidence", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "Why 87% of Omega-3 Fish Oil labels confuse buyers",
        strategicAngle: "Catalog education",
        whyItFits: "Grounded in indexed product evidence",
        evidenceRefs: ["E01"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
      categoryId: "product_education",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "ungrounded_number");
    }
  });

  it("drops an unsafe optional hook but keeps the candidate", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "What Omega-3 label language means on this catalog",
        strategicAngle: "Label education",
        whyItFits: "Grounded in indexed product evidence",
        hook: "Clinically proven to cure inflammation",
        evidenceRefs: ["E01"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
      categoryId: "product_education",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.hook, undefined);
    }
  });

  it("rejects candidates whose required creative field carries a medical claim", () => {
    const result = validateLlmTopicCandidate({
      candidate: {
        title: "What Omega-3 label language means on this catalog",
        strategicAngle: "Prevents disease in every customer",
        whyItFits: "Grounded in indexed product evidence",
        evidenceRefs: ["E01"],
      },
      sentEvidenceIds,
      displayToRealId,
      evidenceById,
      allEvidenceItems: items,
      categoryId: "product_education",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "unsafe_creative_field");
    }
  });
});

describe("__testables", () => {
  it("flags incomplete sentence titles", () => {
    assert.equal(
      __testables.isIncompleteSentenceTitle("is magnesium worth it"),
      true
    );
    assert.equal(
      __testables.isIncompleteSentenceTitle(
        "What Omega-3 label language means on this catalog"
      ),
      false
    );
  });
});

describe("mapLlmCandidatesToFramed subject resolution", () => {
  function zynavaLikeContext(): ContentBrainContext {
    return {
      brandName: "ZYNAVA",
      domain: "zynava.com",
      website: "https://zynava.com",
      description: "Compare supplement prices across retailers.",
      valueProposition: "Choose your ingredient, form, dietary needs, and budget.",
      brandVoice: "Clear and educational",
      audience: "Supplement shoppers comparing options",
      products: ["Supplement search and price comparison"],
      services: [],
      indexedProducts: [
        { name: "Magnesium", sourceUrl: "https://zynava.com/magnesium" },
        { name: "Vitamin C", sourceUrl: "https://zynava.com/vitamin-c" },
        { name: "Vitamin D3", sourceUrl: "https://zynava.com/vitamin-d3" },
      ],
      contentOpportunities: ["Magnesium", "Vitamin C"],
      evidenceById: {
        ev_edu: {
          id: "ev_edu",
          recordType: "evidence",
          field: "educationalTopics",
          value:
            "Compare Supplement Prices Based on Your Preferences · Why Zynava Exists · Smarter Choices Start Here",
          sourceUrl: "https://zynava.com",
          sourceSnippet: "Compare Supplement Prices Based on Your Preferences",
          confidence: "high",
          evidenceType: "observed",
        },
        ev_mg: {
          id: "ev_mg",
          recordType: "evidence",
          field: "indexedProduct",
          value: "Magnesium",
          sourceUrl: "https://zynava.com/magnesium",
          sourceSnippet: "Magnesium",
          confidence: "high",
          evidenceType: "observed",
        },
      },
      contextVersion: "test-v1",
      source: "fixture",
    };
  }

  it("snaps LLM candidate subject to Magnesium and never keeps a · separator", () => {
    const context = zynavaLikeContext();
    const framed = mapLlmCandidatesToFramed({
      candidates: [
        {
          title: "Why comparing Magnesium gets confusing before you buy",
          strategicAngle: "Ingredient education",
          whyItFits: "Grounded in indexed Magnesium evidence",
          evidenceRefs: ["ev_edu"],
          confidence: 0.8,
        },
      ],
      context,
      objective: "product_education",
    });
    assert.ok(framed.length >= 1);
    const seed = framed[0]!.seed;
    assert.equal(seed.subject.toLowerCase().includes("magnesium"), true);
    assert.equal(seed.subject.includes("·"), false);
    assert.equal(seed.subjectType, "ingredient_or_component");
    assert.ok(seed.rawSubject);
    assert.ok(seed.normalizedSubject);
  });

  it("does not classify educationalTopics as ingredient_or_component", () => {
    assert.notEqual(
      __mapLlmSubjectTestables.inferSubjectKind("educationalTopics"),
      "ingredient_or_component"
    );
  });

  it("takes only the first segment from a joined evidence blob", () => {
    const first = __mapLlmSubjectTestables.firstEvidenceSegment(
      "Compare Supplement Prices Based on Your Preferences · Why Zynava Exists"
    );
    assert.equal(
      first,
      "Compare Supplement Prices Based on Your Preferences"
    );
    assert.equal(first.includes("·"), false);
  });
});

describe("fetchLlmTopicCandidates missing api key", () => {
  it("returns missing_api_key without calling the network", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await fetchLlmTopicCandidates({
        context: {
          brandName: "Test Brand",
          domain: "example.com",
          website: "https://example.com",
          description: "A supplement shop",
          valueProposition: "Clear labels",
          brandVoice: "Plain",
          audience: "Shoppers",
          products: [],
          services: [],
          indexedProducts: [],
          contentOpportunities: [],
          evidenceById: {},
          contextVersion: "test-v1",
          source: "fixture",
        },
        categoryId: "product_education",
        evidenceItems: [
          evidenceItem({ id: "ev1", normalizedText: "Omega-3 Fish Oil" }),
        ],
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "missing_api_key");
      }
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    }
  });
});
