import { NextResponse } from "next/server";

import { validateContentDirectionsHandoff } from "@/brain/content/handoff";
import { loadHandoffRecord, saveHandoffRecord } from "@/brain/store";

export const runtime = "nodejs";

/**
 * Dev runtime session: persist handoff by generationId.
 * Client keeps IDs in localStorage; server owns the full handoff document.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Session store unavailable in production" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as { handoff?: unknown; domain?: string };
  const validated = validateContentDirectionsHandoff(
    raw.handoff,
    raw.domain?.trim()
  );
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid handoff", errors: validated.errors },
      { status: 400 }
    );
  }

  await saveHandoffRecord(validated.handoff);
  return NextResponse.json({
    ok: true,
    generationId: validated.handoff.generationId,
    selectedVariationId: validated.handoff.selectedVariationId,
    domain: validated.handoff.brand.domain,
  });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Session store unavailable in production" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get("generationId")?.trim();
  const domain = searchParams.get("domain")?.trim();
  if (!generationId) {
    return NextResponse.json(
      { ok: false, error: "generationId is required" },
      { status: 400 }
    );
  }

  const handoff = loadHandoffRecord(generationId);
  if (!handoff) {
    return NextResponse.json(
      { ok: false, error: "Handoff not found" },
      { status: 404 }
    );
  }
  if (domain && handoff.brand.domain !== domain) {
    return NextResponse.json(
      { ok: false, error: "Domain mismatch" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, handoff });
}
