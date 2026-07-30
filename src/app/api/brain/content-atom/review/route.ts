import { NextResponse } from "next/server";

import { deriveLimitations } from "@/brain/atom";
import type { AtomApprovalAction, LimitationsAcknowledgement } from "@/brain/store";
import { createAtomRepository } from "@/brain/store";
import { reviewContentAtom } from "@/brain/use-cases/review-content-atom";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

const ACTIONS = new Set<AtomApprovalAction>([
  "approve",
  "request_changes",
  "reject",
  "revise",
]);

type Body = {
  atomId?: string;
  domain?: string;
  companyId?: string;
  action?: string;
  expectedRevision?: number;
  note?: string;
  limitationsAcknowledgement?: LimitationsAcknowledgement;
};

/**
 * Transport: human review → approval.ts transitions → persist locked version.
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

  const atomId = body.atomId?.trim();
  const companyId = (body.companyId ?? body.domain)?.trim();
  const action = body.action?.trim() as AtomApprovalAction | undefined;

  if (!atomId) {
    return NextResponse.json(
      { ok: false, error: "atomId is required" },
      { status: 400 }
    );
  }
  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: "domain / companyId is required" },
      { status: 400 }
    );
  }
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json(
      {
        ok: false,
        error: "action must be approve | request_changes | reject | revise",
      },
      { status: 400 }
    );
  }

  const access = await requireCompanyAccess(session.userId, companyId);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content-atom.review",
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

  if (action === "approve") {
    const current = await createAtomRepository().getById(atomId, companyId);
    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Atom not found" },
        { status: 404 }
      );
    }
    if (current.atom.buildStatus === "limited") {
      const ack = body.limitationsAcknowledgement;
      if (
        !ack ||
        !Array.isArray(ack.limitations) ||
        ack.limitations.length === 0 ||
        !ack.acknowledgedAt?.trim()
      ) {
        const limitations = deriveLimitations(
          current.atom,
          current.validation_report
        );
        return NextResponse.json(
          {
            ok: false,
            error:
              "limited atom requires limitationsAcknowledgement with acknowledgedAt and limitations",
            limitations,
          },
          { status: 400 }
        );
      }
    }
  }

  const outcome = await reviewContentAtom({
    atomId,
    companyId,
    action,
    expectedRevision: body.expectedRevision,
    note: body.note,
    limitationsAcknowledgement: body.limitationsAcknowledgement,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atom: outcome.atom,
    recordRevision: outcome.recordRevision,
    meta: {
      buildStatus: outcome.atom.buildStatus,
      approvalStatus: outcome.atom.approvalStatus,
    },
  });
}
