import { z } from "zod";

import { analyzeWebsite, DISCOVERY_STAGES } from "@/engine/discovery";
import type { DiscoveryStreamEvent } from "@/engine/discovery";
import { buildDiscoveryNarrative } from "@/engine/discovery/discovery-narrative";
import { polishDiscoveryDisplayCopy } from "@/engine/discovery/discovery-narrative/polish/polish-display-copy";
import { readCompanyProfileAsync } from "@/lib/company-profile/read-company-profile";
import { recordProvenance } from "@/lib/provenance";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1),
  forceRefresh: z.boolean().optional(),
});

function encode(event: DiscoveryStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Build the discovery card from the company profile artifact.
 * Prefer approved.csv when available; fall back to draft.csv.
 */
async function discoveryNarrativeFromArtifact(companyId: string | undefined) {
  if (!companyId) return null;
  for (const state of ["approved", "draft"] as const) {
    try {
      const projection = await readCompanyProfileAsync(companyId, {
        state,
        branch: "branch-a",
        step: "analyze-route",
      });
      return buildDiscoveryNarrative({ projection });
    } catch {
      // try next state
    }
  }
  recordProvenance({
    branch: "branch-a",
    step: "analyze-route:artifact-miss",
    companyId,
    source: "memory",
    detail: { reason: "no readable approved/draft artifact; used in-memory profile" },
  });
  return null;
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

        const deterministicNarrative =
          (await discoveryNarrativeFromArtifact(result.companyId)) ??
          result.discoveryNarrative ??
          buildDiscoveryNarrative({
            brandProfile: result.brandProfile,
          });

        // Display-only wording pass, applied after the deterministic build so
        // the engine stays pure. Falls through untouched when disabled or on any
        // validation failure.
        const polish = await polishDiscoveryDisplayCopy(deterministicNarrative);
        const discoveryNarrative = polish.profile;
        if (polish.report.enabled || polish.report.error) {
          recordProvenance({
            branch: "branch-a",
            step: "analyze-route:copy-polish",
            companyId: result.companyId ?? "unknown",
            source: "derived",
            detail: {
              enabled: polish.report.enabled,
              model: polish.report.model,
              polished: polish.report.polishedCount,
              candidates: polish.report.candidateCount,
              rejections: polish.report.rejections.map((r) => r.reason),
              ...(polish.report.error ? { error: polish.report.error } : {}),
            },
          });
        }

        send({
          type: "result",
          brandProfile: result.brandProfile,
          marketingOpportunity: result.brandProfile.marketingOpportunity,
          analysisId: result.analysisId,
          brandProfileId: result.brandProfileId,
          cached: result.cached,
          pageCount: result.pageCount ?? 0,
          detectedLocations: result.detectedLocations ?? [],
          discoveryNarrative,
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
