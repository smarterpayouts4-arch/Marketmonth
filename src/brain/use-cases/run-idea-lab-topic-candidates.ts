import {
  parseTopicCategory,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import { getBrandCoreRepository } from "@/brain/core";
import {
  mergeResearchImportIntoContext,
  parseCompanyResearchImport,
  type CompanyResearchImportV1,
} from "@/brain/evaluation/company-research-assist";
import { buildTrace } from "@/brain/evaluation/build-idea-lab-trace";
import { generateTopicCandidates } from "@/brain/evaluation/generate-topic-candidates";
import {
  buildTopicEvidenceIndex,
  selectEvidenceForCategory,
} from "@/brain/evaluation/evidence";
import { fetchLlmTopicCandidates } from "@/brain/evaluation/gtc/llm-candidates";
import { preferBrandCoreForTopics } from "@/brain/evaluation/prefer-brand-core-context";
import {
  expandIndustryResearchWithPerplexity,
  mergeIndustryResearchIntoContext,
} from "@/brain/evaluation/industry-research";
import { getIdeaLabHistoryPath } from "@/brain/evaluation/idea-lab-store";
import {
  IDEA_LAB_FIXTURE_NAME,
  type IdeaLabEvidenceClaimView,
} from "@/brain/evaluation/idea-lab.types";
import {
  TOPIC_CANDIDATE_SCORE_VERSION,
  TOPIC_OBJECTIVE_REQUIRED,
  type IdeaLabCandidatesResult,
} from "@/brain/evaluation/topic-candidate-types";
import { judgeTopicCandidates } from "@/brain/evaluation/judge/llm-judge";
import {
  emitQualityAlerts,
  evaluateTopicGenerationQuality,
} from "@/brain/observability/quality-alert";
import { assignPromptVariant } from "@/brain/policy/prompt-experiments";
import { createTopicGenerationRepository } from "@/brain/store/create-topic-generation-repository";

const RECENT_LIMIT = 12;

function assertDev(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab is production-impossible");
  }
}

export type RunIdeaLabCandidatesInput = {
  topicCategory?: unknown;
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

  const focusParsed = parseTopicCategory(input.topicCategory);
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
  const objective: TopicCategoryId = focusParsed.value;
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

  const sessionId = `ilcand_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  // Prompt A/B (P3.1): stable per-company assignment; the assigned version
  // is stamped everywhere the control version used to be.
  const promptAssignment = assignPromptVariant(
    "topic.llm-candidates",
    identity.company_id
  );
  const promptVersion = promptAssignment.version;

  const evidenceIndex = buildTopicEvidenceIndex(topicContext);
  const evidenceItems = selectEvidenceForCategory(evidenceIndex, objective);
  const llmStarted = Date.now();
  const llmFetch = await fetchLlmTopicCandidates({
    context: topicContext,
    categoryId: objective,
    evidenceItems,
    promptVariant: promptAssignment.variant,
  });
  const llmDurationMs = Date.now() - llmStarted;

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

  const generation = generateTopicCandidates({
    context: topicContext,
    objective,
    recentTitles,
    industryOpportunities,
    ...(llmFetch.ok && llmFetch.candidates.length > 0
      ? { llmCandidates: llmFetch.candidates }
      : {}),
  });

  const candidates =
    generation.status === "success" ? [...generation.candidates] : [];

  const llmUsed = llmFetch.ok && llmFetch.candidates.length > 0;
  const deterministicFallbackUsed = !llmUsed;

  // LLM-as-judge — always-on for Idea Lab candidates (advisory, never blocks).
  let judge: Awaited<ReturnType<typeof judgeTopicCandidates>> = null;
  if (candidates.length > 0) {
    try {
      judge = await judgeTopicCandidates({
        brandName: context.brandName,
        categoryId: objective,
        candidates: candidates.map((c) => ({
          title: c.title,
          strategicAngle: c.strategicAngle,
        })),
        companyId: identity.company_id,
      });
    } catch {
      judge = null;
    }
  }

  // Quality-drop alerting (P3.1): structured warnings for ops visibility.
  emitQualityAlerts(
    `idea-lab:${identity.company_id}:${objective}`,
    evaluateTopicGenerationQuality({
      status: generation.status,
      candidateCount: candidates.length,
      llmFailureReason: llmFetch.ok ? undefined : llmFetch.reason,
      judgeOverall: judge?.overall,
    })
  );

  const evidenceClaimsById: Record<string, IdeaLabEvidenceClaimView> = {};
  for (const item of evidenceIndex.items) {
    evidenceClaimsById[item.id] = {
      id: item.id,
      field: item.field,
      claim: item.normalizedText || item.value,
    };
  }

  const candidateTrace = buildTrace([
    {
      stage: "Evidence indexed",
      modulePath: "@/brain/evaluation/evidence",
      symbol: "buildTopicEvidenceIndex",
      status: "success",
      outputSummary: { evidenceIndexCount: evidenceIndex.items.length },
    },
    {
      stage: "Evidence selected for category",
      modulePath: "@/brain/evaluation/evidence",
      symbol: "selectEvidenceForCategory",
      status: "success",
      inputSummary: { categoryId: objective },
      outputSummary: { evidenceSelectedCount: evidenceItems.length },
    },
    {
      stage: "LLM topic candidates",
      modulePath: "@/brain/evaluation/gtc/llm-candidates",
      symbol: "fetchLlmTopicCandidates",
      status: llmFetch.ok ? "success" : "warning",
      durationMs: llmDurationMs,
      outputSummary: llmFetch.ok
        ? {
            candidateCount: llmFetch.candidates.length,
            model: llmFetch.model,
            promptVersion,
            validatorVersion: llmFetch.validatorVersion,
            repairUsed: llmFetch.repairUsed ?? false,
            rejectedCount: llmFetch.rejections?.length ?? 0,
            tokenUsage: llmFetch.tokenUsage,
          }
        : {
            reason: llmFetch.reason,
            detail: llmFetch.detail,
            model: llmFetch.model,
            promptVersion,
            validatorVersion: llmFetch.validatorVersion,
            repairUsed: llmFetch.repairUsed ?? false,
            rejections: llmFetch.rejections?.slice(0, 6),
          },
    },
    {
      stage: "Candidate assembly",
      modulePath: "@/brain/evaluation/generate-topic-candidates",
      symbol: "generateTopicCandidates",
      status:
        generation.status === "insufficient_context" ? "warning" : "success",
      outputSummary: {
        status: generation.status,
        candidateCount: candidates.length,
        deterministicFallbackUsed,
      },
    },
  ]);

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
      generationTrace: {
        evidenceIndexCount: evidenceIndex.items.length,
        evidenceSelectedCount: evidenceItems.length,
        llmUsed,
        deterministicFallbackUsed,
        promptVersion,
        model: llmFetch.model,
        llmDurationMs,
        artifactHash: hash,
        correlationId: sessionId,
        promptVariant: promptAssignment.variant,
        ...(judge
          ? { judgeVersion: judge.judgeVersion, judgeOverall: judge.overall }
          : {}),
      },
      evidenceClaimsById,
      candidateTrace,
      ...(llmFetch.ok
        ? { llmTokenUsage: llmFetch.tokenUsage }
        : {
            llmFailureReason: llmFetch.reason,
            llmFailureDetail: llmFetch.detail,
          }),
    },
  };
}
