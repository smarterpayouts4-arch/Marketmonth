import { runAllSiteAudits } from "../intelligence/audits/run-all-audits";
import type {
  SeoChangeBrief,
  SeoRecommendation,
} from "../intelligence/contracts/recommendation";
import type { ResearchReport } from "../intelligence/contracts/search-provider";
import { createDefaultResearchProvider } from "../intelligence/providers/perplexity";
import { researchAiCrawlerChanges } from "../intelligence/research/ai-crawler-changes";
import { researchCompetitorPatterns } from "../intelligence/research/competitor-research";
import { researchSearchEngineChanges } from "../intelligence/research/search-engine-changes";
import { researchStructuredDataChanges } from "../intelligence/research/structured-data-changes";
import {
  auditFilesSummary,
  createActionPlan,
} from "../intelligence/recommendations/create-action-plan";
import {
  appendResearchHistory,
  fingerprintFinding,
  readLatestBrief,
  writeLatestBrief,
} from "../intelligence/memory/research-history";
import { applyBriefToStrategyState } from "../intelligence/memory/strategy-state";
import { getProductIdentity } from "../config/product-identity";
import { buildRobots } from "../foundation/robots";
import { buildSitemap } from "../foundation/sitemap";
import { buildLlmsTxt } from "../foundation/llms-document";

export type ReviewKind = SeoChangeBrief["kind"];

export type RunSeoReviewOptions = {
  kind: ReviewKind;
  /** Skip live Perplexity calls (audits-only). Default false. */
  auditsOnly?: boolean;
};

export type RunSeoReviewResult = SeoChangeBrief & {
  researchError?: string;
  carriedForwardCount?: number;
};

function snapshotSummary(): string {
  const identity = getProductIdentity();
  const sitemap = buildSitemap();
  const robots = buildRobots();
  const llmsLen = buildLlmsTxt().length;
  return [
    `Origin: ${identity.canonicalOrigin}`,
    `Sitemap URLs: ${sitemap.length}`,
    `Robots host: ${robots.host ?? "n/a"}`,
    `llms.txt chars: ${llmsLen}`,
  ].join(" | ");
}

function isLocalAuditRec(rec: SeoRecommendation): boolean {
  return rec.evidence?.source === "Local site audit";
}

/** Keep prior research findings when a research provider fails mid-run. */
function carryForwardResearchFindings(
  previous: SeoChangeBrief | null
): SeoRecommendation[] {
  if (!previous) return [];
  const now = new Date().toISOString();
  return previous.recommendations
    .filter((r) => !isLocalAuditRec(r))
    .map((r) => ({ ...r, updatedAt: now }));
}

async function collectResearchReports(): Promise<{
  reports: { report: ResearchReport; surface: string }[];
  error?: string;
}> {
  try {
    const provider = createDefaultResearchProvider();
    const settled = await Promise.allSettled([
      researchSearchEngineChanges(provider),
      researchAiCrawlerChanges(provider),
      researchStructuredDataChanges(provider),
      researchCompetitorPatterns(provider),
    ]);

    const surfaces = [
      "Crawler policy",
      "llms.txt",
      "Structured data",
      "Landing metadata",
    ] as const;

    const reports: { report: ResearchReport; surface: string }[] = [];
    const errors: string[] = [];

    settled.forEach((result, i) => {
      if (result.status === "fulfilled") {
        reports.push({ report: result.value, surface: surfaces[i] });
      } else {
        const msg =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        errors.push(`${surfaces[i]}: ${msg}`);
      }
    });

    if (reports.length === 0 && errors.length > 0) {
      return { reports: [], error: errors.join(" | ") };
    }
    if (errors.length > 0) {
      return {
        reports,
        error: `Partial research failure — ${errors.join(" | ")}`,
      };
    }
    return { reports };
  } catch (err) {
    return {
      reports: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Full SEO review cycle (research → compare → Change Brief).
 * Never auto-applies patches or rewrites doctrine.
 * Research failures do not wipe the last good research state — audits still complete
 * and prior non-audit recommendations are carried forward.
 */
export async function runSeoReview(
  options: RunSeoReviewOptions
): Promise<RunSeoReviewResult> {
  const previousBrief = readLatestBrief();
  const auditIssues = runAllSiteAudits();
  let reports: { report: ResearchReport; surface: string }[] = [];
  let researchError: string | undefined;
  let carriedForward: SeoRecommendation[] = [];

  if (!options.auditsOnly) {
    const collected = await collectResearchReports();
    reports = collected.reports;
    researchError = collected.error;
    if (researchError) {
      carriedForward = carryForwardResearchFindings(previousBrief);
    }
  }

  const brief = createActionPlan({
    kind: options.kind,
    auditIssues,
    reports,
    snapshotSummary: [
      snapshotSummary(),
      auditFilesSummary(auditIssues),
      researchError ? `researchError: ${researchError.slice(0, 200)}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  if (carriedForward.length > 0) {
    const existingFp = new Set(
      brief.recommendations.map((r) => fingerprintFinding(r.finding))
    );
    for (const rec of carriedForward) {
      const fp = fingerprintFinding(rec.finding);
      if (!existingFp.has(fp)) {
        brief.recommendations.push(rec);
        existingFp.add(fp);
      }
    }
    brief.newCount = brief.recommendations.filter(
      (r) => r.status === "New"
    ).length;
    brief.highPriorityCount = brief.recommendations.filter(
      (r) => r.impact === "High"
    ).length;
  }

  writeLatestBrief(brief);
  appendResearchHistory({
    briefId: brief.id,
    generatedAt: brief.generatedAt,
    kind: brief.kind,
    findingFingerprints: brief.recommendations.map((r) =>
      fingerprintFinding(r.finding)
    ),
  });
  applyBriefToStrategyState(brief);

  return {
    ...brief,
    researchError,
    carriedForwardCount: carriedForward.length,
  };
}
