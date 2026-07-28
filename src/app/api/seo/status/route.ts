import { NextResponse } from "next/server";

import { getSeoIntelligenceStatus } from "@/seo/intelligence/status";

export const runtime = "nodejs";

/** Read-only SEO intelligence status — no research on GET. */
export async function GET() {
  try {
    const status = await getSeoIntelligenceStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to read SEO status",
      },
      { status: 500 }
    );
  }
}
