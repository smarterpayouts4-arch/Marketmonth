import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ContentBrainContext } from "@/brain/content/types";

import { deduplicateEvidenceItems } from "./dedupe";
import { buildTopicEvidenceIndex } from "./index-evidence";
import {
  parseStructuredEvidenceValue,
  splitTopicListSegments,
} from "./parse-structured";
import {
  isNavChrome,
  isRejectedEvidence,
  sanitizeEvidenceValue,
  segmentCamelGlued,
} from "./sanitize";
import { scoreEvidenceQuality } from "./score";
import { selectEvidenceForCategory } from "./select-for-category";

const FIXTURE_CONTEXT: ContentBrainContext = {
  brandName: "ClearFlow",
  domain: "clearflow.example",
  website: "https://clearflow.example",
  description: "Licensed plumbers serving homeowners with flat-rate pricing.",
  audience: "Homeowners needing reliable plumbing repairs.",
  products: ["Drain cleaning", "Water heater install"],
  services: ["Emergency plumbing"],
  indexedProducts: [{ name: "Tankless Heater Pro", sourceUrl: "https://clearflow.example/products/tankless" }],
  valueProposition: "Flat-rate quotes before work starts.",
  contentOpportunities: [],
  faqs: [
    {
      question: "Do you charge for estimates?",
      answer: "No — estimates are free for standard jobs.",
      sourceUrl: "https://clearflow.example/faq",
    },
  ],
  commercialTerms: [
    { label: "Free estimates", sourceUrl: "https://clearflow.example/offers" },
    { label: "Same-day service", sourceUrl: "https://clearflow.example/offers" },
  ],
  signals: {
    headings: ["Why Choose ClearFlow", "Explore Options→"],
    ctaTexts: ["Get a Quote", "Start Saving"],
    productText: "Tankless HeatersEnergy-efficient models for every home.",
    aboutText: "Family-owned since 1998.",
    bodySample: "",
    testimonialText: "They showed up on time and fixed the leak.",
  },
  evidenceById: {
    ev1: {
      id: "ev1",
      recordType: "evidence",
      field: "faq",
      value: "Q: Do you charge for estimates? A: No — estimates are free.",
      sourceUrl: "https://clearflow.example/faq",
      sourceSnippet: "Do you charge for estimates?",
      confidence: "high",
      evidenceType: "observed",
    },
    ev2: {
      id: "ev2",
      recordType: "evidence",
      field: "websiteTestimonial",
      value: "They showed up on time and fixed the leak.",
      sourceUrl: "https://clearflow.example",
      sourceSnippet: "They showed up on time",
      confidence: "high",
      evidenceType: "observed",
    },
    ev3: {
      id: "ev3",
      recordType: "industry_research",
      field: "marketingOpportunity",
      value: "Post more on social media to grow awareness.",
      sourceUrl: "",
      sourceSnippet: "Post more",
      confidence: "medium",
      evidenceType: "industry_research",
    },
    ev4: {
      id: "ev4",
      recordType: "evidence",
      field: "contactEmail",
      value: "info@clearflow.example",
      sourceUrl: "https://clearflow.example",
      sourceSnippet: "info@clearflow.example",
      confidence: "high",
      evidenceType: "observed",
    },
  },
  contextVersion: "fixture-v1",
  source: "fixture",
};

describe("sanitizeEvidenceValue", () => {
  it("rejects schema.org / script fragments", () => {
    assert.equal(isRejectedEvidence('{"@context":"https://schema.org"}'), true);
    assert.equal(sanitizeEvidenceValue("<script>alert(1)</script>"), null);
  });

  it("rejects nav chrome CTAs", () => {
    assert.equal(isNavChrome("Explore Options→"), true);
    assert.equal(isNavChrome("Start Saving"), true);
    assert.equal(sanitizeEvidenceValue("Explore Options→"), null);
    assert.equal(sanitizeEvidenceValue("Start Saving"), null);
  });

  it("scrubs inline PII and rejects PII-only values", () => {
    assert.equal(
      sanitizeEvidenceValue("Call us at info@example.com today."),
      "Call us at [email] today."
    );
    assert.equal(sanitizeEvidenceValue("info@example.com"), null);
  });

  it("segments camel-glued text before rejection", () => {
    const segments = segmentCamelGlued(
      "VitaminsVitamin DThe Sunshine Vitamin",
      []
    );
    assert.ok(segments.length >= 3);
    assert.ok(segments.some((s) => /Vitamin/i.test(s)));

    const repaired = sanitizeEvidenceValue(
      "VitaminsVitamin DThe Sunshine Vitamin",
      { protect: [] }
    );
    assert.ok(repaired);
    assert.match(repaired!, /Vitamins/);
    assert.match(repaired!, /Vitamin D The/);
    assert.match(repaired!, /Sunshine Vitamin/);
    assert.equal(repaired!.includes("DThe"), false);
  });

  it("returns cleaned usable prose", () => {
    const out = sanitizeEvidenceValue(
      "  Licensed plumbers · flat-rate quotes before work starts.  "
    );
    assert.equal(out, "Licensed plumbers · flat-rate quotes before work starts.");
  });
});

