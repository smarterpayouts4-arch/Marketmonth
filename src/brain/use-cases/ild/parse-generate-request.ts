import { selectedTopicContextSchema } from "@/brain/content/direction-writing-context";
import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import { TOPIC_CATEGORY_IDS } from "@/brain/content/topic-category";
import type { CompanyResearchImportV1 } from "@/brain/evaluation/company-research-assist";
import { TOPIC_OBJECTIVE_REQUIRED } from "@/brain/evaluation/topic-candidate-types";

export type IdeaLabGenerateStage =
  | "candidates"
  | "directions"
  | "research_prompt"
  | "research_validate";

export type IdeaLabGenerateBody = {
  stage?: IdeaLabGenerateStage;
  companyId?: string;
  topicCategory?: string;
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
      companyId: string;
      topicCategory?: string;
    }
  | {
      ok: true;
      stage: "research_validate";
      researchPaste: string;
    }
  | {
      ok: true;
      stage: "candidates";
      companyId: string;
      topicCategory?: string;
      researchImport?: string | CompanyResearchImportV1;
    }
  | {
      ok: true;
      stage: "directions";
      companyId: string;
      topicCategory: TopicCategoryId;
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

function isTopicCategoryId(value: string): value is TopicCategoryId {
  return (TOPIC_CATEGORY_IDS as readonly string[]).includes(value);
}

export const IDEA_LAB_DEFAULT_COMPANY_ID = "zynava.com";

/**
 * companyId flows into a data/companies/<id>/ file path, so it must be a
 * plain domain-like slug — no separators, no traversal.
 */
const COMPANY_ID_RE = /^[a-z0-9][a-z0-9.-]{0,127}$/;

function resolveCompanyId(
  raw: string | undefined
): { ok: true; companyId: string } | { ok: false; error: string } {
  const trimmed = raw?.trim().toLowerCase();
  if (!trimmed) return { ok: true, companyId: IDEA_LAB_DEFAULT_COMPANY_ID };
  if (!COMPANY_ID_RE.test(trimmed) || trimmed.includes("..")) {
    return { ok: false, error: "companyId must be a plain domain slug" };
  }
  return { ok: true, companyId: trimmed };
}

/**
 * Domain shaping for Idea Lab generate — routes stay transport-only.
 */
export function parseIdeaLabGenerateRequest(
  body: IdeaLabGenerateBody
): ParsedIdeaLabGenerateRequest {
  const company = resolveCompanyId(body.companyId);
  if (!company.ok) {
    return { ok: false, status: 400, error: company.error };
  }
  const companyId = company.companyId;

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
      companyId,
      topicCategory: body.topicCategory,
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
      companyId,
      topicCategory: body.topicCategory,
      researchImport,
    };
  }

  if (!body.topicCategory || !isTopicCategoryId(body.topicCategory)) {
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
      objective: body.topicCategory,
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
    companyId,
    topicCategory: body.topicCategory,
    selectedCandidateId: body.selectedCandidateId,
    selectedTopicContext,
    manualTopic: legacyTitle,
  };
}
