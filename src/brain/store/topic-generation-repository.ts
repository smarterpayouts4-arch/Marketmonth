import type {
  TopicGenerationEvaluation,
  TopicGenerationRecord,
  TopicGenerationRecordStatus,
} from "@/brain/content/topic-generation-record.schema";

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
  }): Promise<TopicGenerationRecord>;

  saveEvaluation(input: {
    generationId: string;
    evaluation: TopicGenerationEvaluation;
    expectedRevision: number;
  }): Promise<TopicGenerationRecord>;
};
