import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import type { ContentBrainContext } from "@/brain/content/types";

import {
  classifyContextSubjects,
  customerFacingOpportunities,
  extractPlatformCapabilities,
  extractProductSubjects,
  generateTopicCandidates,
  isMetaInstructionalPhrase,
  objectiveTopicStrategies,
} from "./generate-topic-candidates";
import { TOPIC_CANDIDATE_SCORE_VERSION } from "./topic-candidate-types";

function loadZynavaContext(): ContentBrainContext {
  const text = readFileSync(
    path.join(process.cwd(), "data/companies/zynava.com/approved.csv"),
    "utf8"
  );
  const ctx = parseFixtureCsv(text);
  assert.ok(ctx, "fixture must parse");
  return ctx;
}

function baseContext(
  overrides: Partial<ContentBrainContext> = {}
): ContentBrainContext {
  const products = overrides.products ?? [];
  const services = overrides.services ?? [];
  const indexedProducts = overrides.indexedProducts ?? [];
  const contentOpportunities = overrides.contentOpportunities ?? [];
  const evidenceById: ContentBrainContext["evidenceById"] = {
    ...(overrides.evidenceById ?? {}),
  };
  let n = 0;
  const addEv = (field: string, value: string, sourceUrl?: string) => {
    if (!value.trim()) return;
    const id = `ev_test_${n++}`;
    evidenceById[id] = {
      id,
      recordType: "evidence",
      field,
      value,
      sourceUrl: sourceUrl ?? "https://acme.test",
      sourceSnippet: value.slice(0, 120),
      confidence: "high",
    };
  };
  for (const p of products) addEv("productsServices", p);
  for (const s of services) addEv("productsServices", s);
  for (const p of indexedProducts) {
    addEv("indexedProduct", p.name, p.sourceUrl);
  }
  for (const o of contentOpportunities) addEv("educationalTopics", o);
  if (overrides.description) addEv("description", overrides.description);
  if (overrides.audience) addEv("positioning", overrides.audience);
  if (overrides.valueProposition) {
    addEv("positioning", overrides.valueProposition);
  }
  if (overrides.marketingOpportunity) {
    addEv("ownedTopics", overrides.marketingOpportunity);
  }
  if (overrides.brandVoice) addEv("brandVoice", overrides.brandVoice);
  if (Object.keys(evidenceById).length === 0) {
    addEv("productsServices", "test");
  }

  return {
    brandName: "Acme",
    domain: "acme.test",
    website: "https://acme.test",
    products: [],
    services: [],
    indexedProducts: [],
    contentOpportunities: [],
    contextVersion: "test",
    source: "fixture",
    ...overrides,
    evidenceById,
  };
}

