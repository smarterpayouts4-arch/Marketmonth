import { NextResponse } from "next/server";

import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import { checkTenantTokenCap } from "@/brain/llm/cost-caps";
import { createAtomRepository } from "@/brain/store";
import { buildContentAtomFromHandoff } from "@/brain/use-cases/build-content-atom-from-handoff";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

type Body = {
  domain?: string;
  handoff?: ContentDirectionsHandoffV1;
  selectedVariationId?: string;
};

/**
 * Read-only load by atomId. Auth uses the stored owner companyId —
 * never trust a client-supplied domain for authorization.
 */
export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
    );
  }

  const url = new URL(request.url);
  const atomId = url.searchParams.get("atomId")?.trim();
  if (!atomId) {
    return NextResponse.json(
      { ok: false, error: "atomId is required" },
      { status: 400 }
    );
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return NextResponse.json(
      { ok: false, error: "Atom not found" },
      { status: 404 }
    );
  }

  const companyId = stored.company_id;
  const access = await requireCompanyAccess(session.userId, companyId);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content-atom.get",
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId,
      request,
    })
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

  return NextResponse.json({
    ok: true,
    atom: stored.atom,
    validation: stored.validation_report ?? null,
    recordRevision: stored.record_revision,
    buildKey: stored.build_key ?? null,
    companyId,
    meta: {
      buildStatus: stored.atom.buildStatus,
      approvalStatus: stored.atom.approvalStatus,
    },
  });
}

/**
 * Transport only: auth → rate → use case → JSON.
 */
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
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
  if (!atomDomain) {
    return NextResponse.json(
      { ok: false, error: "domain is required" },
      { status: 400 }
    );
  }

  const access = await requireCompanyAccess(session.userId, atomDomain);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content-atom",
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId: atomDomain,
      request,
    })
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

  const cap = await checkTenantTokenCap(atomDomain);
  if (!cap.ok) {
    const error =
      cap.reason === "cap_store_unavailable"
        ? "LLM cost-cap store unavailable"
        : "Daily LLM token cap exceeded for this company";
    return NextResponse.json(
      {
        ok: false,
        error,
        reason: cap.reason,
        usedTokens: cap.usedTokens,
        capTokens: cap.capTokens,
      },
      { status: 429 }
    );
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
        ...(outcome.report ? { validation: outcome.report } : {}),
        ...(outcome.code ? { code: outcome.code } : {}),
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atom: outcome.atom,
    validation: outcome.report,
    recordRevision: outcome.recordRevision,
    buildKey: outcome.buildKey,
    reusedDraft: outcome.reusedDraft,
    brandCore: {
      version: outcome.brandCore.version,
      brand_name: outcome.brandCore.brand_name,
      domain: outcome.brandCore.domain,
    },
    meta: {
      provider: outcome.provider,
      buildStatus: outcome.atom.buildStatus,
      approvalStatus: outcome.atom.approvalStatus,
    },
  });
}
