import { RECENT_HISTORY_LIMIT } from "@/brain/content/topic-generation-record";
import { createTopicGenerationRepository } from "@/brain/store/create-topic-generation-repository";
import type { TopicGenerationRepository } from "@/brain/store/topic-generation-repository";

export type RecentSummary = {
  generation_id: string;
  master_topic: string;
  status: string;
};

export async function loadRecentHistory(input: {
  companyId: string;
  repository?: TopicGenerationRepository;
}): Promise<RecentSummary[]> {
  const historyRepo =
    input.repository ?? createTopicGenerationRepository();

  try {
    const recent = await historyRepo.listByCompany(input.companyId, {
      limit: RECENT_HISTORY_LIMIT * 2,
    });
    return recent
      .filter((r) =>
        ["generated", "selected", "continued"].includes(r.status)
      )
      .slice(-RECENT_HISTORY_LIMIT)
      .map((r) => ({
        generation_id: r.generation_id,
        master_topic: r.master_topic,
        status: r.status,
      }));
  } catch {
    return [];
  }
}

export function createHistoryRepository(
  repository?: TopicGenerationRepository
): TopicGenerationRepository {
  return repository ?? createTopicGenerationRepository();
}
