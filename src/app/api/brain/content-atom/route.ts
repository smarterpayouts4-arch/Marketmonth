import { NextResponse } from "next/server";

import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import { buildContentAtomFromHandoff } from "@/brain/use-cases/build-content-atom-from-handoff";

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

  const outcome = await buildContentAtomFromHandoff({
    domain: body.domain?.trim() || body.handoff.brand.domain || "",
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
