import { NextResponse } from "next/server";

import { validateContentDirectionsHandoff } from "@/brain/content/handoff";
import { channelRegistry } from "@/brain/channels/channel-registry";
import { loadHandoffRecord } from "@/brain/store";
import { produceContentFromHandoff } from "@/brain/use-cases/produce-content-from-handoff";

export const runtime = "nodejs";

/**
 * Transport only: validate handoff → Brain production use case → JSON.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const raw = body as {
    handoff?: unknown;
    domain?: string;
    generationId?: string;
    channel?: string;
  };

  const domain = raw.domain?.trim();
  if (!domain) {
    return NextResponse.json(
      { ok: false, error: "domain is required" },
      { status: 400 }
    );
  }

  let handoffSource = raw.handoff;
  const generationId = raw.generationId?.trim();
  if (!handoffSource && generationId) {
    handoffSource = loadHandoffRecord(generationId) ?? undefined;
  }

  const handoffValidation = validateContentDirectionsHandoff(
    handoffSource,
    domain
  );
  if (!handoffValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid content directions handoff",
        errors: handoffValidation.errors,
      },
      { status: 400 }
    );
  }

  const produced = await produceContentFromHandoff({
    handoff: handoffValidation.handoff,
    domain,
    channel: raw.channel,
  });

  if (!produced.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: produced.error,
        errors: produced.errors,
        channel: produced.channel,
        status:
          produced.error === "Adapter not connected yet"
            ? "not_connected"
            : undefined,
      },
      { status: produced.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atom: produced.atom,
    atom_id: produced.atom.atom_id,
    packages: [produced.studioPackage],
    canonicalPackages: {
      youtube_short: produced.youtubeShortPackage,
    },
    brandCoreSummary: {
      name: produced.brandCore.brand_name,
      domain: produced.brandCore.domain,
      voice: produced.brandCore.voice,
      positioning: produced.brandCore.positioning,
      offers: [],
      evidenceCount: 0,
      contextVersion: String(produced.brandCore.version),
    },
    channelRegistry: Object.fromEntries(
      Object.entries(channelRegistry).map(([k, v]) => [
        k,
        { status: v.status, label: v.label },
      ])
    ),
  });
}
