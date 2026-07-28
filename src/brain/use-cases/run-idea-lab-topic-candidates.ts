import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { defaultFixtureAbsolute } from "@/brain/content/repository/default-fixture";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import {
  parseMarketingFocus,
  type MarketingFocus,
} from "@/brain/content/marketing-focus";
import { getBrandCore } from "@/brain/core";
import {
  mergeResearchImportIntoContext,
  parseCompanyResearchImport,
  type CompanyResearchImportV1,
} from "@/brain/evaluation/company-research-assist";
import { generateTopicCandidates } from "@/brain/evaluation/generate-topic-candidates";
import { polishTopicCandidateTitles } from "@/brain/evaluation/gtc/topic-title-polish";
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
import {
  assertCsvRectangular,
  CsvShapeError,
  parseCsv,
} from "@/lib/dev/parse-csv";

const DEFAULT_FIXTURE = defaultFixtureAbsolute();

const RECENT_LIMIT = 12;

function assertDev(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab is production-impossible");
  }
}

function fixtureHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export type RunIdeaLabCandidatesInput = {
  marketingFocus?: unknown;
  fixturePath?: string;
  /**
   * When true (or INDUSTRY_RESEARCH_LIVE=true), call Perplexity once to expand
   * typed industry opportunities into context before the sole generator runs.
   * Default false — CSV industry evidence still feeds the pipeline.
   */
  liveIndustryResearch?: boolean;
  /**
   * Optional validated company-research-import-v1 for this run only.
   * Never writes history or CSV.
   */
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
 * Idea Lab stage 1: ranked topic candidates from CSV + objective.
 * Never generates six directions and never writes Lab topic history
 * (complete, limited, or insufficient_context).
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

  const fixturePath = input.fixturePath ?? DEFAULT_FIXTURE;
  const historyRepositoryPath = getIdeaLabHistoryPath();

  let text: string;
  try {
    text = readFileSync(fixturePath, "utf8");
  } catch (err) {
    return {
      ok: false,
      code: "FIXTURE_ERROR",
      error: err instanceof Error ? err.message : "CSV load failed",
      status: 500,
    };
  }

  const hash = fixtureHash(text);

  try {
    const grid = parseCsv(text);
    assertCsvRectangular(grid);
  } catch (err) {
    const msg =
      err instanceof CsvShapeError
        ? err.message
        : err instanceof Error
          ? err.message
          : "CSV shape invalid";
    return { ok: false, code: "CSV_INVALID", error: msg, status: 400 };
  }

  let context = parseFixtureCsv(text);
  if (!context) {
    return {
      ok: false,
      code: "FIXTURE_ERROR",
      error: "parseFixtureCsv returned null",
      status: 400,
    };
  }

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

  const { identity } = getBrandCore(context.domain, { context });

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

  // Novelty uses Lab history titles only — generation itself never writes history
  const deterministic = generateTopicCandidates({
    context,
    objective,
    recentTitles,
    industryOpportunities,
  });

  // Optional expression polish only — never changes meaning, scores, or ranks
  const polished = await polishTopicCandidateTitles({
    generation: deterministic,
    context,
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
