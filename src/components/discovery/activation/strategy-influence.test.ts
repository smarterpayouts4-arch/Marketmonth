import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StrategyPreviewView } from "@/components/discovery/types";
import { groundedOnlineMarketingStrategySchema } from "@/lib/discovery/strategy.schema";

import {
  applyInvestmentsToStrategy,
  buildStrategyInfluence,
} from "./strategy-influence";

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
  it("changes thesis, pillars, and angles from grounded investments", () => {
    const next = applyInvestmentsToStrategy(baseStrategy(), {
      growthDirection: "growth-fit",
      growthThesis: "Show personal fit around Schedule Board.",
      strategyGoal: "leads",
      leadOffer: "Schedule Board",
      buyerTension: "Coordinating appointments across locations",
      brandCoreEdit: "Customers buy schedule clarity",
    });

    assert.match(next.strategyThesis.headline, /personal fit/i);
    assert.equal(next.leadOffer.name, "Schedule Board");
    assert.match(
      next.audienceMessage.message,
      /Coordinating appointments across locations/
    );
    assert.match(next.audienceMessage.message, /schedule clarity/);
    assert.equal(next.contentPillars[0]?.name, "Fit to the person");
    assert.match(
      next.contentPillars[1]?.purpose ?? "",
      /Coordinating appointments/
    );
    assert.ok(next.firstCampaign.formats.length >= 3);
    assert.match(next.firstCampaign.premise, /personal fit/i);

    const influence = buildStrategyInfluence({
      growthDirection: "growth-fit",
      growthThesis: "Show personal fit around Schedule Board.",
      strategyGoal: "leads",
      leadOffer: "Schedule Board",
      buyerTension: "Coordinating appointments across locations",
      brandCoreEdit: "Customers buy schedule clarity",
    });
    assert.ok(influence.some((row) => row.investmentField === "growthDirection"));
    assert.ok(influence.some((row) => row.investmentField === "leadOffer"));
    assert.ok(influence.some((row) => row.investmentField === "buyerTension"));
    assert.ok(influence.some((row) => row.investmentField === "brandCoreEdit"));
  });

  it("maps different strategy goals to different pillar names", () => {
    const awareness = applyInvestmentsToStrategy(baseStrategy(), {
      growthDirection: "growth-a",
      growthThesis: "Clarify the decision for buyers.",
      strategyGoal: "awareness",
    });
    const sales = applyInvestmentsToStrategy(baseStrategy(), {
      growthDirection: "growth-b",
      growthThesis: "Explain value in context.",
      strategyGoal: "sales",
    });
    assert.equal(awareness.contentPillars[0]?.name, "Clarify the choice");
    assert.equal(sales.contentPillars[0]?.name, "Value with context");
    assert.notEqual(
      awareness.strategyThesis.headline,
      sales.strategyThesis.headline
    );
  });

  it("keeps investment-mutated strategy valid for create-plan schema", () => {
    const longTension = "x".repeat(200);
    const longCore = "y".repeat(280);
    const longLead =
      "Lead offer with a deliberately long promotional name for the first campaign";

    const next = applyInvestmentsToStrategy(baseStrategy(), {
      growthDirection: "growth-fit",
      growthThesis: "Show personal fit for the lead offer.",
      strategyGoal: "leads",
      leadOffer: longLead,
      buyerTension: longTension,
      brandCoreEdit: longCore,
    });

    const parsed = groundedOnlineMarketingStrategySchema.safeParse(next);
    assert.equal(
      parsed.success,
      true,
      parsed.success ? "" : JSON.stringify(parsed.error.flatten())
    );
  });
});
