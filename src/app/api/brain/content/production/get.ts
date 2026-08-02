import { NextResponse } from "next/server";

import { PLATFORM_REGISTRY } from "@/brain/content-studio";
import { getContentBundle } from "@/brain/use-cases/produce-content-bundle";

import { requireProductionAuthContext } from "./auth-context";

/**
 * GET — return existing production bundle for atomId (no generation).
 * Auth via atom owner companyId from store.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const atomId = url.searchParams.get("atomId")?.trim();
  if (!atomId) {
    return NextResponse.json(
      { ok: false, error: "atomId is required" },
      { status: 400 }
    );
  }

  const auth = await requireProductionAuthContext({
    request,
    atomId,
    rateLimitAction: "brain.content.production.get",
  });
  if (!auth.ok) return auth.response;

  const outcome = await getContentBundle({ atomId });
  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.error,
        atom: outcome.atom,
        validation: outcome.validationReport ?? null,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    bundle: outcome.bundle,
    atom: outcome.atom,
    validation: outcome.validationReport,
    recordRevision: outcome.recordRevision,
    warnings: outcome.warnings,
    loadedExisting: true,
    platforms: PLATFORM_REGISTRY,
  });
}
