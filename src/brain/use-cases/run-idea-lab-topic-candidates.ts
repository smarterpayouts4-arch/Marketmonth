import {
  parseMarketingFocus,
  type MarketingFocus,
} from "@/brain/content/marketing-focus";
import { getBrandCoreRepository } from "@/brain/core";
import {
  mergeResearchImportIntoContext,
  parseCompanyResearchImport,
  type CompanyResearchImportV1,
} from "@/brain/evaluation/company-research-assist";
import { generateTopicCandidates } from "@/brain/evaluation/generate-topic-candidates";
import { polishTopicCandidateTitles } from "@/brain/evaluation/gtc/topic-title-polish";
import { preferBrandCoreForTopics } from "@/brain/evaluation/prefer-brand-core-context";
import {
  expandIndustryResearchWithPerplexity,
  mergeIndustryResearchIntoContext,
} from "@/brain/evaluation/industry-research";
import { getIdeaLabHistoryPath } from "@/brain/evaluation/idea-lab-store";
import { IDEA_LAB_FIXTURE_NAME } from "@/brain/evaluation/idea-lab.types";
import {
  TOPIC_CANDIDATE_SCORE_VERSION,
  TOPIC_OBJECTIVE_REQUIRED,
  type IdeaLabCandidatesResult,
} from "@/brain/evaluation/topic-candidate-types";
import { createTopicGenerationRepository } from "@/brain/store/create-topic-generation-repository";

const RECENT_LIMIT = 12;

function assertDev(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab is production-impossible");
  }
}

export type RunIdeaLabCandidatesInput = {
  marketingFocus?: unknown;
  /** Company whose approved artifact feeds Brand Core (required unless fixturePath). */
  companyId?: string;
  /**
   * Optional absolute CSV path for BrandCoreRepository adapter (tests).
   */
  fixturePath?: string;
  liveIndustryResearch?: boolean;
  researchImport?: CompanyResearchImportV1 | string;
};

export type RunIdeaLabCandidatesOutcome =
  | { ok: true; result: IdeaLabCandidatesResult }
  | {
      ok: false;
      code: typeof TOPIC_OBJECTIVE_REQUIRED | "CSV_INVALID" | "FIXTURE_ERROR";
      error: string;
      status: number;
    };

/**
 * Idea Lab stage 1: ranked topic candidates via BrandCoreRepository only.
 * Never generates six directions and never writes Lab topic history.
 */
export async function runIdeaLabTopicCandidates(
  input: RunIdeaLabCandidatesInput = {}
): Promise<RunIdeaLabCandidatesOutcome> {
  assertDev();

  const focusParsed = parseMarketingFocus(input.marketingFocus);
  if (!focusParsed.ok) {
    return {
      ok: false,
      code: TOPIC_OBJECTIVE_REQUIRED,
      error: focusParsed.error,
      status: 400,
    };
  }
  if (!focusParsed.value) {
    return {
      ok: false,
      code: TOPIC_OBJECTIVE_REQUIRED,
      error: "Please select what you want this topic to accomplish.",
      status: 400,
    };
  }
  const objective: MarketingFocus = focusParsed.value;
  const historyRepositoryPath = getIdeaLabHistoryPath();

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
      status: 500,
    };
  }

  let context = loaded.context;
  const { brandCore, identity } = loaded;
  const hash = identity.brand_core_hash;

  if (input.researchImport !== undefined) {
    const parsed =
      typeof input.researchImport === "string"
        ? parseCompanyResearchImport(input.researchImport)
        : { ok: true as const, value: input.researchImport };
    if (!parsed.ok) {
      return {
        ok: false,
        code: "FIXTURE_ERROR",
        error: parsed.error,
        status: 400,
      };
    }
    context = mergeResearchImportIntoContext(context, parsed.value);
  }

  const live =
    input.liveIndustryResearch === true ||
    process.env.INDUSTRY_RESEARCH_LIVE?.trim().toLowerCase() === "true";
  let industryOpportunities = undefined;
  if (live) {
    const expansion = await expandIndustryResearchWithPerplexity(context);
    context = mergeIndustryResearchIntoContext(context, expansion);
    industryOpportunities = expansion.opportunities;
  }

  const topicContext = preferBrandCoreForTopics(context, brandCore);

  let recentTitles: string[] = [];
  try {
    const labRepo = createTopicGenerationRepository({
      filePath: historyRepositoryPath,
    });
    const recent = await labRepo.listByCompany(identity.company_id, {
      limit: RECENT_LIMIT * 2,
    });
    recentTitles = recent
      .filter((r) =>
        ["generated", "selected", "continued"].includes(r.status)
      )
      .slice(-RECENT_LIMIT)
      .map((r) => r.master_topic)
      .filter(Boolean);
  } catch {
    recentTitles = [];
  }

  const deterministic = generateTopicCandidates({
    context: topicContext,
    objective,
    recentTitles,
    industryOpportunities,
  });

  const polished = await polishTopicCandidateTitles({
    generation: deterministic,
    context: topicContext,
    objective,
  });
  const generation = polished.generation;

  const sessionId = `ilcand_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const candidates =
    generation.status === "success" ? [...generation.candidates] : [];

  return {
    ok: true,
    result: {
      sessionId,
      objective,
      generation,
      candidates,
      completeness:
        generation.status === "success" ? generation.completeness : undefined,
      warnings:
        generation.status === "success" ? [...generation.warnings] : [],
      diagnostic:
        generation.status === "insufficient_context"
          ? generation.diagnostic
          : undefined,
      fixtureHash: hash,
      fixtureName: IDEA_LAB_FIXTURE_NAME,
      brandName: context.brandName,
      historyRepositoryPath,
      historyWritten: false,
      scoreVersion: TOPIC_CANDIDATE_SCORE_VERSION,
      titlePolishFailureReason: polished.titlePolishFailureReason,
      titlePolishFailureDetail: polished.titlePolishFailureDetail,
    },
  };
}
