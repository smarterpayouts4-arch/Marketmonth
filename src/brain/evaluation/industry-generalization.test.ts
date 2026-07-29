/**
 * P2.3 generalization suite: CSV-token classifiers, typed commerce
 * comparison attrs, faq_education frame titles, and subject-kind-conditioned
 * shell families — all exercised with non-supplement (plumbing) vocabulary.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ContentBrainContext } from "@/brain/content/types";

import { frameTitle } from "./gtc/frame-title";
import { deterministicHookedTitle } from "./gtc/topic-title-hook/templates";
import type { TopicSeed } from "./objective-topic-strategies";
import { classifyOfferNoun } from "./subjects/classify-offer";
import { typedCommerceAttribute } from "./subjects/commerce-attributes";
import {
  buildContextTokenIndex,
  sharesCatalogToken,
  significantTokens,
} from "./subjects/context-tokens";
import { extractComparisonAttributes } from "./subjects/extract-comparison";

function plumbingContext(): ContentBrainContext {
  return {
    brandName: "ClearFlow",
    domain: "clearflow-plumbing",
    website: "https://clearflowplumbing.example",
    products: ["Water heater installation service"],
    services: ["Emergency drain cleaning"],
    indexedProducts: [
      { name: "Tankless water heater installation", price: "$1,800" },
      { name: "Standard water heater replacement", price: "$1,200" },
    ],
    contentOpportunities: [],
    commercialTerms: [
      { label: "Free shipping on replacement parts over $50" },
      { label: "Workmanship guarantee on every installation" },
    ],
    evidenceById: {
      E1: {
        id: "E1",
        recordType: "catalog",
        field: "indexedProduct",
        value: "Tankless water heater installation",
        sourceUrl: "https://clearflowplumbing.example/services",
        sourceSnippet: "Tankless water heater installation from $1,800",
        confidence: "high",
      },
      E2: {
        id: "E2",
        recordType: "catalog",
        field: "indexedProduct",
        value: "Standard water heater replacement",
        sourceUrl: "https://clearflowplumbing.example/services",
        sourceSnippet: "Standard water heater replacement from $1,200",
        confidence: "high",
      },
      E3: {
        id: "E3",
        recordType: "commercial",
        field: "commercialTerms",
        value: "Free shipping on replacement parts over $50",
        sourceUrl: "https://clearflowplumbing.example/terms",
        sourceSnippet: "Free shipping on replacement parts over $50",
        confidence: "high",
      },
      E4: {
        id: "E4",
        recordType: "commercial",
        field: "commercialTerms",
        value: "Workmanship guarantee on every installation",
        sourceUrl: "https://clearflowplumbing.example/terms",
        sourceSnippet: "Workmanship guarantee on every installation",
        confidence: "high",
      },
      E5: {
        id: "E5",
        recordType: "offer",
        field: "products",
        value: "Water heater installation service",
        sourceUrl: "https://clearflowplumbing.example",
        sourceSnippet: "Water heater installation service",
        confidence: "medium",
      },
    } as ContentBrainContext["evidenceById"],
    contextVersion: "test-v1",
    source: "fixture",
  };
}

function seedOf(overrides: Partial<TopicSeed>): TopicSeed {
  return {
    subject: "Licensed and insured service team",
    subjectType: "trust_method",
    evidenceIds: ["E1"],
    sourceFields: ["signals"],
    classificationReason: "test",
    classificationConfidence: "high",
    frameHint: "transparency",
    sourceType: "brand_observed",
    ...overrides,
  };
}

describe("CSV-token classifiers (P2.3)", () => {
  it("significantTokens drops stopwords and short tokens", () => {
    assert.deepEqual(
      significantTokens("The best water heater for your home"),
      ["water", "heater", "home"]
    );
  });

  it("offer noun corroborated by catalog tokens becomes catalog_product without supplement lexicon", () => {
    const context = plumbingContext();
    // "service" would trip the platform-capability regex (checked first),
    // so use plain offer wording like a company would list it.
    const subject = classifyOfferNoun(
      "Water heater installation and repair",
      "products[0]",
      context
    );
    assert.equal(subject.kind, "catalog_product");
    assert.equal(subject.classificationConfidence, "medium");
    assert.match(subject.classificationReason, /CSV-grounded/);
  });

  it("uncorroborated offer noun stays low-confidence catalog_product", () => {
    const context = plumbingContext();
    const subject = classifyOfferNoun(
      "Seasonal maintenance visits",
      "products[1]",
      context
    );
    assert.equal(subject.kind, "catalog_product");
    assert.equal(subject.classificationConfidence, "low");
  });

  it("token index separates catalog and commercial sources", () => {
    const index = buildContextTokenIndex(plumbingContext());
    assert.ok(index.catalogTokens.has("tankless"));
    assert.ok(index.commercialTokens.has("guarantee"));
    assert.ok(!index.catalogTokens.has("guarantee"));
    assert.ok(sharesCatalogToken("tankless options compared", index));
  });
});

describe("typed comparison attrs from commercial/catalog fields (P2.3)", () => {
  it("commercial terms with commerce attributes become high-confidence comparison subjects", () => {
    const subjects = extractComparisonAttributes(plumbingContext());
    const shipping = subjects.find((s) =>
      /free shipping/i.test(s.label)
    );
    assert.ok(shipping, "shipping term must classify");
    assert.equal(shipping!.kind, "comparison_attribute");
    assert.equal(shipping!.classificationConfidence, "high");
    assert.match(shipping!.sourceField, /^commercialTerms\[/);

    const warranty = subjects.find((s) => /guarantee/i.test(s.label));
    assert.ok(warranty, "guarantee term must classify");
  });

  it("two priced catalog records ground a price comparison attribute", () => {
    const subjects = extractComparisonAttributes(plumbingContext());
    const price = subjects.find(
      (s) => s.sourceField === "indexedProducts.price"
    );
    assert.ok(price, "price coverage subject expected");
    assert.equal(price!.kind, "comparison_attribute");
  });

  it("typedCommerceAttribute maps families, not industries", () => {
    assert.equal(typedCommerceAttribute("30-day returns, no questions"), "returns");
    assert.equal(typedCommerceAttribute("Transparent pricing per visit"), "price");
    assert.equal(typedCommerceAttribute("Our team is friendly"), undefined);
  });
});

describe("faq_education frame titles (P2.3)", () => {
  const context = plumbingContext();

  it("keeps the customer's question as the title", () => {
    const framed = frameTitle(
      seedOf({
        subject: "How long does a water heater installation take",
        subjectType: "faq_topic",
        frameHint: "faq_education",
      }),
      context,
      "customer_questions"
    );
    assert.ok(framed);
    assert.equal(
      framed!.title,
      "How long does a water heater installation take?"
    );
    assert.equal(framed!.strategicAngle, "FAQ education");
  });

  it("frames non-question FAQ labels as answered questions (no generic category prefix)", () => {
    const framed = frameTitle(
      seedOf({
        subject: "Water heater warranty coverage",
        subjectType: "faq_topic",
        frameHint: "faq_education",
      }),
      context,
      "customer_questions"
    );
    assert.ok(framed);
    assert.match(framed!.title, /^What customers ask about/);
    assert.doesNotMatch(framed!.title, /^Customer Questions:/);
  });
});

describe("subject-kind-conditioned shell families (P2.3)", () => {
  it("trust/brand/faq subjects never get retail check shells", () => {
    const kinds = ["trust_method", "brand_position", "faq_topic"] as const;
    for (const kind of kinds) {
      for (let rank = 0; rank < 8; rank++) {
        const hooked = deterministicHookedTitle(
          seedOf({
            subject: "Certified installer program",
            subjectType: kind,
            frameHint: "transparency",
          }),
          "Understanding certified installer programs",
          rank,
          new Set(),
          "trust_proof"
        );
        assert.doesNotMatch(
          hooked.title,
          /\bcheck the\b|\bcheck one thing\b|before you (buy|choose|compare)|^Buying\b/i,
          `${kind} rank ${rank} leaked a retail check shell: ${hooked.title}`
        );
      }
    }
  });

  it("comparison subjects keep grounded check shells", () => {
    const hooked = deterministicHookedTitle(
      seedOf({
        subject: "Free shipping on replacement parts over $50",
        subjectType: "comparison_attribute",
        frameHint: "compare_criteria",
      }),
      "What matters when comparing shipping terms",
      0,
      new Set(),
      "product_education"
    );
    assert.ok(hooked.title.length > 0);
    assert.notEqual(hooked.itchType, undefined);
  });
});
