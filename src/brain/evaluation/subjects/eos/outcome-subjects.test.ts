import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ContentBrainContext } from "@/brain/content/types";
import { audienceLineForContext, sanitizeAudienceLabel } from "@/brain/content/audience-label";
import {
  outcomeClaimSafety,
  THERAPEUTIC_OUTCOME_CLAIM_RE,
} from "@/brain/evaluation/creative-safety";
import { validateHookedTitle } from "@/brain/evaluation/gtc/topic-title-hook/validate";
import type { TopicSeed } from "@/brain/evaluation/objective-topic-strategies";
import { displayIntentKey } from "@/brain/evaluation/gtc/support-key";
import {
  classifyContextSubjects,
  extractOutcomeSubjects,
} from "@/brain/evaluation/topic-subject";

import { extractOutcomePairs } from "../extract-outcome-subjects";

const ZYNAVA_GLUED =
  "VitaminsVitamin DThe Sunshine VitaminVitamin CThe Immune & Antioxidant VitaminVitamin B12The Blood & Nerve VitaminVitamin B6The Metabolism VitaminVitamin AThe Vision & Immune Vitamin";

function zynavaLikeContext(): ContentBrainContext {
  return {
    brandName: "ZYNAVA",
    domain: "zynava.com",
    website: "https://zynava.com",
    products: [],
    services: [],
    indexedProducts: [],
    contentOpportunities: [],
    evidenceById: {
      ev_products: {
        id: "ev_products",
        recordType: "evidence",
        field: "productsServices",
        value: ZYNAVA_GLUED,
        sourceUrl: "https://zynava.com/supplements/catalog",
        sourceSnippet: ZYNAVA_GLUED.slice(0, 120),
        confidence: "high",
      },
    },
    signals: {
      headings: [],
      ctaTexts: [],
      productText: ZYNAVA_GLUED,
      aboutText: "",
      bodySample: "",
      testimonialText: "",
    },
    contextVersion: "test-zynava-outcome",
    source: "fixture",
  };
}

function clearflowLikeContext(): ContentBrainContext {
  return {
    brandName: "ClearFlow Plumbing",
    domain: "clearflowplumbing.example",
    website: "https://clearflowplumbing.example",
    audience: "Homeowners who need reliable plumbing repairs without surprise invoices",
    products: ["Emergency drain clearing", "Water heater installation"],
    services: ["Pipe repair", "Fixture replacement"],
    indexedProducts: [
      { name: "Tankless water heater install" },
      { name: "Main line camera inspection" },
    ],
    contentOpportunities: [
      "How to spot early signs of a slab leak",
      "What to ask before hiring a plumber",
    ],
    evidenceById: {
      ev_services: {
        id: "ev_services",
        recordType: "evidence",
        field: "productsServices",
        value:
          "Emergency Drain ClearingFast response when a clog backs up your kitchen or bathroomWater Heater InstallationUpgrade to a reliable tank or tankless unit",
        sourceUrl: "https://clearflowplumbing.example/services",
        sourceSnippet: "Emergency Drain ClearingFast response",
        confidence: "high",
      },
    },
    signals: {
      headings: [],
      ctaTexts: [],
      productText:
        "Emergency Drain ClearingFast response when a clog backs up your kitchen",
      aboutText: "",
      bodySample: "",
      testimonialText: "",
    },
    contextVersion: "test-clearflow-outcome",
    source: "fixture",
  };
}

