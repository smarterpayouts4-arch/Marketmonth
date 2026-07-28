import { createCsvTopicGenerationRepository } from "./csv-topic-generation-repository";
import type { TopicGenerationRepository } from "./topic-generation-repository";

/**
 * Sole factory for Topic Generation History and Evaluation Repository.
 * Local adapter: CSV under data/runtime/.
 */
export function createTopicGenerationRepository(options?: {
  filePath?: string;
}): TopicGenerationRepository {
  return createCsvTopicGenerationRepository(options);
}
