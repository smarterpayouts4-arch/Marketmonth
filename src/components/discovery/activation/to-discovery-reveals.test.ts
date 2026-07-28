import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DiscoveryActivationProfile } from "@/lib/discovery/activation-profile";

import { failsFiveCompanyTest } from "./generic-rejection";
import { evaluateInsightEligibility } from "./insight-eligibility";
import { toDiscoveryActivation, wordCount } from "./to-discovery-reveals";
import { REVEAL_LABELS } from "./types";

function grounded(
  overrides: Partial<DiscoveryActivationProfile> = {}
): DiscoveryActivationProfile {
  return {
    brandCore: {
      insight: "Acme helps contractors choose durable drill kits.",
      evidence: [
        {
          text: "Compare kit durability before you buy.",
          kind: "observed",
          confidence: "high",
        },
        {
          text: "The site lists Pro Drill Kit as an offer.",
          kind: "observed",
          confidence: "high",
        },
      ],
      confidence: "high",
    },
    buyerTensions: [
      {
        id: "tension-kit",
        label: "Which kit fits the job",
        explanation: "FAQ language asks which kit fits concrete jobs.",
        evidence: [
          {
            text: "Which kit fits concrete jobs?",
            kind: "observed",
            confidence: "high",
          },
        ],
        confidence: "high",
        recommended: true,
      },
    ],
    leadOffers: [
      {
        id: "offer-drill",
        label: "Pro Drill Kit",
        explanation: "Detected on the website.",
        evidence: [
          {
            text: "The site lists Pro Drill Kit.",
            kind: "observed",
            confidence: "high",
          },
        ],
        confidence: "high",
        recommended: true,
      },
    ],
    growthDirections: [
      {
        id: "growth-compare",
        label: "Own the which-kit decision",
        explanation: "Lead with clear kit comparisons by job type.",
        evidence: [
          {
            text: "Own the which-kit-for-this-job decision with clear comparisons.",
            kind: "observed",
            confidence: "high",
          },
        ],
        confidence: "high",
        recommended: true,
        strategyGoal: "awareness",
      },
    ],
    evidenceQuality: "strong",
    ...overrides,
  };
}

describe("insight eligibility + five-company test", () => {
  it("rejects generic five-company phrases", () => {
    assert.equal(failsFiveCompanyTest("Create educational content."), true);
    assert.equal(failsFiveCompanyTest("Expand to TikTok."), true);
    assert.equal(
      failsFiveCompanyTest(
        "Customers are resolving uncertainty between several plausible choices."
      ),
      false
    );
  });

  it("requires evidence under the reveal", () => {
    const result = evaluateInsightEligibility({
      insight: "Customers buy confidence.",
      observed: [],
      affectsDecision: true,
    });
    assert.equal(result.eligible, false);
  });
});

describe("toDiscoveryActivation (format only)", () => {
  it("uses owner-facing labels and questions", () => {
    const view = toDiscoveryActivation(grounded(), {
      voice: "you",
      businessName: "Acme Tools",
    });
    assert.equal(view.reveals[0]?.label, REVEAL_LABELS["brand-core"]);
    assert.equal(view.reveals[0]?.label, "Customer Value");
    assert.equal(view.reveals[1]?.label, "Buyer Moment");
    assert.equal(view.reveals[3]?.label, "Growth Direction");
    assert.equal(
      view.reveals[0]?.question,
      "Does this capture the value your customers are buying?"
    );
    assert.equal(
      view.reveals[3]?.question,
      "Which idea should shape your content this month?"
    );
    assert.match(view.reveals[2]?.insight ?? "", /Pro Drill Kit/);
  });

  it("formats four reveals from a grounded profile without inventing options", () => {
    const view = toDiscoveryActivation(grounded(), {
      voice: "you",
      businessName: "Acme Tools",
    });
    assert.equal(view.reveals.length, 4);
    assert.equal(view.leadOfferOptions[0]?.label, "Pro Drill Kit");
    assert.equal(view.buyerTensionOptions[0]?.label, "Which kit fits the job");
  });

  it("keeps reveal questions within density targets", () => {
    const view = toDiscoveryActivation(grounded());
    for (const reveal of view.reveals) {
      assert.ok(
        wordCount(reveal.question) <= 14,
        `question too long (${wordCount(reveal.question)}): ${reveal.question}`
      );
    }
  });

  it("surfaces low-evidence clarification instead of fake confidence", () => {
    const view = toDiscoveryActivation(
      grounded({
        brandCore: {
          insight: "Outcome unclear.",
          evidence: [
            {
              text: "Several capabilities are described.",
              kind: "observed",
              confidence: "low",
            },
          ],
          confidence: "low",
          clarification:
            "Your website describes several services, but we could not confidently identify one dominant customer outcome.",
        },
        buyerTensions: [
          {
            id: "tension-fallback",
            label: "Comparing similar options",
            explanation: "Neutral fallback",
            evidence: [
              {
                text: "Could not identify a dominant buyer moment.",
                kind: "observed",
                confidence: "low",
              },
            ],
            confidence: "low",
          },
        ],
        leadOffers: [],
        growthDirections: [
          {
            id: "growth-fallback",
            label: "Clarify the decision",
            explanation: "Neutral starting point.",
            evidence: [
              {
                text: "Low-evidence growth fallback.",
                kind: "observed",
                confidence: "low",
              },
            ],
            confidence: "low",
            strategyGoal: "awareness",
          },
        ],
        evidenceQuality: "low",
      })
    );
    assert.equal(view.headerEvidenceLevel, "low");
    assert.ok(view.reveals[0]?.clarification);
    assert.equal(view.reveals[0]?.insightEligible, false);
    assert.equal(view.leadOfferOptions.length, 0);
  });
});
