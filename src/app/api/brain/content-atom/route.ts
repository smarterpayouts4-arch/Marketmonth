import { NextResponse } from "next/server";

import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import { buildContentAtomFromHandoff } from "@/brain/use-cases/build-content-atom-from-handoff";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { rateLimitKeyFromRequest } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

type Body = {
  domain?: string;
  handoff?: ContentDirectionsHandoffV1;
  selectedVariationId?: string;
};

/**
 * Transport only: validate HTTP body → Brain use case → JSON response.
 * Atom path is deterministic (preferLlm: false), matching Studio production.
 */
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content-atom",
    rateLimitKeyFromRequest(request)
  );
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.handoff) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "handoff with masterTopic and variations is required (save a selected direction first)",
      },
      { status: 400 }
    );
  }

  const atomDomain = body.domain?.trim() || body.handoff.brand.domain || "";
  if (atomDomain) {
    const access = await requireCompanyAccess(session.userId, atomDomain);
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: access.status }
      );
    }
  }

  const outcome = await buildContentAtomFromHandoff({
    domain: atomDomain,
    handoff: body.handoff,
    selectedVariationId: body.selectedVariationId,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.error,
        ...(outcome.errors ? { errors: outcome.errors } : {}),
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atom: outcome.atom,
    brandCore: {
      version: outcome.brandCore.version,
      brand_name: outcome.brandCore.brand_name,
      domain: outcome.brandCore.domain,
    },
    meta: {
      provider: outcome.provider,
      status: outcome.atom.status,
    },
  });
}