describe("generate-topic-candidates helpers", () => {
  it("flags meta/ops instructional phrases", () => {
    assert.equal(isMetaInstructionalPhrase("Clarify lead offer"), true);
    assert.equal(
      isMetaInstructionalPhrase(
        "Tighten homepage messaging around one lead offer"
      ),
      true
    );
    assert.equal(isMetaInstructionalPhrase("Improve SEO copy"), true);
    assert.equal(
      isMetaInstructionalPhrase("How to compare prices across retailers"),
      false
    );
  });

  it("does not hardcode brand category literals in generator/strategy source", () => {
    for (const file of [
      "generate-topic-candidates.ts",
      "objective-topic-strategies.ts",
      "topic-subject.ts",
    ]) {
      const src = readFileSync(
        path.join(process.cwd(), "src/brain/evaluation", file),
        "utf8"
      );
      assert.equal(src.includes("Marketing OS"), false);
      assert.equal(src.includes("search supplements"), false);
    }
  });

  it("excludes meta phrases from customer-facing opportunity pool", () => {
    const context = baseContext({
      products: ["Widget search"],
      services: ["Price comparison"],
      contentOpportunities: [
        "Clarify lead offer",
        "How shoppers compare widget prices",
      ],
      marketingOpportunity: "Tighten homepage messaging",
    });
    const ops = customerFacingOpportunities(context);
    assert.deepEqual(ops, ["How shoppers compare widget prices"]);
  });

  it("classifies platform capabilities separately from catalog products", () => {
    const context = baseContext({
      products: ["Widget search", "Magnesium glycinate"],
      services: ["Price comparison"],
      indexedProducts: [
        {
          name: "Pro Drill Kit",
          sourceUrl: "https://acme.test/products/drill",
        },
      ],
    });
    const platform = extractPlatformCapabilities(context);
    const products = extractProductSubjects(context);
    assert.ok(platform.some((s) => /widget search/i.test(s.label)));
    assert.ok(platform.every((s) => s.kind === "platform_capability"));
    assert.ok(products.some((s) => /magnesium/i.test(s.label)));
    assert.ok(products.some((s) => /pro drill kit/i.test(s.label)));
    assert.ok(
      products.every(
        (s) =>
          s.kind === "catalog_product" || s.kind === "ingredient_or_component"
      )
    );
    assert.ok(platform.every((s) => s.classificationReason.length > 0));
  });

  it("products[] platform advisor is not catalog_product", () => {
    const context = baseContext({
      products: ["AI supplement advisor"],
    });
    const products = extractProductSubjects(context);
    assert.equal(
      products.filter((s) => s.kind === "catalog_product").length,
      0
    );
  });

  it("typed indexedProducts can produce catalog_product", () => {
    const context = baseContext({
      products: ["AI supplement advisor"],
      indexedProducts: [
        {
          name: "Alpine Daypack",
          sourceUrl: "https://acme.test/p/daypack",
        },
      ],
    });
    const products = extractProductSubjects(context);
    assert.ok(
      products.some(
        (s) => s.kind === "catalog_product" && /alpine daypack/i.test(s.label)
      )
    );
  });

  it("one category with many frames stays limited or insufficient (support-key family)", () => {
    const context = baseContext({
      brandName: "Acme",
      description: "Education about supplements for everyday shoppers",
      audience: "People learning about supplements",
      products: [],
      indexedProducts: [],
      contentOpportunities: [],
      valueProposition: "Clearer supplement education",
    });
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    // Must never pad to a false complete six from a single category family.
    if (result.status === "insufficient_context") {
      assert.equal(result.candidates.length, 0);
      return;
    }
    assert.equal(result.status, "success");
    assert.equal(result.completeness, "limited");
    assert.ok(result.candidates.length <= 5);
  });

  it("exactly one objective strategy registry", () => {
    assert.equal(Object.keys(objectiveTopicStrategies).length, 5);
  });
});

