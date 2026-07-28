import type { MarketingFocus } from "@/brain/content/marketing-focus";
import type { ContentBrainContext } from "@/brain/content/types";

import {
  applyTopicTitleHooks,
  assembleCandidateResult,
  frameCandidates,
  scoreCandidates,
} from "./gtc";
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
  objectiveTopicStrategies,
  buildObjectiveTopicSeeds,
} from "./objective-topic-strategies";

function audienceLine(context: ContentBrainContext): string {
  return (
    context.audience?.trim() ||
    `people researching what ${context.brandName} offers`
  );
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
  objective: MarketingFocus;
  recentTitles?: string[];
  /** Live Perplexity opportunities (already validated). Optional. */
  industryOpportunities?: IndustryResearchOpportunity[];
  /** When false, skip industry subjects even if present on context. */
  includeIndustryResearch?: boolean;
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
