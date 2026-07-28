import { NextResponse } from "next/server";

import { onDemandSeoReview } from "@/seo/jobs/on-demand-review";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * On-demand SEO intelligence refresh.
 * Body: { auditsOnly?: boolean }
 * Never auto-applies patches.
 */
export async function POST(req: Request) {
  let auditsOnly = true;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      auditsOnly?: boolean;
    };
    if (typeof body.auditsOnly === "boolean") {
      auditsOnly = body.auditsOnly;
    }
  } catch {
    /* default auditsOnly */
  }

  // Prefer audits-only unless explicitly requesting research with a key present
  if (!auditsOnly && !process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json(
      {
        error:
          "PERPLEXITY_API_KEY required for full research refresh. Retry with auditsOnly: true.",
      },
      { status: 503 }
    );
  }

  try {
    const brief = await onDemandSeoReview(auditsOnly);
    return NextResponse.json({
      ok: true,
      brief: {
        id: brief.id,
        generatedAt: brief.generatedAt,
        kind: brief.kind,
        newCount: brief.newCount,
        highPriorityCount: brief.highPriorityCount,
        changesSincePrevious: brief.changesSincePrevious,
        recommendationCount: brief.recommendations.length,
        snapshotSummary: brief.snapshotSummary,
        recommendations: brief.recommendations,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "SEO refresh failed",
      },
      { status: 500 }
    );
  }
}