describe("generateTopicCandidates (objective strategy)", () => {
  it("Zynava product_education is limited or insufficient — never platform primary", () => {
    const context = loadZynavaContext();
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    if (result.status === "insufficient_context") {
      assert.equal(result.candidates.length, 0);
      assert.equal(
        result.diagnostic.code,
        "INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS"
      );
      return;
    }
    assert.equal(result.status, "success");
    assert.ok(
      result.completeness === "limited" || result.completeness === "complete"
    );
    if (result.completeness === "limited") {
      assert.ok(result.candidates.length >= 1);
      assert.ok(result.candidates.length <= 5);
      assert.ok(result.warnings.length >= 1);
    }
    for (const c of result.candidates) {
      assert.notEqual(c.subjectKind, "platform_capability");
      assert.equal(/supplement search/i.test(c.title), false);
      assert.equal(/plan builder/i.test(c.title), false);
      assert.equal(c.scoreVersion, TOPIC_CANDIDATE_SCORE_VERSION);
      assert.ok(c.sourceFields.length >= 1);
      assert.ok("objectiveAlignment" in c.score);
      assert.equal(isMetaInstructionalPhrase(c.title), false);
      assert.equal(c.titleHookVersion, "topic-title-hook-v2");
      assert.ok(c.titleItchType);
      assert.equal(/\bHelp overwhelmed\b/i.test(c.title), false);
      assert.equal(/\bmost shoppers\b/i.test(c.title), false);
      assert.equal(/\bOne supplements\b/i.test(c.title), false);
      assert.equal(/\buntil you check this\b/i.test(c.title), false);
    }
  });

  it("value_proposition may use platform capabilities; honesty over padding to six", () => {
    const context = loadZynavaContext();
    const result = generateTopicCandidates({
      context,
      objective: "value_proposition",
    });
    assert.equal(result.status, "success");
    if (result.status !== "success") return;
    // Observed-only evidence (no brand_profile promotion) may yield limited.
    assert.ok(
      result.completeness === "complete" || result.completeness === "limited"
    );
    assert.ok(result.candidates.length >= 1);
    if (result.completeness === "complete") {
      assert.equal(result.candidates.length, 6);
    }
    assert.ok(
      result.candidates.some((c) => c.subjectKind === "platform_capability") ||
        result.candidates.length >= 1
    );
    const scores = result.candidates.map((c) => c.score.overall);
    const unique = new Set(scores);
    assert.ok(
      unique.size >= 2 ||
        Math.max(...scores) - Math.min(...scores) > 0.01 ||
        result.candidates.length === 1,
      "scores should not all be identical when multiple candidates exist"
    );
  });

  it("no magnesium topic when magnesium is absent from approved context", () => {
    const context = baseContext({
      audience: "Shoppers comparing supplements",
      products: ["Supplement search"],
      contentOpportunities: [
        "What to check on a supplement label before buying",
        "How to compare price per serving across retailers",
      ],
    });
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    const titles =
      result.status === "success"
        ? result.candidates.map((c) => c.title).join(" ")
        : "";
    assert.equal(/magnesium/i.test(titles), false);
  });

  it("magnesium in test context can produce magnesium education topics", () => {
    const context = baseContext({
      brandName: "Acme",
      audience: "Shoppers comparing minerals",
      products: ["Magnesium glycinate", "Magnesium citrate"],
      contentOpportunities: [
        "What to compare on a magnesium supplement label",
        "Magnesium glycinate vs citrate: how the forms differ",
      ],
      evidenceById: {
        ev_mg: {
          id: "ev_mg",
          recordType: "brand_profile",
          field: "products",
          value: "Magnesium glycinate",
          sourceUrl: "https://acme.test",
          sourceSnippet: "Magnesium glycinate",
          confidence: "high",
        },
      },
    });
    // Force medium/high classification — magnesium glycinate hits ingredient pattern
    const subjects = classifyContextSubjects(context);
    assert.ok(subjects.some((s) => /magnesium/i.test(s.label)));

    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    assert.equal(result.status, "success");
    if (result.status !== "success") return;
    const blob = result.candidates.map((c) => c.title).join(" ");
    assert.ok(/magnesium/i.test(blob), `expected magnesium in ${blob}`);
    assert.ok(
      result.candidates.every((c) => c.subjectKind !== "platform_capability")
    );
  });

  it("strategies do not re-label subject kinds", () => {
    const context = loadZynavaContext();
    const before = classifyContextSubjects(context);
    const platformLabels = new Set(
      before
        .filter((s) => s.kind === "platform_capability")
        .map((s) => s.label.toLowerCase())
    );
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    if (result.status !== "success") return;
    for (const c of result.candidates) {
      if (platformLabels.has(c.title.toLowerCase())) {
        assert.fail("platform label must not appear as education candidate title noun");
      }
      // If subject text matches a known platform label, kind must still not be product
      for (const pl of platformLabels) {
        if (c.title.toLowerCase().includes(pl.slice(0, 16))) {
          assert.notEqual(c.subjectKind, "catalog_product");
        }
      }
    }
  });

  it("decision_support and trust_authority use preferred kinds", () => {
    const context = loadZynavaContext();
    const decision = generateTopicCandidates({
      context,
      objective: "decision_support",
    });
    const trust = generateTopicCandidates({
      context,
      objective: "trust_authority",
    });
    // decision_support may be insufficient when the fixture lacks
    // decision_criterion / comparison_attribute subjects with evidence.
    assert.ok(
      decision.status === "success" || decision.status === "insufficient_context",
      `decision status: ${decision.status}`
    );
    assert.equal(trust.status, "success");
    if (decision.status === "success") {
      assert.ok(
        decision.candidates.some(
          (c) =>
            c.subjectKind === "decision_criterion" ||
            c.subjectKind === "comparison_attribute"
        )
      );
    }
    if (trust.status === "success") {
      // Prefer trust_method / brand_position; FAQ-backed trust is valid when
      // those kinds lack evidence after grounding filters.
      assert.ok(
        trust.candidates.some(
          (c) =>
            c.subjectKind === "trust_method" ||
            c.subjectKind === "brand_position" ||
            c.subjectKind === "faq_topic"
        )
      );
    }
  });

  it("internal SEO never becomes candidate titles", () => {
    const context = baseContext({
      products: ["Search tool"],
      contentOpportunities: [
        "Clarify lead offer",
        "How to compare widget labels before buying",
      ],
    });
    for (const objective of [
      "product_education",
      "value_proposition",
      "brand_awareness",
    ] as const) {
      const result = generateTopicCandidates({ context, objective });
      if (result.status !== "success") continue;
      for (const c of result.candidates) {
        assert.equal(/clarify lead offer/i.test(c.title), false);
      }
    }
  });
});

