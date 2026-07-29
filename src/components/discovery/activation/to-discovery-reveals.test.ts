import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";

import { REVEAL_LABELS } from "./types";
import { toDiscoveryActivation, wordCount } from "./to-discovery-reveals";

function sampleNarrative(
  overrides: Partial<SocialDiscoveryProfile> = {}
): SocialDiscoveryProfile {
  const evidence = [
    {
      field: "valueProposition",
      sourceUrl: "https://example.com",
      evidenceType: "observed" as const,
      confidence: "high" as const,
      excerpt: "Clear offer language",
    },
  ];
  return {
    businessName: "Acme",
    introHeadline: "Your website gives us a strong foundation.",
    introDescription: "We found a social-media story inside the business.",
    sections: [
      {
        id: "doing-well",
        label: "What You’re Doing Well",
        subheading: "Business strength",
        headline: "You already have a repeatable story worth sharing.",
        bullets: [
          {
            text: "Acme helps customers with a clear offer.",
            classification: "observed",
            evidence,
          },
        ],
        reveal: "Clarity is the foundation.",
        transition: "Next, where you can win.",
      },
      {
        id: "win",
        label: "Where You Can Win",
        subheading: "Opportunity",
        headline: "Become the brand people remember when choices feel hard.",
        bullets: [
          {
            text: "Customers face too many options.",
            classification: "inferred",
            evidence,
          },
        ],
        reveal: "Own one useful idea.",
        transition: "Next, the content play.",
      },
      {
        id: "content-play",
        label: "Your Content Play",
        subheading: "System",
        headline: "Build one monthly idea, then expand it.",
        bullets: [
          {
            text: "Publish a connected series.",
            classification: "recommended",
            evidence,
          },
        ],
        reveal: "Market Month can turn this into a monthly system.",
      },
    ],
    contentPillars: [
      {
        id: "compare-clearly",
        name: "Compare clearly",
        description: "Help people evaluate options.",
        evidence,
      },
    ],
    platformAdaptations: [
      {
        platform: "facebook",
        status: "link-detected",
        formats: ["practical education"],
        guidance: "Your website already links to Facebook.",
        classification: "observed",
      },
    ],
    detectedChannels: [
      { platform: "facebook", status: "link-detected" },
      { platform: "instagram", status: "link-not-detected" },
    ],
    cadence: {
      level: "consistent",
      label: "Consistent: one post every two to three days",
      postsPerWeekRange: [3, 3],
      description: "Recommended by Market Month.",
      rationale: ["Enough topic variety"],
      classification: "recommended",
    },
    contentUniversePreview: {
      coreTopic: "How to choose with confidence",
      strategicPurpose: "Reinforce clarity",
      audienceProblem: "Too many options",
      pieces: [
        {
          dayOffset: 1,
          platform: "facebook",
          format: "Short video",
          hook: "Start with the confusion.",
          angle: "One sharp problem",
          objective: "awareness",
          evidenceRefs: ["e1"],
        },
      ],
    },
    finalDirection: "Make Acme known for clarity.",
    investmentQuestion: "How consistently should we build your plan?",
    primaryCta: "Build my content month",
    secondaryCta: "Try another website",
    evidenceQuality: "strong",
    ...overrides,
  };
}

describe("toDiscoveryActivation (format only)", () => {
  it("uses three owner-facing section labels", () => {
    const view = toDiscoveryActivation(sampleNarrative());
    assert.equal(view.reveals.length, 3);
    assert.equal(view.reveals[0]?.label, REVEAL_LABELS["doing-well"]);
    assert.equal(view.reveals[1]?.label, REVEAL_LABELS.win);
    assert.equal(view.reveals[2]?.label, REVEAL_LABELS["content-play"]);
  });

  it("formats three reveals without inventing options", () => {
    const view = toDiscoveryActivation(sampleNarrative());
    assert.equal(view.narrative.contentPillars.length, 1);
    assert.equal(view.narrative.cadence.level, "consistent");
    assert.ok(view.reveals.every((r) => r.evidence.length >= 1));
    assert.ok(view.reveals.every((r) => r.evidenceItems.length >= 1));
    assert.ok(
      view.reveals.every((r) =>
        r.evidenceItems.every((item) => item.title.trim() && item.summary.trim())
      )
    );
  });

  it("keeps reveal questions within density targets", () => {
    const view = toDiscoveryActivation(sampleNarrative());
    for (const reveal of view.reveals) {
      assert.ok(
        wordCount(reveal.question) <= 22,
        `question too long (${wordCount(reveal.question)}): ${reveal.question}`
      );
    }
  });

  it("surfaces low-evidence clarification instead of fake confidence", () => {
    const view = toDiscoveryActivation(
      sampleNarrative({ evidenceQuality: "low" })
    );
    assert.equal(view.headerEvidenceLevel, "low");
    assert.ok(view.reveals[0]?.clarification);
  });
});
