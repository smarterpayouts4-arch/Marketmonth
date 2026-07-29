import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StrategyPreviewView } from "@/components/discovery/types";
import { groundedOnlineMarketingStrategySchema } from "@/lib/discovery/strategy.schema";

import { applyInvestmentsToStrategy } from "./strategy-influence";

function baseStrategy(): StrategyPreviewView {
  return {
    strategyThesis: {
      headline: "Generic thesis",
      explanation: "Generic explanation",
      rationale: "Generic rationale",
      evidenceIds: ["e1"],
      confidence: "medium",
    },
    leadOffer: {
      name: "Old offer",
      reason: "Default",
      evidenceIds: ["e1"],
    },
    audienceMessage: {
      message: "Default audience message",
      evidenceIds: ["e1"],
    },
    contentPillars: [
      {
        name: "Understand",
        purpose: "Explain",
        exampleTopics: ["A"],
        evidenceIds: ["e1"],
      },
      {
        name: "Compare",
        purpose: "Compare",
        exampleTopics: ["B"],
        evidenceIds: ["e1"],
      },
      {
        name: "Choose",
        purpose: "Choose",
        exampleTopics: ["C"],
        evidenceIds: ["e1"],
      },
    ],
    channelRoles: [
      {
        channel: "Instagram",
        role: "Primary organic reach",
        status: "detected",
        rationale: "Present on website",
        evidenceIds: ["e1"],
      },
    ],
    firstCampaign: {
      hook: "Hook",
      premise: "Premise",
      formats: [
        { format: "Short video", angle: "A1" },
        { format: "Carousel", angle: "A2" },
        { format: "Article", angle: "A3" },
      ],
      evidenceIds: ["e1"],
    },
    conversionPath: {
      audienceAction: "Learn",
      destination: "Site",
      primaryCta: "Explore",
      rationale: "Rationale",
      evidenceIds: ["e1"],
    },
    postingRhythm: "3 posts",
    keyOpportunity: "Opportunity",
    assumptions: ["Assumption"],
  };
}

describe("strategy influence from DiscoveryInvestments", () => {
  it("changes thesis, pillars, cadence, and channels from investments", () => {
    const next = applyInvestmentsToStrategy(baseStrategy(), {
      cadenceLevel: "consistent",
      channels: ["facebook", "youtube"],
      pillarId: "personalize-the-choice",
      contentDirectionEdit: "Show personal fit around Schedule Board.",
    });

    assert.match(next.strategyThesis.headline, /personal fit/i);
    assert.match(next.leadOffer.name, /personalize/i);
    assert.match(next.postingRhythm, /3 organic posts/i);
    assert.equal(next.channelRoles.length, 2);
    assert.match(next.firstCampaign.premise, /personal fit/i);
  });

  it("maps different cadence levels to different posting rhythms", () => {
    const light = applyInvestmentsToStrategy(baseStrategy(), {
      cadenceLevel: "light",
      channels: ["facebook"],
      pillarId: "build-trust",
    });
    const active = applyInvestmentsToStrategy(baseStrategy(), {
      cadenceLevel: "active",
      channels: ["facebook"],
      pillarId: "compare-clearly",
    });
    assert.match(light.postingRhythm, /2 organic posts/i);
    assert.match(active.postingRhythm, /4–5 organic posts/i);
  });

  it("keeps investment-mutated strategy valid for create-plan schema", () => {
    const next = applyInvestmentsToStrategy(baseStrategy(), {
      cadenceLevel: "consistent",
      channels: ["linkedin", "youtube"],
      pillarId: "decode-the-decision",
      contentDirectionEdit: "y".repeat(280),
    });

    const parsed = groundedOnlineMarketingStrategySchema.safeParse(next);
    assert.equal(
      parsed.success,
      true,
      parsed.success ? "" : JSON.stringify(parsed.error.flatten())
    );
  });
});
