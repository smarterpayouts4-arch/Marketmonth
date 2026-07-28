import { z } from "zod";

import { analyzeWebsite, DISCOVERY_STAGES } from "@/engine/discovery";
import type { DiscoveryStreamEvent } from "@/engine/discovery";
import { buildDiscoveryActivationProfile } from "@/engine/discovery/build-activation-profile";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1),
  forceRefresh: z.boolean().optional(),
});

function encode(event: DiscoveryStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: DiscoveryStreamEvent) => {
        controller.enqueue(enc.encode(encode(event)));
      };

      try {
        for (const stage of DISCOVERY_STAGES) {
          send({
            type: "stage",
            id: stage.id,
            status: "pending",
            label: stage.label,
          });
        }

        const result = await analyzeWebsite({
          url: parsed.data.url,
          forceRefresh: parsed.data.forceRefresh === true,
          onStage: (id, status) => {
            const label =
              DISCOVERY_STAGES.find((s) => s.id === id)?.label ?? id;
            send({ type: "stage", id, status, label });
          },
        });

        const activationProfile =
          result.activationProfile ??
          buildDiscoveryActivationProfile({
            brandProfile: result.brandProfile,
            offerHints: [
              ...result.brandProfile.services,
              ...result.brandProfile.products,
            ],
          });

        send({
          type: "result",
          brandProfile: result.brandProfile,
          marketingOpportunity: result.brandProfile.marketingOpportunity,
          analysisId: result.analysisId,
          brandProfileId: result.brandProfileId,
          cached: result.cached,
          pageCount: result.pageCount ?? 0,
          detectedLocations: result.detectedLocations ?? [],
          activationProfile,
        });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Discovery analysis failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
