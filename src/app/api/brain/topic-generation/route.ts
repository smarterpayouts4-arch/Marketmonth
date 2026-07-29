import { NextResponse } from "next/server";

import { createTopicGenerationRepository } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { rateLimitKeyFromRequest } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

type Body = {
  action?: "select" | "continue" | "abandon";
  generationId?: string;
  selectedDirectionId?: string;
  expectedRevision?: number;
};

/**
 * Update TopicGenerationRecord status after Marketing Topic actions.
 * Does not mutate Brand Core or Brand source CSV.
 *
 * P2.1: production uses the DB-backed repository (the old hard 403 existed
 * because the CSV store was production-impossible); access is gated by
 * session + tenant ownership of the record's company.
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
    "brain.topic-generation",
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

  const generationId = body.generationId?.trim();
  if (!generationId) {
    return NextResponse.json(
      { ok: false, error: "generationId is required" },
      { status: 400 }
    );
  }

  const action = body.action;
  if (action !== "select" && action !== "continue" && action !== "abandon") {
    return NextResponse.json(
      { ok: false, error: "action must be select, continue, or abandon" },
      { status: 400 }
    );
  }

  const repo = createTopicGenerationRepository();
  const existing = await repo.getById(generationId);
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "generation not found" },
      { status: 404 }
    );
  }

  const access = await requireCompanyAccess(
    session.userId,
    existing.company_id
  );
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }

  const expectedRevision =
    body.expectedRevision ?? existing.record_revision;

  if (action === "abandon") {
    if (existing.status === "continued" || existing.status === "selected") {
      return NextResponse.json({ ok: true, record: existing });
    }
    const record = await repo.updateStatus({
      generationId,
      status: "abandoned",
      expectedRevision,
    });
    return NextResponse.json({ ok: true, record });
  }

  const selectedDirectionId = body.selectedDirectionId?.trim();
  if (!selectedDirectionId) {
    return NextResponse.json(
      { ok: false, error: "selectedDirectionId is required" },
      { status: 400 }
    );
  }

  const known = existing.directions.some(
    (d) => d.direction_id === selectedDirectionId
  );
  if (!known) {
    return NextResponse.json(
      { ok: false, error: "selectedDirectionId is not in this generation" },
      { status: 400 }
    );
  }

  let record = await repo.updateSelection({
    generationId,
    selectedDirectionId,
    expectedRevision,
  });

  if (action === "continue") {
    record = await repo.updateStatus({
      generationId,
      status: "continued",
      expectedRevision: record.record_revision,
    });
  }

  return NextResponse.json({ ok: true, record });
}
