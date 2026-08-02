import { NextResponse } from "next/server";

import { createAtomRepository } from "@/brain/store";
import type { StoredContentAtom } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export type ProductionAuthOk = {
  ok: true;
  userId: string | null;
  stored: StoredContentAtom;
  companyId: string;
};

export type ProductionAuthFail = {
  ok: false;
  response: NextResponse;
};

/**
 * Session + atom load + company access + rate limit for production routes.
 * No business logic beyond gatekeeping.
 */
export async function requireProductionAuthContext(args: {
  request: Request;
  atomId: string;
  rateLimitAction: string;
}): Promise<ProductionAuthOk | ProductionAuthFail> {
  const session = await requireApiSession();
  if (!session.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: session.error },
        { status: session.status }
      ),
    };
  }

  const stored = await createAtomRepository().findLatestByAtomId(args.atomId);
  if (!stored) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Atom not found" },
        { status: 404 }
      ),
    };
  }

  const companyId = stored.company_id;
  const access = await requireCompanyAccess(session.userId, companyId);
  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: access.error },
        { status: access.status }
      ),
    };
  }

  const rate = await enforceRateLimit(
    args.rateLimitAction,
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId,
      request: args.request,
    })
  );
  if (!rate.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      ),
    };
  }

  return {
    ok: true,
    userId: session.userId,
    stored,
    companyId,
  };
}
