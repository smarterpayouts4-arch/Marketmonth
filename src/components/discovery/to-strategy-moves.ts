import type {
  StrategyIntentAnswers,
  StrategyMoveView,
  StrategyPreviewView,
} from "@/components/discovery/types";

import { truncateAtSentence } from "@/components/discovery/to-card-summary/text";

const GOAL_VERB: Record<StrategyIntentAnswers["goal"], string> = {
  awareness: "build recognition and trust around",
  leads: "turn interest into qualified visits for",
  sales: "move comparison-ready buyers toward",
  loyalty: "deepen repeat engagement around",
};

const REACH_FRAME: Record<StrategyIntentAnswers["reach"], string> = {
  local: "local audiences",
  national: "national audiences with repeatable education",
  online_broad: "global audiences through searchable and short-form content",
};

/** Exceptional length only — ordinary moves scroll fully in-card. */
const MOVE_HEADLINE_MAX = 120;
const MOVE_BODY_MAX = 420;

function moveField(
  full: string,
  max: number
): { preview: string; full: string; overflow: boolean } {
  const cleaned = full.replace(/\s+/g, " ").trim();
  if (!cleaned) return { preview: "", full: "", overflow: false };
  const truncated = truncateAtSentence(cleaned, max);
  return {
    preview: truncated.text,
    full: cleaned,
    overflow: truncated.wasTruncated,
  };
}

/** Pure presentation helper — no AI, fetch, or server imports. */
export function toStrategyMoves(
  strategy: StrategyPreviewView,
  intent: StrategyIntentAnswers
): StrategyMoveView[] {
  const offer = intent.promoteFirst || strategy.leadOffer.name;
  const channels = strategy.channelRoles
    .slice(0, 3)
    .map((c) => c.channel)
    .join(", ");
  const place =
    intent.reach === "local" && intent.targetLocation?.trim()
      ? intent.targetLocation.trim()
      : null;

  const directionLine =
    intent.growthDirection === "personalized_fit"
      ? "personalized fit and adaptive recommendations"
      : intent.growthDirection === "better_value"
        ? "better-value decisions (suitability with price)"
        : intent.growthDirection === "confidence"
          ? "confidence-building comparisons"
          : null;

  const move1BodyFull = directionLine
    ? `Lead with ${offer} through ${directionLine} — grounded in what your site already promotes${
        intent.buyerTension ? ` and the tension “${intent.buyerTension}”` : ""
      }.`
    : `Lead with ${offer} to ${GOAL_VERB[intent.goal]} your brand — grounded in what your site already promotes.`;
  const move2BodyFull = place
    ? `Reach ${place} through ${channels || "organic channels"}, using detected profiles as starting points — not performance claims.`
    : `Reach ${REACH_FRAME[intent.reach]} via ${channels || "organic channels"}, testing roles without claiming engagement wins.`;
  const move3BodyFull = `Guide people to ${strategy.conversionPath.audienceAction} → ${strategy.conversionPath.destination} with “${strategy.conversionPath.primaryCta}”.`;

  const h1 = moveField(
    directionLine ? `Lead with ${offer} (${directionLine})` : `Lead with ${offer}`,
    MOVE_HEADLINE_MAX
  );
  const b1 = moveField(move1BodyFull, MOVE_BODY_MAX);
  const h2 = moveField(
    place ? `Reach ${place} organically` : `Reach ${REACH_FRAME[intent.reach]}`,
    MOVE_HEADLINE_MAX
  );
  const b2 = moveField(move2BodyFull, MOVE_BODY_MAX);
  const h3 = moveField("Convert with a clear next step", MOVE_HEADLINE_MAX);
  const b3 = moveField(move3BodyFull, MOVE_BODY_MAX);

  return [
    {
      number: 1,
      headline: h1.preview,
      body: b1.preview,
      headlineFull: h1.full,
      bodyFull: b1.full,
      overflow: h1.overflow || b1.overflow,
    },
    {
      number: 2,
      headline: h2.preview,
      body: b2.preview,
      headlineFull: h2.full,
      bodyFull: b2.full,
      overflow: h2.overflow || b2.overflow,
    },
    {
      number: 3,
      headline: h3.preview,
      body: b3.preview,
      headlineFull: h3.full,
      bodyFull: b3.full,
      overflow: h3.overflow || b3.overflow,
    },
  ];
}

/** Richer strategy detail that belongs in the Sheet, not mid-sentence clamps. */
export function hasRichStrategyDetail(strategy: StrategyPreviewView): boolean {
  const explanation = strategy.strategyThesis.explanation?.trim() ?? "";
  const rationale = strategy.strategyThesis.rationale?.trim() ?? "";
  const premise = strategy.firstCampaign.premise?.trim() ?? "";
  return (
    explanation.length > 160 ||
    rationale.length > 120 ||
    premise.length > 100 ||
    strategy.contentPillars.length > 0
  );
}

export function reachLabel(reach: StrategyIntentAnswers["reach"]): string {
  if (reach === "online_broad") return "Global";
  if (reach === "national") return "National";
  return "Local";
}

export function goalLabel(goal: StrategyIntentAnswers["goal"]): string {
  if (goal === "loyalty") return "Customer loyalty";
  return goal.charAt(0).toUpperCase() + goal.slice(1);
}