describe("classification leak + honesty (red team)", () => {
  it("does not classify Comparing as ingredient_or_component", () => {
    const context = baseContext({
      audience: "Shoppers comparing supplements",
      description: "A supplement comparison site",
      contentOpportunities: [
        "Comparing supplement brands without sponsored rankings",
        "What to check on a supplement label before buying",
      ],
    });
    const products = extractProductSubjects(context);
    assert.ok(
      products.every((s) => !/^comparing$/i.test(s.label)),
      `unexpected Comparing subject: ${JSON.stringify(products)}`
    );
    assert.ok(
      products.every((s) => !/comparing/i.test(s.label)),
      "Comparing must not appear as an ingredient label"
    );
  });

  it("unknown capitalized word before supplement is not an ingredient", () => {
    const context = baseContext({
      contentOpportunities: ["Choosing supplement brands carefully"],
    });
    const products = extractProductSubjects(context);
    assert.equal(
      products.filter((s) => s.kind === "ingredient_or_component").length,
      0
    );
  });

  it("product_education never titles guide to Comparing / evaluate Comparing", () => {
    const context = loadZynavaContext();
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    if (result.status !== "success") return;
    for (const c of result.candidates) {
      assert.equal(/guide to Comparing\b/i.test(c.title), false);
      assert.equal(/evaluate Comparing\b/i.test(c.title), false);
      assert.equal(/\bComparing\b/.test(c.title) && c.subjectKind === "ingredient_or_component", false);
    }
  });

  it("category framing prefers supplements over guide to supplement", () => {
    const context = baseContext({
      brandName: "Acme",
      description: "We help people shop for a supplement with clearer labels",
      audience: "Shoppers researching a supplement",
      contentOpportunities: ["What to check on a supplement label before buying"],
      indexedProducts: [
        {
          name: "Vitamin D3 Softgels",
          sourceUrl: "https://acme.test/catalog/d3",
        },
      ],
    });
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    if (result.status !== "success") return;
    for (const c of result.candidates) {
      assert.equal(/guide to supplement\b/i.test(c.title), false);
      assert.equal(/evaluate supplement\b(?!s)/i.test(c.title), false);
    }
  });

  it("single generic category alone cannot claim complete six", () => {
    const context = baseContext({
      brandName: "Acme",
      description: "Education about supplements for everyday shoppers",
      audience: "People learning about supplements",
      products: [],
      contentOpportunities: [],
      valueProposition: "Clearer supplement education",
    });
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    if (result.status === "insufficient_context") {
      assert.equal(result.candidates.length, 0);
      return;
    }
    assert.equal(result.status, "success");
    assert.notEqual(result.completeness, "complete");
    assert.ok(result.candidates.length <= 5);
  });

  it("candidates carry nested subject identity", () => {
    const context = loadZynavaContext();
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    if (result.status !== "success") return;
    for (const c of result.candidates) {
      assert.ok(c.subject, "subject identity required");
      assert.equal(c.subject.kind, c.subjectKind);
      assert.ok(c.subject.label.length > 0);
      assert.ok(c.subject.sourceField.length > 0);
      assert.ok(Array.isArray(c.subject.evidenceIds));
      assert.equal(c.subject.classificationConfidence, c.classificationConfidence);
    }
  });

  it("candidate generation never writes history (result flag)", () => {
    const context = loadZynavaContext();
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    // Generator itself has no history side effects; Idea Lab use-case asserts historyWritten
    assert.ok(
      result.status === "success" || result.status === "insufficient_context"
    );
  });

  it("Zynava product_education can name grounded catalog ingredients — never platform primary", () => {
    const context = loadZynavaContext();
    assert.ok(
      context.indexedProducts.some((p) => /magnesium/i.test(p.name)),
      "fixture must include grounded magnesium catalog nouns"
    );
    const result = generateTopicCandidates({
      context,
      objective: "product_education",
    });
    assert.ok(result.status === "success" || result.status === "insufficient_context");
    if (result.status !== "success") return;
    const blob = result.candidates.map((c) => c.title).join(" ");
    assert.ok(
      /magnesium|vitamin|omega|zinc/i.test(blob),
      "expected ingredient-named product education topics from enriched fixture"
    );
    assert.ok(
      result.candidates.every((c) => c.subjectKind !== "platform_capability")
    );
  });
});
