import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type {
  TopicGenerationEvaluation,
  TopicGenerationRecord,
  TopicGenerationRecordStatus,
} from "@/brain/content/topic-generation-record.schema";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";

/**
 * Topic Generation History and Evaluation Repository.
 * Callers must use this interface — never parse the history CSV directly.
 */
export type TopicGenerationRepository = {
  create(record: TopicGenerationRecord): Promise<TopicGenerationRecord>;

  getById(generationId: string): Promise<TopicGenerationRecord | null>;

  listByCompany(
    companyId: string,
    options?: { limit?: number }
  ): Promise<TopicGenerationRecord[]>;

  listByNormalizedTopic(input: {
    companyId: string;
    normalizedTopic: string;
    limit?: number;
  }): Promise<TopicGenerationRecord[]>;

  listByComparisonGroup(
    comparisonGroupId: string
  ): Promise<TopicGenerationRecord[]>;

  updateSelection(input: {
    generationId: string;
    selectedDirectionId: string;
    expectedRevision: number;
  }): Promise<TopicGenerationRecord>;

  updateStatus(input: {
    generationId: string;
    status: TopicGenerationRecordStatus;
    expectedRevision: number;
    /** Optional durable handoff fields (typically set on continue). */
    selectedTopicContext?: SelectedTopicContext;
    handoff?: ContentDirectionsHandoffV1;
  }): Promise<TopicGenerationRecord>;

  saveEvaluation(input: {
    generationId: string;
    evaluation: TopicGenerationEvaluation;
    expectedRevision: number;
  }): Promise<TopicGenerationRecord>;
};
