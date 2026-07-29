import type { TopicCategoryId } from "@/brain/content/topic-category";
import { audienceLineForContext } from "@/brain/content/audience-label";
import type { ContentBrainContext } from "@/brain/content/types";

import {
  applyTopicTitleHooks,
  assembleCandidateResult,
  frameCandidates,
  scoreCandidates,
} from "./gtc";
import type { ValidatedLlmTopicCandidate } from "./gtc/llm-candidates";
import { mapLlmCandidatesToFramed } from "./gtc/llm-candidates";
import {
  collectIndustryOpportunities,
  industryOpportunitiesToSubjects,
  type IndustryResearchOpportunity,
} from "./industry-research";
import { buildObjectiveTopicSeeds } from "./objective-topic-strategies";
import type { TopicCandidateGenerationResult } from "./topic-candidate-types";

export { isMetaInstructionalPhrase } from "./topic-meta";
export { customerFacingOpportunities } from "./topic-meta";
export {
  classifyContextSubjects,
  extractPlatformCapabilities,
  extractProductSubjects,
  extractComparisonAttributes,
  extractAudienceProblems,
} from "./topic-subject";
export {
  categoryTopicStrategies,
  buildObjectiveTopicSeeds,
} from "./objective-topic-strategies";

function audienceLine(context: ContentBrainContext): string {
  return audienceLineForContext({
    audience: context.audience,
    brandName: context.brandName,
  });
}

function industryResearchDisabled(): boolean {
  return (
    process.env.INDUSTRY_RESEARCH_ENABLED?.trim().toLowerCase() === "false"
  );
}

/**
 * Sole automatic topic-candidate generator (public entry).
 * Returns complete (6), limited (1–5), or insufficient_context — never pads limited to six.
 * Does not write topic-use history.
 *
 * Industry research may supply typed opportunities → subjects/seeds only.
 * It never produces TopicCandidate / catalog_product / completeness directly.
 */
export function generateTopicCandidates(args: {
  context: ContentBrainContext;
  objective: TopicCategoryId;
  recentTitles?: string[];
  /** Live Perplexity opportunities (already validated). Optional. */
  industryOpportunities?: IndustryResearchOpportunity[];
  /** When false, skip industry subjects even if present on context. */
  includeIndustryResearch?: boolean;
  /**
   * Pre-validated LLM candidates. When non-empty they lead the slate;
   * deterministic drafts top up remaining distinct-support slots.
   */
  llmCandidates?: ValidatedLlmTopicCandidate[];
}): TopicCandidateGenerationResult {
  const { context, objective } = args;
  const recentKeys = new Set(
    (args.recentTitles ?? [])
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );
  const audience = audienceLine(context);

  const includeIndustry =
    args.includeIndustryResearch !== false && !industryResearchDisabled();

  const industrySubjects = includeIndustry
    ? industryOpportunitiesToSubjects(
        collectIndustryOpportunities(context, args.industryOpportunities),
        context
      )
    : [];

  if (args.llmCandidates?.length) {
    const llmFramed = mapLlmCandidatesToFramed({
      candidates: args.llmCandidates,
      context,
      objective,
    });
    // Partial-accept + deterministic top-up: a short LLM slate no longer
    // caps completeness — deterministic drafts fill the remaining
    // support-key slots (support/display dedupe prevents overlap; ties go
    // to the LLM slate via stable sort order).
    const detSeeds = buildObjectiveTopicSeeds(
      context,
      objective,
      industrySubjects
    );
    const detFramed = applyTopicTitleHooks(
      frameCandidates(detSeeds, context, objective)
    );
    const framed = [...llmFramed, ...detFramed];
    const scored = scoreCandidates(framed, {
      objective,
      context,
      recentKeys,
      audience,
    });
    const seeds = [...llmFramed.map((f) => f.seed), ...detSeeds];
    return assembleCandidateResult({
      scored,
      seeds,
      context,
      objective,
      audience,
    });
  }

  const seeds = buildObjectiveTopicSeeds(context, objective, industrySubjects);
  const framed = frameCandidates(seeds, context, objective);
  // Hooked Trigger stage — titles only; support keys stay seed-based
  const drafts = applyTopicTitleHooks(framed);
  const scored = scoreCandidates(drafts, {
    objective,
    context,
    recentKeys,
    audience,
  });
  return assembleCandidateResult({
    scored,
    seeds,
    context,
    objective,
    audience,
  });
}