describe("scoreEvidenceQuality", () => {
  it("applies the quality ladder", () => {
    assert.equal(
      scoreEvidenceQuality({ evidenceType: "observed", confidence: "high" }),
      1.0
    );
    assert.equal(
      scoreEvidenceQuality({ evidenceType: "observed", confidence: "medium" }),
      0.8
    );
    assert.equal(
      scoreEvidenceQuality({ evidenceType: "inferred", confidence: "high" }),
      0.7
    );
    assert.equal(
      scoreEvidenceQuality({ evidenceType: "inferred", confidence: "medium" }),
      0.55
    );
    assert.equal(
      scoreEvidenceQuality({ evidenceType: "recommended", confidence: "medium" }),
      0.45
    );
    assert.equal(
      scoreEvidenceQuality({ evidenceType: "observed", confidence: "low" }),
      0.2
    );
  });
});

describe("deduplicateEvidenceItems", () => {
  it("prefers complete over clipped duplicates in the same field", () => {
    const base = {
      recordType: "brand_profile",
      field: "description",
      sourceUrl: "https://example.com",
      evidenceType: "observed" as const,
      confidence: "high" as const,
      qualityScore: 1,
      signalType: "brand_identity" as const,
    };
    const clipped = {
      ...base,
      id: "a",
      value: "Licensed plumbers serving homeowners with flat-rate pricing and",
      normalizedText:
        "Licensed plumbers serving homeowners with flat-rate pricing and",
    };
    const complete = {
      ...base,
      id: "b",
      value: "Licensed plumbers serving homeowners with flat-rate pricing.",
      normalizedText: "Licensed plumbers serving homeowners with flat-rate pricing.",
    };
    const out = deduplicateEvidenceItems([clipped, complete]);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.id, "b");
  });
});

describe("splitTopicListSegments / educationalTopics blob", () => {
  it("splits separator-joined headings into per-segment items", () => {
    const blob =
      "Compare Supplement Prices Based on Your Preferences · Why Zynava Exists · Smarter Choices Start Here";
    const segments = splitTopicListSegments(blob);
    assert.equal(segments.length, 3);
    assert.equal(
      segments[0],
      "Compare Supplement Prices Based on Your Preferences"
    );
    assert.ok(!segments.some((s) => s.includes("·")));

    const items = parseStructuredEvidenceValue(
      "educationalTopics",
      blob,
      "https://zynava.com",
      "observed",
      "high",
      "evidence"
    );
    assert.ok(items.length >= 3);
    assert.ok(
      items.every((i) => !i.normalizedText.includes("·") || i.normalizedText.split("·").length === 1)
    );
    assert.ok(
      items.some((i) =>
        /Compare Supplement Prices Based on Your Preferences/i.test(
          i.normalizedText
        )
      )
    );
    assert.ok(
      items.some((i) => /Why Zynava Exists/i.test(i.normalizedText))
    );
  });
});

describe("buildTopicEvidenceIndex + selectEvidenceForCategory", () => {
  it("indexes context evidence excluding industry research from proof paths", () => {
    const index = buildTopicEvidenceIndex(FIXTURE_CONTEXT);
    assert.ok(index.items.length > 0);
    assert.ok(index.faqs.length >= 1);
    assert.ok(index.commercialTerms.length >= 2);
    assert.equal(
      index.items.some((i) => i.normalizedText.includes("Post more on social")),
      false
    );
    assert.equal(
      index.items.some((i) => i.normalizedText.includes("[email]")),
      false
    );
  });

  it("selects 12–24 items for customer_questions with preferred fields", () => {
    const index = buildTopicEvidenceIndex(FIXTURE_CONTEXT);
    const selected = selectEvidenceForCategory(index, "customer_questions", {
      minCount: 4,
      maxCount: 12,
    });
    assert.ok(selected.length >= 4);
    assert.ok(selected.length <= 12);
    assert.ok(selected.every((i) => i.id && i.normalizedText));
    const hasFaq = selected.some((i) => i.field === "faq" || i.signalType === "faq");
    assert.ok(hasFaq);
  });
});
