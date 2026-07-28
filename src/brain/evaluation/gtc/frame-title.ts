import {
  MARKETING_FOCUS_LABELS,
  type MarketingFocus,
} from "@/brain/content/marketing-focus";
import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicSeed } from "../objective-topic-strategies";
import { isMetaInstructionalPhrase } from "../topic-meta";
import {
  clamp,
  isGenericDecisionTitle,
  naturalCategoryNoun,
} from "./text";

export type FramedCandidate = {
  title: string;
  strategicAngle: string;
  relevanceReasons: string[];
  seed: TopicSeed;
  objective: MarketingFocus;
};

export function frameTitle(
  seed: TopicSeed,
  context: ContentBrainContext,
  objective: MarketingFocus
): Omit<FramedCandidate, "seed" | "objective"> | null {
  const brand = context.brandName;
  const subject = clamp(seed.subject, 56);
  const shortSub = clamp(
    seed.subjectType === "product_category"
      ? naturalCategoryNoun(seed.subject)
      : seed.subject,
    40
  );
  let title = "";
  let angle = seed.frameHint;

  // Help/Helping leads — clean educational fallback for any frameHint
  if (
    /^(Help|Helping)\b/i.test(seed.subject.trim()) ||
    /^(Help|Helping)\b/i.test(shortSub)
  ) {
    title = clamp(
      "What shoppers should compare across supplement brands",
      90
    );
    if (!isMetaInstructionalPhrase(title) && !isGenericDecisionTitle(title)) {
      return {
        title,
        strategicAngle: "Audience / comparison clarity",
        relevanceReasons: [
          `${MARKETING_FOCUS_LABELS[objective]} framing`,
          `Subject kind: ${seed.subjectType}`,
          "Help-imperative subject rewritten to educational frame",
        ].slice(0, 3),
      };
    }
  }

  switch (seed.frameHint) {
    case "category_recognition":
      title = `A simpler way to approach ${shortSub}`;
      angle = "Category recognition";
      break;
    case "meet_brand":
      title = `Meet ${brand}: helping people navigate with clarity`;
      angle = "Platform introduction";
      break;
    case "category_intro":
      title = `What ${shortSub} shoppers should know first`;
      angle = "Category introduction";
      break;
    case "audience_recognition":
      title = clamp(`Recognizing the need: ${shortSub}`, 90);
      angle = "Audience recognition";
      break;
    case "platform_in_category":
      title = `How ${brand} shows up when people need ${shortSub}`;
      angle = "Brand in category";
      break;
    case "why_brand":
      title = clamp(`Why ${brand}: ${shortSub}`, 90);
      angle = "Differentiation claim";
      break;
    case "clarity_outcome":
      title = `How ${brand} makes the next step clearer`;
      angle = "Clarity value";
      break;
    case "capability_value":
      title = `Why ${shortSub} matters for ${brand} shoppers`;
      angle = "Capability value";
      break;
    case "uncertainty_reduction":
      title = clamp(`Reducing guesswork around ${shortSub}`, 90);
      angle = "Uncertainty reduction";
      break;
    case "product_guide":
      if (seed.sourceType === "industry_research") {
        title =
          seed.subjectType === "ingredient_or_component"
            ? clamp(
                `What shoppers should compare on ${shortSub} supplement labels`,
                90
              )
            : clamp(`What to know about ${shortSub} before you buy`, 90);
      } else {
        title =
          seed.subjectType === "product_category"
            ? `What to know about ${shortSub} before you buy`
            : `A practical guide to ${shortSub}`;
      }
      angle = "Product guide";
      break;
    case "evaluate_product":
      title =
        seed.sourceType === "industry_research"
          ? clamp(
              `How shoppers evaluate ${shortSub} before buying (category education)`,
              90
            )
          : `How to evaluate ${shortSub} before buying`;
      angle = "Evaluation guide";
      break;
    case "attribute_education": {
      if (/^(How|What|Questions)\b/i.test(subject)) {
        title = clamp(subject, 90);
      } else if (/^Comparing\b/i.test(subject)) {
        title = clamp(
          subject.replace(
            /^Comparing\b/i,
            "What shoppers should compare when looking at"
          ),
          90
        );
      } else if (/price per serving/i.test(subject)) {
        title = clamp(
          "Why price per serving matters when comparing supplements",
          90
        );
      } else if (
        /^(Help|Helping)\b/i.test(subject) ||
        /shoppers compare/i.test(subject)
      ) {
        title = clamp(
          "What shoppers should compare across supplement brands",
          90
        );
      } else {
        title = clamp(`What to know about ${shortSub}`, 90);
      }
      angle = "Attribute education";
      break;
    }
    case "category_education":
      title = `Understanding ${shortSub} before you compare options`;
      angle = "Category education";
      break;
    case "decision_checklist":
      title = clamp(
        subject.match(/^(How|What|Questions)/i)
          ? subject
          : `Checks before deciding on ${shortSub}`,
        90
      );
      angle = "Decision checklist";
      break;
    case "tradeoff_frame":
      title = `Trade-offs to weigh when ${clamp(shortSub, 45)}`;
      angle = "Trade-off frame";
      break;
    case "compare_criteria":
      title = clamp(
        subject.match(/^(How|What|Comparing)/i)
          ? subject
          : `What matters when comparing ${shortSub}`,
        90
      );
      angle = "Comparison criteria";
      break;
    case "transparency":
      title = clamp(
        `What ${brand} will and will not claim about ${shortSub}`,
        90
      );
      angle = "Transparency";
      break;
    case "method_limits":
      title = clamp(`How ${brand} stays credible: ${shortSub}`, 90);
      angle = "Method and limits";
      break;
    case "credibility_position":
      title = `Why trust matters when choosing with ${brand}`;
      angle = "Credibility";
      break;
    default:
      title = clamp(`${MARKETING_FOCUS_LABELS[objective]}: ${shortSub}`, 90);
      angle = "Framed topic";
  }

  title = clamp(title, 90);
  if (!title || isMetaInstructionalPhrase(title) || isGenericDecisionTitle(title)) {
    return null;
  }
  if (
    objective === "product_education" &&
    seed.subjectType === "platform_capability"
  ) {
    return null;
  }

  return {
    title,
    strategicAngle: angle,
    relevanceReasons: [
      `${MARKETING_FOCUS_LABELS[objective]} framing`,
      `Subject kind: ${seed.subjectType}`,
      seed.classificationReason,
    ].slice(0, 3),
  };
}

export function frameCandidates(
  seeds: TopicSeed[],
  context: ContentBrainContext,
  objective: MarketingFocus
): FramedCandidate[] {
  const out: FramedCandidate[] = [];
  for (const seed of seeds) {
    const framed = frameTitle(seed, context, objective);
    if (!framed) continue;
    out.push({ ...framed, seed, objective });
  }
  return out;
}
