import { parseTopicCategory } from "@/brain/content/topic-category";
import { getBrandCoreRepository } from "@/brain/core";
import {
  buildPersonalizedResearchPrompt,
  promptContextFromBrain,
} from "@/brain/evaluation/company-research-assist";
import { TOPIC_OBJECTIVE_REQUIRED } from "@/brain/evaluation/topic-candidate-types";

export type BuildIdeaLabResearchPromptResult =
  | { ok: true; prompt: string; companyName: string }
  | {
      ok: false;
      code: typeof TOPIC_OBJECTIVE_REQUIRED | "FIXTURE_ERROR";
      error: string;
      status: number;
    };

/**
 * Build the thin Research Assist copy/paste prompt from Brand Core repository.
 */
export function buildIdeaLabResearchPrompt(input: {
  topicCategory?: unknown;
  companyId?: string;
  fixturePath?: string;
}): BuildIdeaLabResearchPromptResult {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab is production-impossible");
  }

  const parsed = parseTopicCategory(input.topicCategory);
  if (!parsed.ok || !parsed.value) {
    return {
      ok: false,
      code: TOPIC_OBJECTIVE_REQUIRED,
      error: parsed.ok
        ? "Please select what you want this topic to accomplish."
        : parsed.error,
      status: 400,
    };
  }
  const objective = parsed.value;
  const companyId = input.companyId?.trim();
  if (!companyId && !input.fixturePath) {
    return {
      ok: false,
      code: "FIXTURE_ERROR",
      error:
        "companyId or fixturePath is required (no silent default brand)",
      status: 400,
    };
  }

  let loaded;
  try {
    loaded = getBrandCoreRepository().getBrandCore(
      companyId || "ad-hoc",
      input.fixturePath ? { absolutePath: input.fixturePath } : undefined
    );
  } catch (err) {
    return {
      ok: false,
      code: "FIXTURE_ERROR",
      error: err instanceof Error ? err.message : "Brand Core load failed",
      status: 400,
    };
  }

  const promptCtx = promptContextFromBrain(loaded.context, objective);
  return {
    ok: true,
    prompt: buildPersonalizedResearchPrompt(promptCtx),
    companyName: loaded.context.brandName,
  };
}
