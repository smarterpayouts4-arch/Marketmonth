import type { IdeaCandidateView } from "@/brain/evaluation/idea-lab.types";
import type { ContentAngle, ContentVariation } from "@/brain/content/types";

const ANGLES = new Set<ContentAngle>([
  "beginner_guide",
  "faq",
  "problem_solution",
  "decision_guide",
  "comparison",
  "trust_transparency",
  "how_it_works",
  "action_oriented",
  "other",
]);

function asAngle(raw: string): ContentAngle {
  return ANGLES.has(raw as ContentAngle) ? (raw as ContentAngle) : "other";
}

/** Presentational adapter only — does not touch product session or Atom. */
export function mapIdeaCandidateToVariation(
  idea: IdeaCandidateView
): ContentVariation {
  const confidence =
    idea.confidence === "high" ||
    idea.confidence === "medium" ||
    idea.confidence === "low"
      ? idea.confidence
      : "medium";

  const safetyStatus =
    idea.safetyStatus === "safe" ||
    idea.safetyStatus === "needs_review" ||
    idea.safetyStatus === "blocked"
      ? idea.safetyStatus
      : "needs_review";

  return {
    id: idea.id,
    angle: asAngle(idea.angle),
    punchline: idea.punchline,
    subheading: idea.subheading,
    brief: idea.brief,
    ideaSummary: idea.ideaSummary,
    audienceProblem: idea.audienceProblem,
    strategicPurpose: idea.strategicPurpose,
    specificTopic: idea.specificTopic,
    corePromise: idea.corePromise,
    suggestedFormat: idea.suggestedFormat,
    suggestedCta: idea.suggestedCta,
    evidenceIds: idea.evidenceIds,
    assumptionIds: idea.assumptionIds,
    confidence,
    safety: {
      status: safetyStatus,
      reasons: idea.safetyReasons,
    },
  };
}
