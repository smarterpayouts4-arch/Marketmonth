import { NextResponse } from "next/server";

import { parseMarketingFocus } from "@/brain/content/marketing-focus";
import { getBrandCoreRepository } from "@/brain/core";
import { generateTopicCandidates } from "@/brain/evaluation/generate-topic-candidates";

export const runtime = "nodejs";

type Body = {
  domain?: string;
  marketingFocus?: string;
  fixturePath?: string;
};

/**
 * Product topic-candidate entry — same generator as Idea Lab.
 * Does not write history.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const domain = body.domain?.trim();
  if (!domain) {
    return NextResponse.json(
      { ok: false, error: "domain is required" },
      { status: 400 }
    );
  }

  const focusParsed = parseMarketingFocus(body.marketingFocus);
  if (!focusParsed.ok) {
    return NextResponse.json(
      { ok: false, error: focusParsed.error },
      { status: 400 }
    );
  }
  if (!focusParsed.value) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please select what you want this topic to accomplish.",
      },
      { status: 400 }
    );
  }

  let loaded;
  try {
    loaded = getBrandCoreRepository().getBrandCore(domain, {
      fixturePath: body.fixturePath,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Brand Core load failed",
      },
      { status: 500 }
    );
  }

  const result = generateTopicCandidates({
    context: loaded.context,
    objective: focusParsed.value,
    includeIndustryResearch: false,
  });

  return NextResponse.json({
    ok: true,
    result,
    meta: {
      domain,
      marketingFocus: focusParsed.value,
      brandCoreId: loaded.identity.company_id,
      brandCoreHash: loaded.identity.brand_core_hash,
      source: loaded.source,
    },
  });
}
