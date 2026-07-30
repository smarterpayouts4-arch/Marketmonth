import {
  TOPIC_CATEGORY_DEFINITIONS,
  topicCategoryPurposeLine,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import { buildCraftClause } from "@/brain/craft";
import type { PromptVariant } from "@/brain/policy/prompt-experiments";

const SHARED_RULES = [
  "You generate marketing topic candidates for a content strategy tool.",
  "You are given a company's own observed evidence. You may ONLY write topics that the supplied evidence can support.",
  "",
  "GROUNDING RULES",
  "- Every candidate must cite at least one evidenceRef id from the supplied evidence lines.",
  "- Every product name, label phrase, or fact in the title must appear in the evidence you cite.",
  "- Never introduce a number, percentage, price, study, certification, or date that is not in the evidence.",
  "- Never claim the brand sells, stocks, or recommends anything unless the evidence says so.",
  "",
  "REGULATED-CLAIM RULES",
  "- Never state or imply that a product treats, cures, prevents, heals, boosts, or fixes any health condition or outcome.",
  "- Never write 'X for sleep', 'X for immunity', 'X for energy' style benefit promises without label-deconstruction framing.",
  "- Never imply that research, studies, or science prove an effect.",
  "- You MAY deconstruct the brand's own label language and teach comparison mechanics grounded in evidence.",
  "",
  buildCraftClause("topic_title"),
  "",
  "PROHIBITED",
  "- No internal SEO or ops instructions.",
  "- No superlatives: best, worst, guaranteed, miracle, secret, toxic, dangerous.",
  "- No invented audience segments.",
  "",
  'Return JSON only: { "candidates": [ { "title", "strategicAngle", "whyItFits", "evidenceRefs", "hook?", "audienceQuestion?", "suggestedFormats?", "platformFit?", "funnelRole?", "itchType?", "confidence?" } ] }',
].join("\n");

function categoryBlock(id: TopicCategoryId): string {
  const def = TOPIC_CATEGORY_DEFINITIONS[id];
  return [
    `CATEGORY: ${def.label}`,
    `PURPOSE: ${topicCategoryPurposeLine(id)}`,
    `HINT: ${def.hint}`,
  ].join("\n");
}

/**
 * Variant B (P3.1 prompt A/B): sharper specificity emphasis. Version is
 * stamped as "<registry version>+exp-b" so runs stay attributable.
 */
const VARIANT_B_EMPHASIS = [
  "VARIANT EMPHASIS",
  "- Prefer sharply specific titles that name one concrete evidence detail over broad category framings.",
  "- Draft the audienceQuestion first, then write the title as the answer to that exact itch.",
  "- If two candidates lean on the same evidence line, replace one with a different cited line.",
].join("\n");

export function buildTopicCandidatesSystemInstruction(
  categoryId: TopicCategoryId,
  variant: PromptVariant = "control"
): string {
  const parts = [SHARED_RULES, "", categoryBlock(categoryId)];
  if (variant === "b") {
    parts.push("", VARIANT_B_EMPHASIS);
  }
  return parts.join("\n");
}
