import { shortHash } from "../../evidence";
import { evaluateSafety, mergeSafety } from "../../safety";
import type { ContentAngle, ContentVariation, MasterTopic } from "../../types";
import type { IntelligentDirectionsResult } from "./schema";

const ANGLE_MAP: Record<string, ContentAngle> = {
  beginner_guide: "beginner_guide",
  faq: "faq",
  problem_solution: "problem_solution",
  decision_guide: "decision_guide",
  comparison: "comparison",
  trust_transparency: "trust_transparency",
  how_it_works: "how_it_works",
  action_oriented: "action_oriented",
};

function mapAngle(raw: string): ContentAngle {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return ANGLE_MAP[key] ?? "other";
}

export function mapIntelligentToMasterTopic(
  result: IntelligentDirectionsResult,
  source: "manual" | "automatic",
  contextVersion: string
): MasterTopic {
  const topic = result.master_topic.topic.trim().slice(0, 90);
  const safety = mergeSafety(
    evaluateSafety(topic),
    evaluateSafety(result.master_topic.reason_summary)
  );
  return {
    id: `master_${shortHash(`intel|${contextVersion}|${topic}`)}`,
    source,
    punchline: topic,
    subheading: result.master_topic.reason_summary.slice(0, 150),
    rationale: result.master_topic.reason_summary.slice(0, 280),
    evidenceIds: result.master_topic.evidence_ids.slice(0, 4),
    confidence: "medium",
    safety,
  };
}

export function mapIntelligentToVariations(
  result: IntelligentDirectionsResult,
  masterTopic: MasterTopic,
  contextVersion: string,
  destination: string
): [
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
] {
  const variations = result.directions.map((d, index) => {
    const angle = mapAngle(d.strategic_angle);
    const safety = mergeSafety(
      evaluateSafety(d.specific_topic),
      evaluateSafety(d.idea_summary),
      masterTopic.safety
    );
    const variation: ContentVariation = {
      id:
        d.direction_id.trim() ||
        `var_${shortHash(`${masterTopic.id}|${index}|${contextVersion}`)}`,
      angle,
      punchline: d.specific_topic.slice(0, 90),
      subheading: d.differentiation_summary.slice(0, 150),
      brief: d.idea_summary.slice(0, 280),
      ideaSummary: d.idea_summary,
      audienceProblem: d.audience_problem_ids.join(", ").slice(0, 150),
      strategicPurpose: d.differentiation_summary.slice(0, 150),
      specificTopic: d.specific_topic.slice(0, 160),
      corePromise: d.idea_summary.slice(0, 280),
      suggestedFormat: "narrative_explainer",
      suggestedCta: "Learn more",
      destination,
      evidenceIds: d.evidence_ids.slice(0, 6),
      claimIds: d.claim_ids.slice(0, 6),
      audienceProblemIds: d.audience_problem_ids.slice(0, 6),
      differentiationSummary: d.differentiation_summary.slice(0, 280),
      assumptionIds: [],
      confidence: d.evidence_ids.length > 0 ? "medium" : "low",
      safety,
    };
    return variation;
  });

  return variations as [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];
}
