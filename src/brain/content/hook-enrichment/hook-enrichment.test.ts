import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ContentVariation } from "@/brain/content/types";

import { enrichSixDirectionHooks } from "./enrich";
import { HOOK_ENRICHMENT_VERSION } from "./types";
import { evidenceIdsSubset, validateHookEnrichment } from "./validate";

function fakeVariation(overrides: Partial<ContentVariation> = {}): ContentVariation {
  return {
    id: "v1",
    angle: "beginner_guide",
    punchline: "A practical starting guide to labels",
    subheading: "Start here",
    brief: "Learn what to check on a supplement label before buying.",
    ideaSummary:
      "Walk shoppers through the label fields that reduce guesswork before they buy.",
    strategicPurpose: "Educate",
    evidenceIds: ["ev_a", "ev_b"],
    assumptionIds: [],
    confidence: "medium",
    safety: { status: "safe", reasons: [] },
    ...overrides,
  };
}

describe("hook-enrichment-v1", () => {
  it("keeps masterTitle byte-for-byte and leaves deterministic hooks by default", async () => {
    const masterTitle = "What to check on a supplement label before buying";
    const six = [
      fakeVariation({ id: "1" }),
      fakeVariation({ id: "2", angle: "faq", punchline: "FAQ about labels" }),
      fakeVariation({
        id: "3",
        angle: "problem_solution",
        punchline: "Stop guessing on labels",
      }),
      fakeVariation({
        id: "4",
        angle: "decision_guide",
        punchline: "A decision guide for labels",
      }),
      fakeVariation({
        id: "5",
        angle: "comparison",
        punchline: "Comparing label claims carefully",
      }),
      fakeVariation({
        id: "6",
        angle: "trust_transparency",
        punchline: "Trust the label process",
      }),
    ] as const;

    const out = await enrichSixDirectionHooks({
      variations: [...six] as typeof six &
        [
          ContentVariation,
          ContentVariation,
          ContentVariation,
          ContentVariation,
          ContentVariation,
          ContentVariation,
        ],
      masterTitle,
      objective: "product_education",
      context: {
        brandName: "Zynava",
        domain: "zynava.com",
        website: "https://zynava.com",
        products: ["comparison search"],
        services: [],
        catalogProducts: [],
        contentOpportunities: ["What to check on a supplement label"],
        evidenceById: {},
        contextVersion: "test",
        source: "fixture",
      },
      provider: "deterministic-v1",
    });

    assert.equal(out.masterTitle, masterTitle);
    assert.equal(out.meta.enrichmentVersion, HOOK_ENRICHMENT_VERSION);
    assert.equal(out.meta.providerUsed, "deterministic-v1");
    assert.equal(out.variations[0].punchline, six[0].punchline);
    assert.equal(out.variations[0].angle, "beginner_guide");
    assert.deepEqual(out.variations[0].evidenceIds, ["ev_a", "ev_b"]);
  });

  it("rejects enrichment that introduces medical claims or new numbers", () => {
    const variation = fakeVariation();
    const request = {
      masterTitle: "Label checklist",
      objective: "product_education" as const,
      angle: variation.angle,
      groundedSummary: variation.brief,
      allowedFacts: ["supplement label", "Zynava"],
      audienceLabel: "shoppers",
      originalHook: variation.punchline,
    };
    const bad = validateHookEnrichment({
      request,
      result: {
        hook: "This cures fatigue in 3 days with 47% better absorption",
        enrichmentVersion: HOOK_ENRICHMENT_VERSION,
        providerUsed: "openai",
      },
      variation,
      masterTitle: "Label checklist",
    });
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.ok(bad.reasons.some((r) => /medical|number/i.test(r)));
    }
  });

  it("requires evidence IDs to remain a subset of grounded input", () => {
    assert.equal(evidenceIdsSubset(["ev_a"], ["ev_a", "ev_b"]), true);
    assert.equal(evidenceIdsSubset(["ev_a", "ev_x"], ["ev_a", "ev_b"]), false);
  });
});
