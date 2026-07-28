import { getSeoIntelligenceStatus } from "../../../../src/seo/intelligence/status";
import { ok, failed, type ToolEnvelope } from "../../contracts/envelope.js";

const MAX_FINDING_CHARS = 280;
const MAX_RECOMMENDATION_CHARS = 240;

function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Allowlisted read of SEO intelligence status / latest brief summary.
 * Intentionally omits: evidence excerpts/URLs, full brief JSON, env values, API keys.
 */
export async function mmSeoStatus(): Promise<ToolEnvelope<unknown>> {
  try {
    const status = await getSeoIntelligenceStatus();
    return ok(
      {
        lastRefreshedAt: status.strategy.lastRefreshedAt,
        stale: status.stale,
        newFindings: status.strategy.newFindings,
        highPriority: status.strategy.highPriority,
        changesSincePrevious: status.strategy.changesSincePrevious,
        briefId: status.latestBrief?.id ?? null,
        recommendationCount: status.latestBrief?.recommendations.length ?? 0,
        topRecommendations:
          status.latestBrief?.recommendations.slice(0, 5).map((r) => ({
            impact: r.impact,
            status: r.status,
            confidence: r.confidence,
            finding: clip(r.finding, MAX_FINDING_CHARS),
            recommendation: clip(r.recommendation, MAX_RECOMMENDATION_CHARS),
            affectedFiles: r.affectedFiles.slice(0, 12),
          })) ?? [],
        phase2: {
          searchConsole: status.phase2Feedback.searchConsole.status,
          bing: status.phase2Feedback.bing.status,
          analytics: status.phase2Feedback.analytics.status,
        },
      },
      { uncertainty: "low", artifactType: "seo_intelligence_status" }
    );
  } catch (err) {
    return failed(err instanceof Error ? err.message : "mm_seo_status failed");
  }
}
