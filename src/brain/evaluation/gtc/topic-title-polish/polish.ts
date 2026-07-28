import type { ContentBrainContext } from "@/brain/content/types";
import type { MarketingFocus } from "@/brain/content/marketing-focus";

import type {
  TitlePolishFailureReason,
  TopicCandidate,
  TopicCandidateGenerationResult,
} from "../../topic-candidate-types";
import {
  buildTopicTitlePolishMessages,
  candidateEligibleForPolish,
  toTopicTitlePolishInput,
} from "./build-prompt";
import { polishTitlesWithOpenAI, resolvePolishModel } from "./openai-adapter";
import { validatePolishedTitle } from "./validate-polish";
import type { TopicTitleSource } from "./types";
import { TOPIC_TITLE_POLISH_VERSION } from "./types";

export { buildTopicTitlePolishMessages, toTopicTitlePolishInput };
export { buildTopicTitlePolishSystemPrompt } from "./playbook";

export type PolishTopicTitlesResult = {
  generation: TopicCandidateGenerationResult;
  titlePolishFailureReason?: TitlePolishFailureReason;
  titlePolishFailureDetail?: string;
};

function polishProviderEnabled(): boolean {
  const flag = process.env.TOPIC_TITLE_POLISH_PROVIDER?.trim().toLowerCase();
  return flag === "openai";
}

function withDeterministicSource(
  candidates: TopicCandidate[]
): TopicCandidate[] {
  return candidates.map((c) => ({
    ...c,
    originalTitle: c.originalTitle ?? c.title,
    titleSource: (c.titleSource ?? "deterministic-v2") as TopicTitleSource,
  }));
}

function mapSuccess(
  generation: Extract<TopicCandidateGenerationResult, { status: "success" }>,
  candidates: TopicCandidate[]
): TopicCandidateGenerationResult {
  if (generation.completeness === "complete") {
    return {
      status: "success",
      completeness: "complete",
      candidates: candidates as typeof generation.candidates,
      warnings: [],
    };
  }
  return {
    status: "success",
    completeness: "limited",
    candidates,
    warnings: [...generation.warnings],
  };
}

/**
 * Optional expression polish after deterministic assemble.
 * Never changes rank, scores, evidence, kinds, or candidate set size.
 * Provider off → titleSource deterministic-v2 (not a failure).
 */
export async function polishTopicCandidateTitles(args: {
  generation: TopicCandidateGenerationResult;
  context: ContentBrainContext;
  objective: MarketingFocus;
}): Promise<PolishTopicTitlesResult> {
  const { generation, context, objective } = args;

  if (generation.status !== "success") {
    return { generation };
  }

  const baselineCandidates = withDeterministicSource([...generation.candidates]);
  const baseline = mapSuccess(generation, baselineCandidates);

  if (!polishProviderEnabled()) {
    return { generation: baseline };
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return markBatchFallback(generation, baselineCandidates, "missing_api_key");
  }

  const eligible = baselineCandidates.filter(candidateEligibleForPolish);
  if (eligible.length === 0) {
    return markBatchFallback(
      generation,
      baselineCandidates,
      "no_eligible_candidates"
    );
  }

  const polishInput = toTopicTitlePolishInput(eligible, context, objective);
  const modelOut = await polishTitlesWithOpenAI(polishInput);
  if (!modelOut.ok) {
    return markBatchFallback(
      generation,
      baselineCandidates,
      modelOut.reason,
      modelOut.detail
    );
  }

  const byId = new Map(
    modelOut.value.candidates.map((c) => [c.candidateId, c] as const)
  );
  const inputById = new Map(
    polishInput.candidates.map((c) => [c.candidateId, c] as const)
  );
  const acceptedTitles: string[] = [];
  const model = resolvePolishModel();
  let anyValidationReject = false;
  let lastValidationDetail: string | undefined;

  const nextCandidates = baselineCandidates.map((c) => {
    const polished = byId.get(c.topicId);
    const pInput = inputById.get(c.topicId);
    if (!polished || !pInput || !candidateEligibleForPolish(c)) {
      return {
        ...c,
        originalTitle: c.originalTitle ?? c.title,
        titleSource: "deterministic-v2" as const,
      };
    }

    const validation = validatePolishedTitle({
      candidate: c,
      polishInput: pInput,
      polishedTitle: polished.polishedTitle,
      otherAcceptedTitles: acceptedTitles,
    });

    if (!validation.ok) {
      anyValidationReject = true;
      lastValidationDetail = validation.reason;
      return {
        ...c,
        originalTitle: c.originalTitle ?? c.title,
        titleSource: "deterministic-v2" as const,
        titlePolishVersion: TOPIC_TITLE_POLISH_VERSION,
        titlePolishModel: model,
        titlePolishReason: undefined,
        titlePolishFailureReason: "title_validation_rejected" as const,
        titlePolishFailureDetail: validation.reason,
      };
    }

    acceptedTitles.push(polished.polishedTitle.trim());
    return {
      ...c,
      originalTitle: c.originalTitle ?? c.title,
      title: polished.polishedTitle.trim(),
      titleSource: "openai-polished" as const,
      titlePolishVersion: TOPIC_TITLE_POLISH_VERSION,
      titlePolishModel: model,
      titlePolishReason: polished.polishReason,
    };
  });

  return {
    generation: mapSuccess(generation, nextCandidates),
    ...(anyValidationReject
      ? {
          titlePolishFailureReason:
            "title_validation_rejected" as TitlePolishFailureReason,
          titlePolishFailureDetail: lastValidationDetail,
        }
      : {}),
  };
}

function markBatchFallback(
  generation: Extract<TopicCandidateGenerationResult, { status: "success" }>,
  baselineCandidates: TopicCandidate[],
  reason: TitlePolishFailureReason,
  detail?: string
): PolishTopicTitlesResult {
  const candidates = baselineCandidates.map((c) => ({
    ...c,
    originalTitle: c.originalTitle ?? c.title,
    title: c.originalTitle ?? c.title,
    titleSource: "openai-fallback" as const,
    titlePolishVersion: TOPIC_TITLE_POLISH_VERSION,
    titlePolishModel: resolvePolishModel(),
    titlePolishFailureReason: reason,
    titlePolishFailureDetail: detail,
  }));

  return {
    generation: mapSuccess(generation, candidates),
    titlePolishFailureReason: reason,
    titlePolishFailureDetail: detail,
  };
}
