import { selectedTopicContextSchema } from "@/brain/content/direction-writing-context";
import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { MarketingFocus } from "@/brain/content/marketing-focus";
import { MARKETING_FOCUS_VALUES } from "@/brain/content/marketing-focus";
import type { CompanyResearchImportV1 } from "@/brain/evaluation/company-research-assist";
import { TOPIC_OBJECTIVE_REQUIRED } from "@/brain/evaluation/topic-candidate-types";

export type IdeaLabGenerateStage =
  | "candidates"
  | "directions"
  | "research_prompt"
  | "research_validate";

export type IdeaLabGenerateBody = {
  stage?: IdeaLabGenerateStage;
  marketingFocus?: string;
  selectedTopic?: string;
  selectedCandidateId?: string;
  selectedTopicContext?: unknown;
  topicMode?: "auto" | "manual";
  manualTopic?: string;
  researchImport?: unknown;
  researchPaste?: string;
};

export type ParsedIdeaLabGenerateRequest =
  | {
      ok: true;
      stage: "research_prompt";
      marketingFocus?: string;
    }
  | {
      ok: true;
      stage: "research_validate";
      researchPaste: string;
    }
  | {
      ok: true;
      stage: "candidates";
      marketingFocus?: string;
      researchImport?: string | CompanyResearchImportV1;
    }
  | {
      ok: true;
      stage: "directions";
      marketingFocus: MarketingFocus;
      selectedCandidateId?: string;
      selectedTopicContext?: SelectedTopicContext;
      manualTopic?: string;
    }
  | {
      ok: false;
      status: number;
      code?: string;
      error: string;
    };

function isMarketingFocus(value: string): value is MarketingFocus {
  return (MARKETING_FOCUS_VALUES as readonly string[]).includes(value);
}

/**
 * Domain shaping for Idea Lab generate — routes stay transport-only.
 */
export function parseIdeaLabGenerateRequest(
  body: IdeaLabGenerateBody
): ParsedIdeaLabGenerateRequest {
  const stage: IdeaLabGenerateStage =
    body.stage === "directions"
      ? "directions"
      : body.stage === "research_prompt"
        ? "research_prompt"
        : body.stage === "research_validate"
          ? "research_validate"
          : body.stage === "candidates"
            ? "candidates"
            : body.topicMode === "manual" ||
                Boolean(
                  body.selectedTopicContext ||
                    body.selectedTopic?.trim() ||
                    body.manualTopic?.trim()
                )
              ? "directions"
              : "candidates";

  if (stage === "research_prompt") {
    return {
      ok: true,
      stage: "research_prompt",
      marketingFocus: body.marketingFocus,
    };
  }

  if (stage === "research_validate") {
    const researchPaste =
      typeof body.researchPaste === "string"
        ? body.researchPaste
        : typeof body.researchImport === "string"
          ? body.researchImport
          : body.researchImport != null
            ? JSON.stringify(body.researchImport)
            : "";
    return { ok: true, stage: "research_validate", researchPaste };
  }

  if (stage === "candidates") {
    const researchImport =
      typeof body.researchImport === "string" ||
      (body.researchImport != null && typeof body.researchImport === "object")
        ? (body.researchImport as string | CompanyResearchImportV1)
        : undefined;
    return {
      ok: true,
      stage: "candidates",
      marketingFocus: body.marketingFocus,
      researchImport,
    };
  }

  if (!body.marketingFocus || !isMarketingFocus(body.marketingFocus)) {
    return {
      ok: false,
      status: 400,
      code: TOPIC_OBJECTIVE_REQUIRED,
      error: "Please select what you want this topic to accomplish.",
    };
  }

  let selectedTopicContext: SelectedTopicContext | undefined;
  if (body.selectedTopicContext) {
    const parsed = selectedTopicContextSchema.safeParse(body.selectedTopicContext);
    if (!parsed.success) {
      return {
        ok: false,
        status: 400,
        error:
          parsed.error.issues[0]?.message ?? "Invalid selectedTopicContext",
      };
    }
    selectedTopicContext = {
      ...parsed.data,
      objective: body.marketingFocus,
    };
  }

  const legacyTitle =
    typeof body.selectedTopic === "string"
      ? body.selectedTopic
      : typeof body.manualTopic === "string"
        ? body.manualTopic
        : undefined;

  if (!selectedTopicContext && (!legacyTitle || !legacyTitle.trim())) {
    return {
      ok: false,
      status: 400,
      error: "selectedTopic is required to generate six directions",
    };
  }

  return {
    ok: true,
    stage: "directions",
    marketingFocus: body.marketingFocus,
    selectedCandidateId: body.selectedCandidateId,
    selectedTopicContext,
    manualTopic: legacyTitle,
  };
}
