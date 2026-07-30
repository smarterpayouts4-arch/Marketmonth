import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import { dualSubjectFromLabel } from "@/brain/content/subject-shape";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import { pipelineTrace } from "@/brain/debug/pipeline-trace";
import type { TopicCandidate } from "@/brain/evaluation/topic-candidate-types";

/** Build a frozen SelectedTopicContext from a full TopicCandidate. */
export function selectedTopicContextFromCandidate(
  candidate: TopicCandidate,
  topicCategory: TopicCategoryId
): SelectedTopicContext {
  const dual = candidate.subject
    ? {
        rawSubject: candidate.subject.rawSubject ?? candidate.subject.label,
        normalizedSubject:
          candidate.subject.normalizedSubject ?? candidate.subject.label,
        subjectShape: candidate.subject.subjectShape,
      }
    : dualSubjectFromLabel(candidate.title);
  pipelineTrace("topic.freeze", {
    masterTitle: candidate.title,
    rawSubject: dual.rawSubject,
    normalizedSubject: dual.normalizedSubject,
    subjectShape: dual.subjectShape,
  });
  return {
    topicId: candidate.topicId,
    masterTitle: candidate.title,
    objective: topicCategory,
    audience: candidate.audience,
    audiencePain: candidate.audiencePain,
    strategicAngle: candidate.strategicAngle,
    relevanceReasons: candidate.relevanceReasons,
    evidenceIds: candidate.evidenceIds,
    subjectLabel: candidate.subject?.label,
    rawSubject: dual.rawSubject,
    normalizedSubject: dual.normalizedSubject,
    subjectShape: dual.subjectShape ?? dualSubjectFromLabel(dual.rawSubject).subjectShape,
    grounding: "candidate",
  };
}

/** Synthetic context for a manually typed topic (limited at preflight). */
export function selectedTopicContextFromTypedTopic(
  masterTitle: string,
  topicCategory: TopicCategoryId
): SelectedTopicContext {
  return {
    topicId: `typed_${Date.now().toString(36)}`,
    masterTitle,
    objective: topicCategory,
    grounding: "user_typed",
  };
}
