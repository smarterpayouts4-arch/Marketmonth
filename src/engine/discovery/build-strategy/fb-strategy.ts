import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import type { GroundedOnlineMarketingStrategy } from "@/lib/discovery/strategy.schema";

import type { BrandProfile, StrategyIntent } from "../brand-profile";

function idsFor(
  evidence: DiscoveryEvidence[],
  fields: string[],
  fallbackIds: string[]
): string[] {
  const matched = evidence
    .filter((e) => fields.some((f) => e.field === f || e.field.startsWith(f)))
    .map((e) => e.id);
  return (matched.length ? matched : fallbackIds).slice(0, 4);
}

export function fallbackStrategy(
  profile: BrandProfile,
  intent: StrategyIntent,
  evidence: DiscoveryEvidence[] = []
): GroundedOnlineMarketingStrategy {
  const allIds = evidence.map((e) => e.id);
  const seedIds =
    allIds.length > 0
      ? allIds.slice(0, 3)
      : ["fallback-intent", "fallback-profile", "fallback-offer"];

  const offerIds = idsFor(
    evidence,
    ["intent.promoteFirst", "productsServices", "websiteCta"],
    seedIds
  );
  const audienceIds = idsFor(
    evidence,
    ["intent.reach", "intent.goal", "positioning", "customerProblems"],
    seedIds
  );
  const topicIds = idsFor(
    evidence,
    ["educationalTopics", "ownedTopics", "customerProblems"],
    seedIds
  );

  const present = profile.socialProfiles.filter((s) => s.status === "present");
  const detectedChannels = present.slice(0, 2).map((s) => ({
    channel: s.platform,
    role:
      s.platform === "youtube"
        ? "Searchable education"
        : s.platform === "linkedin"
          ? "Credibility and buyer guidance"
          : "Organic storytelling and offer awareness",
    status: "detected" as const,
    rationale: `Detected public profile link on the website for ${s.platform}.`,
    evidenceIds: idsFor(evidence, [`social.${s.platform}`], seedIds),
  }));

  const recommended =
    detectedChannels.length >= 3
      ? []
      : [
          {
            channel: intent.reach === "local" ? "facebook" : "youtube",
            role:
              intent.reach === "local"
                ? "Practical local buyer guidance"
                : "Searchable education for comparison shoppers",
            status: "recommended_test" as const,
            rationale:
              "We recommend testing this channel for organic content aligned to your offer — not because analytics prove demand.",
            evidenceIds: offerIds,
          },
        ];

  const channelRoles = [...detectedChannels, ...recommended].slice(0, 3);
  const leadName =
    intent.promoteFirst.slice(0, 80) ||
    profile.products[0] ||
    profile.services[0] ||
    "Core offer";

  const direction = intent.growthDirection;
  const thesisByDirection =
    intent.growthThesis?.trim() ||
    (direction === "personalized_fit" || direction?.includes("fit")
      ? `Emphasize personalized fit around ${leadName}—show how recommendations change with needs and preferences.`
      : direction === "better_value" || direction?.includes("value")
        ? `Teach better-value decisions around ${leadName}: suitability and price together, not price alone.`
        : direction === "confidence" || direction?.includes("clarif")
          ? `Lead with confidence-building comparisons around ${leadName} so buyers can choose clearly.`
          : `Help ${profile.audience.slice(0, 60) || "your audience"} move from confusion to confident action around ${leadName}.`);

  const pillarOne =
    intent.goal === "leads" ||
    direction === "personalized_fit" ||
    direction?.includes("fit")
      ? {
          name: "Fit to the person",
          purpose:
            "Show how recommendations change with goals, restrictions, and preferences.",
          exampleTopics: [
            "When constraints change the shortlist",
            "Goals that reshape the recommendation",
          ],
        }
      : intent.goal === "sales" ||
          direction === "better_value" ||
          direction?.includes("value")
        ? {
            name: "Value with context",
            purpose:
              "Teach suitability and price together—not price as the only signal.",
            exampleTopics: [
              "When a higher price is worth it",
              "Comparing cost against fit",
            ],
          }
        : {
            name:
              intent.goal === "awareness" ||
              direction === "confidence" ||
              direction?.includes("clarif")
                ? "Clarify the choice"
                : "Understand",
            purpose:
              intent.goal === "awareness" || direction === "confidence"
                ? "Help buyers move from confusion to a confident decision among similar options."
                : "Explain the problems and questions buyers already ask.",
            exampleTopics: (
              profile.products.slice(0, 2).length
                ? profile.products.slice(0, 2)
                : ["How it works", "Common mistakes"]
            ).map((t) => t.slice(0, 60)),
          };

  const audienceBase =
    intent.brandCoreEdit?.slice(0, 160) ||
    profile.valueProposition.slice(0, 160) ||
    `Make ${leadName} easier to understand, compare, and choose.`;
  const audienceMessage = intent.buyerTension
    ? `For people dealing with “${intent.buyerTension}”: ${audienceBase}`.slice(
        0,
        220
      )
    : audienceBase;

  return {
    strategyThesis: {
      headline: thesisByDirection.slice(0, 160),
      explanation: [
        `Use organic content to clarify ${leadName}, then guide people to a clear next step on your site.`,
        intent.buyerTension
          ? `Primary buyer tension: ${intent.buyerTension}.`
          : null,
        intent.brandCoreEdit
          ? `Positioning refinement: ${intent.brandCoreEdit}.`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 400),
      rationale:
        "Built from website positioning, offer language, and the discovery investments you confirmed.",
      evidenceIds: audienceIds,
      confidence: evidence.length ? "medium" : "low",
    },
    leadOffer: {
      name: leadName,
      reason: `You selected this as the first thing to promote; website offer language supports leading with it.`,
      evidenceIds: offerIds,
    },
    audienceMessage: {
      message: audienceMessage,
      evidenceIds: audienceIds,
    },
    contentPillars: [
      {
        ...pillarOne,
        exampleTopics: pillarOne.exampleTopics.slice(0, 3),
        evidenceIds: topicIds,
      },
      {
        name: "Compare",
        purpose: intent.buyerTension
          ? `Address buyers facing: ${intent.buyerTension}.`
          : "Help people evaluate options without overwhelm.",
        exampleTopics: intent.buyerTension
          ? [intent.buyerTension.slice(0, 60), "Trade-offs that matter"]
          : ["What to look for", "Trade-offs that matter"],
        evidenceIds: offerIds,
      },
      {
        name: "Choose",
        purpose: "Connect education to a confident next step.",
        exampleTopics: ["How to get started", "What happens next"],
        evidenceIds: offerIds,
      },
    ],
    channelRoles,
    firstCampaign: {
      hook: `The easiest choice for ${leadName} is rarely the most obvious one.`,
      premise: `Start a short organic series that teaches one comparison idea, then points to ${leadName}.`,
      formats: [
        { format: "Short video", angle: "One misconception, one clear fix" },
        { format: "Instagram carousel", angle: "Side-by-side comparison points" },
        { format: "YouTube topic", angle: "Deep-dive explainer" },
        { format: "LinkedIn post", angle: "Buyer decision takeaway" },
        { format: "Article", angle: "Long-form guide with CTA" },
      ].slice(0, 5),
      evidenceIds: topicIds,
    },
    conversionPath: {
      audienceAction: `Learn enough to evaluate ${leadName}`,
      destination: leadName,
      primaryCta:
        profile.marketingOpportunity.includes("Explore") ||
        /explore|find|compare/i.test(leadName)
          ? `Find the right option with ${leadName}`
          : `Explore ${leadName}`,
      rationale:
        "Educational content should lead somewhere specific — your primary offer experience — not stop at awareness.",
      evidenceIds: offerIds,
    },
    postingRhythm:
      intent.goal === "awareness"
        ? "4–5 organic posts per week across 2–3 channels"
        : "3–4 organic posts per week across 2–3 channels",
    keyOpportunity: profile.marketingOpportunity.slice(0, 220),
    assumptions: [
      "Website copy reflects the offer you want to promote first.",
      "Detected social links are public profiles, not performance proof.",
      "No third-party review or engagement data was used.",
    ].slice(0, 3),
  };
}
