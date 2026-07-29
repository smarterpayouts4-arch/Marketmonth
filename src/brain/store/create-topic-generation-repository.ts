import { createCsvTopicGenerationRepository } from "./csv-topic-generation-repository";
import { createDbTopicGenerationRepository } from "./db-topic-generation-repository";
import type { TopicGenerationRepository } from "./topic-generation-repository";

/**
 * Sole factory for Topic Generation History and Evaluation Repository.
 *
 * Adapter selection (P2.1):
 * - Explicit `filePath` (tests, Idea Lab sandbox history) → CSV adapter.
 * - Production, or `BRAIN_HISTORY_STORE=db` → Drizzle adapter
 *   (`topic_generations`); the CSV store is production-impossible.
 * - Otherwise (local dev default) → CSV under data/runtime/.
 */
export function createTopicGenerationRepository(options?: {
  filePath?: string;
}): TopicGenerationRepository {
  if (options?.filePath) {
    return createCsvTopicGenerationRepository(options);
  }
  if (
    process.env.NODE_ENV === "production" ||
    process.env.BRAIN_HISTORY_STORE?.trim().toLowerCase() === "db"
  ) {
    return createDbTopicGenerationRepository();
  }
  return createCsvTopicGenerationRepository(options);
}