describe("health_outcome subject extraction", () => {
  it("extracts ingredient→outcome pairs from Zynava-like camel-glued copy", () => {
    const context = zynavaLikeContext();
    const pairs = extractOutcomePairs(context);
    assert.ok(pairs.length >= 5, `expected multiple pairs, got ${pairs.length}`);
    assert.ok(
      pairs.some((p) => p.ingredient === "Vitamin D" && p.outcome === "Sunshine")
    );
    assert.ok(
      pairs.some((p) => p.ingredient === "Vitamin C" && /Immune/i.test(p.outcome))
    );

    const subjects = extractOutcomeSubjects(context);
    assert.ok(subjects.length >= 5);
    assert.ok(subjects.every((s) => s.kind === "health_outcome"));
    assert.ok(subjects.every((s) => s.evidenceIds.length > 0));
    assert.ok(
      subjects.some((s) => s.label.includes("Vitamin D") && s.label.includes("Sunshine"))
    );
  });

  it("degrades to zero outcome pairs for ClearFlow-style plumbing copy", () => {
    const context = clearflowLikeContext();
    const pairs = extractOutcomePairs(context);
    assert.equal(pairs.length, 0);

    const subjects = classifyContextSubjects(context).filter(
      (s) => s.kind === "health_outcome"
    );
    assert.equal(subjects.length, 0);
  });

  it("gives health_outcome seeds distinct display-intent buckets", () => {
    const context = zynavaLikeContext();
    const subjects = extractOutcomeSubjects(context);
    const keys = subjects.map((s) =>
      displayIntentKey({
        subject: s.label,
        subjectType: "health_outcome",
        sourceFields: [s.sourceField],
        evidenceIds: s.evidenceIds,
        classificationReason: s.classificationReason,
        classificationConfidence: s.classificationConfidence,
        frameHint: "outcome_education",
      })
    );
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.every((k) => !k.endsWith("|generic_label_check")));
  });
});

describe("outcome_claim_safety", () => {
  it("rejects bare therapeutic outcome claims", () => {
    assert.equal(outcomeClaimSafety("Magnesium for better sleep").ok, false);
    assert.ok(THERAPEUTIC_OUTCOME_CLAIM_RE.test("Magnesium for better sleep"));
  });

  it("allows attributed and educational framing", () => {
    assert.equal(
      outcomeClaimSafety(
        'Magnesium is labelled "The Energy Mineral" — what that wording means'
      ).ok,
      true
    );
    assert.equal(
      outcomeClaimSafety(
        "What research says about magnesium and energy"
      ).ok,
      true
    );
    assert.equal(
      outcomeClaimSafety(
        "What ZYNAVA will and will not claim about magnesium labels"
      ).ok,
      true
    );
  });

  it("validateHookedTitle applies outcome_claim_safety", () => {
    const seed: TopicSeed = {
      subject: "Magnesium — The Energy Mineral",
      subjectType: "health_outcome",
      sourceFields: ["productsServices"],
      evidenceIds: ["ev1"],
      classificationReason: "test",
      classificationConfidence: "high",
      frameHint: "outcome_education",
    };
    const bad = validateHookedTitle({
      seed,
      framedTitle: "Magnesium for better sleep",
      hookedTitle: "Magnesium for better sleep",
    });
    assert.equal(bad.ok, false);

    const good = validateHookedTitle({
      seed,
      framedTitle:
        'Magnesium is labelled "The Energy Mineral" — what that wording means',
      hookedTitle:
        'Magnesium is labelled "The Energy Mineral" — what that wording means',
    });
    assert.equal(good.ok, true);
  });
});

describe("audience label sanitizer", () => {
  it("rejects Zynava-like sentence fragment audience copy", () => {
    assert.equal(
      sanitizeAudienceLabel(
        "individuals often feel more confused, not less",
        "ZYNAVA"
      ),
      undefined
    );
    assert.equal(
      audienceLineForContext({
        audience: "individuals often feel more confused, not less",
        brandName: "ZYNAVA",
      }),
      "people researching what ZYNAVA offers"
    );
  });

  it("keeps short grounded audience noun phrases", () => {
    assert.equal(
      sanitizeAudienceLabel(
        "Homeowners who need reliable plumbing repairs without surprise invoices"
      ),
      "Homeowners who need reliable plumbing repairs without surprise invoices"
    );
  });
});
