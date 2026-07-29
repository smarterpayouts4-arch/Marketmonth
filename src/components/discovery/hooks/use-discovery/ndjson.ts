import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";
import type {
  BrandProfileView,
  DetectedLocationView,
  StageView,
} from "@/components/discovery/types";

export type AnalyzeStreamEvent = {
  type: string;
  id?: string;
  status?: StageView["status"];
  label?: string;
  message?: string;
  brandProfile?: BrandProfileView;
  marketingOpportunity?: string;
  analysisId?: string;
  brandProfileId?: string;
  pageCount?: number;
  detectedLocations?: DetectedLocationView[];
  discoveryNarrative?: SocialDiscoveryProfile;
};

export async function readAnalyzeNdjson(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onStage: (row: StageView) => void;
    onResult: (event: {
      brandProfile: BrandProfileView;
      marketingOpportunity?: string;
      analysisId: string;
      brandProfileId: string;
      pageCount?: number;
      detectedLocations?: DetectedLocationView[];
      discoveryNarrative?: SocialDiscoveryProfile;
    }) => void;
  }
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as AnalyzeStreamEvent;

      if (event.type === "stage" && event.id && event.label && event.status) {
        handlers.onStage({
          id: event.id,
          label: event.label,
          status: event.status,
        });
      }

      if (event.type === "error") {
        throw new Error(event.message || "Discovery failed");
      }

      if (
        event.type === "result" &&
        event.brandProfile &&
        event.analysisId &&
        event.brandProfileId
      ) {
        handlers.onResult({
          brandProfile: event.brandProfile,
          marketingOpportunity: event.marketingOpportunity,
          analysisId: event.analysisId,
          brandProfileId: event.brandProfileId,
          pageCount: event.pageCount,
          detectedLocations: event.detectedLocations,
          discoveryNarrative: event.discoveryNarrative,
        });
      }
    }
  }
}
