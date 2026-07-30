import { NextResponse } from "next/server";

import { selectedTopicContextSchema } from "@/brain/content/direction-writing-context";
import { validateContentDirectionsHandoff } from "@/brain/content/handoff";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import { createTopicGenerationRepository } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

type Body = {
  action?: "select" | "continue" | "abandon";
  generationId?: string;
  selectedDirectionId?: string;
  expectedRevision?: number;
  selectedTopicContext?: unknown;
  handoff?: unknown;
};

/**
 * Update TopicGenerationRecord status after Marketing Topic actions.
 * Does not mutate Brand Core or Brand source CSV.
 *
 * P2.1: production uses the DB-backed repository (the old hard 403 existed
 * because the CSV store was production-impossible); access is gated by
 * session + tenant ownership of the record's company.
 */
export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
    );
  }

  const generationId = new URL(request.url).searchParams
    .get("generationId")
    ?.trim();
  if (!generationId) {
    return NextResponse.json(
      { ok: false, error: "generationId is required" },
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

  const rate = await enforceRateLimit(
    "brain.topic-generation.get",
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId: existing.company_id,
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

  return NextResponse.json({ ok: true, record: existing });
}

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

  const rate = await enforceRateLimit(
    "brain.topic-generation",
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId: existing.company_id,
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
    let selectedTopicContext = undefined;
    if (body.selectedTopicContext !== undefined) {
      const parsed = selectedTopicContextSchema.safeParse(
        body.selectedTopicContext
      );
      if (!parsed.success) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid selectedTopicContext",
            errors: parsed.error.issues.map((i) => i.message),
          },
          { status: 400 }
        );
      }
      selectedTopicContext = parsed.data;
    }

    let handoff: ContentDirectionsHandoffV1 | undefined;
    if (body.handoff !== undefined) {
      const validated = validateContentDirectionsHandoff(
        body.handoff,
        existing.domain
      );
      if (!validated.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid handoff",
            errors: validated.errors,
          },
          { status: 400 }
        );
      }
      handoff = validated.handoff;
    }

    record = await repo.updateStatus({
      generationId,
      status: "continued",
      expectedRevision: record.record_revision,
      selectedTopicContext,
      handoff,
    });
  }

  return NextResponse.json({ ok: true, record });
}
