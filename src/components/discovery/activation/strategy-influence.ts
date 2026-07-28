import type { StrategyPreviewView } from "@/components/discovery/types";

import type {
  DiscoveryInvestments,
  StrategyInfluence,
} from "./types";

/**
 * Apply stored investments onto a strategy preview so user choices have
 * visible, testable consequences. Pure — no network.
 */
export function applyInvestmentsToStrategy(
  strategy: StrategyPreviewView,
  investments: DiscoveryInvestments
): StrategyPreviewView {
  const thesisLine =
    investments.growthThesis?.trim() ||
    strategy.strategyThesis.headline;
  const lead =
    investments.leadOffer?.trim() || strategy.leadOffer.name;
  const tension = investments.buyerTension?.trim();
  const core = investments.brandCoreEdit?.trim();
  const goal = investments.strategyGoal;

  const pillars = strategy.contentPillars.map((pillar, index) => {
    if (index === 0) {
      if (goal === "awareness") {
        return {
          ...pillar,
          name: "Clarify the choice",
          purpose:
            "Help buyers move from confusion to a confident decision among similar options.",
          exampleTopics: [
            "Why this option vs that one",
            "What changes with your constraints",
            ...(pillar.exampleTopics.slice(0, 1) || []),
          ].slice(0, 3),
        };
      }
      if (goal === "leads") {
        return {
          ...pillar,
          name: "Fit to the person",
          purpose:
            "Show how recommendations change with goals, restrictions, and preferences.",
          exampleTopics: [
            "When constraints change the shortlist",
            "Goals that reshape the recommendation",
            ...(pillar.exampleTopics.slice(0, 1) || []),
          ].slice(0, 3),
        };
      }
      if (goal === "sales") {
        return {
          ...pillar,
          name: "Value with context",
          purpose:
            "Teach suitability and price together—not price as the only signal.",
          exampleTopics: [
            "When a higher price is worth it",
            "Comparing cost against fit",
            ...(pillar.exampleTopics.slice(0, 1) || []),
          ].slice(0, 3),
        };
      }
    }
    if (index === 1 && tension) {
      return {
        ...pillar,
        purpose: `Address buyers facing: ${tension}.`,
        exampleTopics: [tension, ...pillar.exampleTopics].slice(0, 3),
      };
    }
    return pillar;
  });

  const audienceMessage = tension
    ? {
        ...strategy.audienceMessage,
        message: `For people dealing with “${tension}”: ${
          core || strategy.audienceMessage.message
        }`.slice(0, 220),
      }
    : core
      ? {
          ...strategy.audienceMessage,
          message: core.slice(0, 220),
        }
      : strategy.audienceMessage;

  const angles = buildContentAngles(goal, tension, lead, thesisLine);

  return {
    ...strategy,
    strategyThesis: {
      ...strategy.strategyThesis,
      headline: thesisLine.slice(0, 160),
      explanation: [
        thesisLine,
        core ? `Positioning locked as: ${core}` : null,
        tension ? `Primary buyer tension: ${tension}.` : null,
        `Lead offer: ${lead}.`,
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 400),
      rationale:
        "Shaped by your discovery investments (direction, offer, and optional refinements).",
    },
    leadOffer: {
      ...strategy.leadOffer,
      name: lead.slice(0, 80),
      reason: `Selected as the first thing to promote from discovery investments.`,
    },
    audienceMessage,
    contentPillars: pillars,
    firstCampaign: {
      ...strategy.firstCampaign,
      premise: `${thesisLine} Series leads with ${lead}.${
        tension ? ` Tension: ${tension}.` : ""
      }`.slice(0, 280),
      formats: angles.map((angle, i) => ({
        format: strategy.firstCampaign.formats[i]?.format ?? "Short video",
        angle,
      })),
    },
    keyOpportunity: thesisLine.slice(0, 220),
  };
}

function buildContentAngles(
  goal: DiscoveryInvestments["strategyGoal"],
  tension: string | undefined,
  lead: string,
  thesis: string
): string[] {
  const base =
    goal === "awareness"
      ? [
          "Side-by-side: why this option fits",
          "One misconception that blocks a clear choice",
          "Decision checklist before you buy",
        ]
      : goal === "leads"
        ? [
            "How preferences change the shortlist",
            "Same category, different constraints",
            "Walkthrough: goals → recommendation",
          ]
        : goal === "sales"
          ? [
              "Suitability vs price—what actually matters",
              "When paying more is rational",
              "Compare cost against the outcome you need",
            ]
          : [
              thesis.slice(0, 80),
              `Lead with ${lead}`,
              "Deepen the relationship after the first win",
            ];

  if (tension) {
    return [`For “${tension}”: lead with ${lead}`, ...base].slice(0, 5);
  }
  return base;
}

/** Debug/QA trace: which investment fields touch which outputs. */
export function buildStrategyInfluence(
  investments: DiscoveryInvestments
): StrategyInfluence[] {
  const rows: StrategyInfluence[] = [
    {
      investmentField: "growthDirection",
      selectedValue: investments.growthDirection,
      affectedOutputs: [
        "strategyThesis.headline",
        "strategyThesis.explanation",
        "contentPillars[0]",
        "firstCampaign.premise",
        "firstCampaign.formats",
        "keyOpportunity",
      ],
    },
  ];

  if (investments.leadOffer?.trim()) {
    rows.push({
      investmentField: "leadOffer",
      selectedValue: investments.leadOffer,
      affectedOutputs: ["leadOffer.name", "leadOffer.reason", "firstCampaign.premise"],
    });
  }
  if (investments.buyerTension?.trim()) {
    rows.push({
      investmentField: "buyerTension",
      selectedValue: investments.buyerTension,
      affectedOutputs: [
        "audienceMessage.message",
        "contentPillars[1]",
        "firstCampaign.formats",
      ],
    });
  }
  if (investments.brandCoreEdit?.trim()) {
    rows.push({
      investmentField: "brandCoreEdit",
      selectedValue: investments.brandCoreEdit,
      affectedOutputs: [
        "audienceMessage.message",
        "strategyThesis.explanation",
      ],
    });
  }

  return rows;
}
