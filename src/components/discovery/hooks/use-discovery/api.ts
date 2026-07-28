import type { DiscoveryActivationProfile } from "@/lib/discovery/activation-profile";
import type {
  BrandProfileView,
  DetectedLocationView,
  StageView,
  StrategyIntentAnswers,
  StrategyPreviewView,
} from "@/components/discovery/types";
import { readAnalyzeNdjson } from "./ndjson";

export async function postAnalyzeStream(
  url: string,
  handlers: {
    onStage: (row: StageView) => void;
    onResult: (event: {
      brandProfile: BrandProfileView;
      marketingOpportunity?: string;
      analysisId: string;
      brandProfileId: string;
      pageCount?: number;
      detectedLocations?: DetectedLocationView[];
      activationProfile?: DiscoveryActivationProfile;
    }) => void;
  }
) {
  const res = await fetch("/api/discovery/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Analysis request failed");
  }

  await readAnalyzeNdjson(res.body, handlers);
}

export async function postStrategy(input: {
  brandProfileId: string;
  brandProfile: BrandProfileView;
  answers: StrategyIntentAnswers;
}): Promise<{
  strategyPreview: StrategyPreviewView;
  strategyPreviewId?: string;
  brandProfileId?: string;
  pageCount: number;
}> {
  const res = await fetch("/api/discovery/strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandProfileId: input.brandProfileId,
      brandProfile: input.brandProfile,
      goal: input.answers.goal,
      promoteFirst: input.answers.promoteFirst,
      reach: input.answers.reach,
      targetLocation: input.answers.targetLocation,
      growthDirection: input.answers.growthDirection,
      growthThesis: input.answers.growthThesis,
      buyerTension: input.answers.buyerTension,
      brandCoreEdit: input.answers.brandCoreEdit,
    }),
  });

  const data = (await res.json()) as {
    error?: string;
    strategyPreview?: StrategyPreviewView;
    strategyPreviewId?: string;
    brandProfileId?: string;
    pageCount?: number;
  };

  if (!res.ok || !data.strategyPreview) {
    throw new Error(data.error || "Strategy generation failed");
  }

  return {
    strategyPreview: data.strategyPreview,
    strategyPreviewId: data.strategyPreviewId,
    brandProfileId: data.brandProfileId,
    pageCount: data.pageCount ?? 0,
  };
}
