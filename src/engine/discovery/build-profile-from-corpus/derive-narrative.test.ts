import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BrandSignals } from "../types";

import {
  deriveNarrative,
  descriptionHasChrome,
  isGenericAudience,
  isGenericValueProposition,
} from "./derive-narrative";

function signals(over: Partial<BrandSignals> = {}): BrandSignals {
  return {
    title: "ZYNAVA",
    metaDescription:
      "Compare supplements across retailers with clear price-per-serving.",
    headings: [],
    colors: [],
    contactEmails: [],
    contactPhones: [],
    aboutText:
      "ZYNAVA helps individuals seeking clarity navigate a confusing supplement market with transparent comparison tools.",
    productText: "",
    faqText: "",
    faqs: [
      {
        question: "What is ZYNAVA?",
        answer:
          "ZYNAVA is a supplement discovery platform that helps people compare options without sponsored rankings.",
        sourceUrl: "https://zynava.com/faq",
      },
      {
        question: "Who is ZYNAVA for?",
        answer:
          "People who feel confused by the supplement market and want clearer comparisons.",
        sourceUrl: "https://zynava.com/faq",
      },
    ],
    indexedProducts: [],
    bodySample: "",
    testimonialText: "",
    blogText: "",
    ctaTexts: [],
    locationHints: [],
    ...over,
  };
}

describe("deriveNarrative", () => {
  it("does not emit hardcoded generic audience/VP", () => {
    const n = deriveNarrative({ businessName: "ZYNAVA", signals: signals() });
    assert.ok(n.audience.length > 10);
    assert.equal(isGenericAudience(n.audience), false);
    assert.equal(isGenericValueProposition(n.valueProposition), false);
    assert.equal(descriptionHasChrome(n.description), false);
  });

  it("does not backfill services from page headings", () => {
    const n = deriveNarrative({
      businessName: "ZYNAVA",
      signals: signals({
        aboutText:
          "Search and compare supplements, build a plan, and ask the advisor.",
        headings: ["Why Zynava Exists", "Price comparison", "Preference planner"],
      }),
    });
    assert.deepEqual(n.services, []);
    assert.ok(
      !n.services.some((s) => /Why Zynava Exists/i.test(s)),
      "marketing headings must not become services"
    );
    assert.equal(n.marketingOpportunity.length === 0 || !/Educate on/i.test(n.marketingOpportunity), true);
  });

  it("leaves description empty when only chrome is available", () => {
    const n = deriveNarrative({
      businessName: "X",
      signals: signals({
        aboutText: "How It WorksContactMore Home",
        metaDescription: "",
        faqs: [],
      }),
    });
    assert.equal(n.description, "");
  });
});
