import { readFileSync } from "node:fs";

import { defaultFixtureAbsolute } from "@/brain/content/repository/default-fixture";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { parseMarketingFocus } from "@/brain/content/marketing-focus";
import {
  buildPersonalizedResearchPrompt,
  promptContextFromBrain,
} from "@/brain/evaluation/company-research-assist";
import { TOPIC_OBJECTIVE_REQUIRED } from "@/brain/evaluation/topic-candidate-types";

const DEFAULT_FIXTURE = defaultFixtureAbsolute();

export type BuildIdeaLabResearchPromptResult =
  | { ok: true; prompt: string; companyName: string }
  | {
      ok: false;
      code: typeof TOPIC_OBJECTIVE_REQUIRED | "FIXTURE_ERROR";
      error: string;
      status: number;
    };

/**
 * Build the thin Research Assist copy/paste prompt from allowlisted fixture fields.
 */
export function buildIdeaLabResearchPrompt(input: {
  marketingFocus?: unknown;
  fixturePath?: string;
}): BuildIdeaLabResearchPromptResult {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab is production-impossible");
  }

  const parsed = parseMarketingFocus(input.marketingFocus);
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

  const fixturePath = input.fixturePath ?? DEFAULT_FIXTURE;
  let text: string;
  try {
    text = readFileSync(fixturePath, "utf8");
  } catch (err) {
    return {
      ok: false,
      code: "FIXTURE_ERROR",
      error: err instanceof Error ? err.message : "Fixture read failed",
      status: 400,
    };
  }

  const context = parseFixtureCsv(text);
  if (!context) {
    return {
      ok: false,
      code: "FIXTURE_ERROR",
      error: "parseFixtureCsv returned null",
      status: 400,
    };
  }

  const promptCtx = promptContextFromBrain(context, objective);
  return {
    ok: true,
    prompt: buildPersonalizedResearchPrompt(promptCtx),
    companyName: context.brandName,
  };
}
