"use client";

/**
 * Thin orchestrator: discovery UI status machine.
 * Specialists live in ./use-discovery/*
 */
import { useCallback, useMemo, useState } from "react";

import {
  applyInvestmentsToStrategy,
  type DiscoveryInvestments,
} from "@/components/discovery/activation";
import { toCardSummary } from "@/components/discovery/to-card-summary";
import type {
  BrandProfileView,
  DetectedLocationView,
  DiscoveryIds,
  DiscoveryStatus,
  StageView,
  StrategyIntentAnswers,
  StrategyPreviewView,
} from "@/components/discovery/types";
import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";
import { DISCOVERY_STAGES } from "@/lib/discovery/stages";
import { postAnalyzeStream, postStrategy } from "./use-discovery/api";
import { persistIds } from "./use-discovery/ids-store";
import { normalizeProfile } from "./use-discovery/norm-profile";

function initialStages(): StageView[] {
  return DISCOVERY_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    status: "pending" as const,
  }));
}

function hostnameFromUrl(raw: string): string | undefined {
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(withProtocol).hostname.replace(/^www\./, "");
    return host || undefined;
  } catch {
    return undefined;
  }
}

export function useDiscovery(options?: {
  onPreviewBrandChange?: (preview: {
    brandName: string;
    coreIdeaHint?: string;
  }) => void;
}) {
  const onPreviewBrandChange = options?.onPreviewBrandChange;
  const [status, setStatus] = useState<DiscoveryStatus>("empty");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<StageView[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfileView | null>(
    null
  );
  const [discoveryNarrative, setDiscoveryNarrative] =
    useState<SocialDiscoveryProfile | null>(null);
  const [strategyPreview, setStrategyPreview] =
    useState<StrategyPreviewView | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [detectedLocations, setDetectedLocations] = useState<
    DetectedLocationView[]
  >([]);
  const [intentAnswers, setIntentAnswers] =
    useState<StrategyIntentAnswers | null>(null);
  const [investments, setInvestments] =
    useState<DiscoveryInvestments | null>(null);
  const [ids, setIds] = useState<DiscoveryIds | null>(null);

  const emitPreview = useCallback(
    (brandName: string, coreIdeaHint?: string) => {
      onPreviewBrandChange?.({ brandName, coreIdeaHint });
    },
    [onPreviewBrandChange]
  );

  const reset = useCallback(() => {
    setStatus("empty");
    setError(null);
    setStages([]);
    setBrandProfile(null);
    setDiscoveryNarrative(null);
    setStrategyPreview(null);
    setPageCount(0);
    setDetectedLocations([]);
    setIntentAnswers(null);
    setInvestments(null);
    setIds(null);
    emitPreview("your brand");
  }, [emitPreview]);

  const analyze = useCallback(
    async (inputUrl: string) => {
      const trimmed = inputUrl.trim();
      if (!trimmed) {
        setError("Enter a website URL");
        setStatus("error");
        return;
      }

      setUrl(trimmed);
      setError(null);
      setStatus("loading");
      setBrandProfile(null);
      setDiscoveryNarrative(null);
      setStrategyPreview(null);
      setPageCount(0);
      setDetectedLocations([]);
      setIntentAnswers(null);
      setInvestments(null);
      setStages(initialStages());
      emitPreview(hostnameFromUrl(trimmed) ?? "your brand");

      try {
        await postAnalyzeStream(trimmed, {
          onStage: (row) => {
            setStages((prev) => {
              const next = [...prev];
              const idx = next.findIndex((s) => s.id === row.id);
              if (idx === -1) next.push(row);
              else next[idx] = row;
              return next;
            });
          },
          onResult: (event) => {
            const profile = normalizeProfile({
              ...event.brandProfile,
              marketingOpportunity:
                event.marketingOpportunity ||
                event.brandProfile.marketingOpportunity,
            });
            const nextIds = {
              analysisId: event.analysisId,
              brandProfileId: event.brandProfileId,
            };
            setBrandProfile(profile);
            setDiscoveryNarrative(event.discoveryNarrative ?? null);
            setIds(nextIds);
            persistIds(nextIds);
            if (typeof event.pageCount === "number") {
              setPageCount(event.pageCount);
            }
            setDetectedLocations(event.detectedLocations ?? []);
            const summary = toCardSummary(profile);
            emitPreview(profile.businessName, summary.coreOffering);
            setStatus("result");
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Discovery failed");
        setStatus("error");
      }
    },
    [emitPreview]
  );

  const goToResult = useCallback(() => {
    if (brandProfile) setStatus("result");
  }, [brandProfile]);

  const submitIntent = useCallback(
    async (
      answers: StrategyIntentAnswers,
      nextInvestments?: DiscoveryInvestments | null
    ) => {
      if (!brandProfile || !ids) return;

      setIntentAnswers(answers);
      if (nextInvestments) setInvestments(nextInvestments);
      setStatus("generating_strategy");
      setError(null);

      try {
        const data = await postStrategy({
          brandProfileId: ids.brandProfileId,
          brandProfile,
          answers,
        });

        const preview = nextInvestments
          ? applyInvestmentsToStrategy(data.strategyPreview, nextInvestments)
          : answers.cadenceLevel
            ? applyInvestmentsToStrategy(data.strategyPreview, {
                cadenceLevel: answers.cadenceLevel,
                channels: answers.channels ?? [],
                pillarId: answers.growthDirection,
                contentDirectionEdit: answers.brandCoreEdit,
              })
            : data.strategyPreview;

        setStrategyPreview(preview);
        setPageCount(data.pageCount);
        setIds((prev) => {
          const next = {
            analysisId: prev?.analysisId ?? "",
            brandProfileId: data.brandProfileId ?? prev?.brandProfileId ?? "",
            strategyPreviewId: data.strategyPreviewId,
          };
          persistIds(next);
          return next;
        });
        setStatus("strategy");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Strategy failed");
        setStatus("result");
      }
    },
    [brandProfile, ids]
  );

  const summary = brandProfile ? toCardSummary(brandProfile) : null;
  const defaultPromoteFirst = summary?.coreOffering ?? "";

  const previewBrandName = useMemo(() => {
    if (brandProfile?.businessName) return brandProfile.businessName;
    return hostnameFromUrl(url) ?? "your brand";
  }, [brandProfile, url]);

  return {
    status,
    url,
    setUrl,
    error,
    stages,
    brandProfile,
    discoveryNarrative,
    strategyPreview,
    pageCount,
    detectedLocations,
    intentAnswers,
    investments,
    ids,
    defaultPromoteFirst,
    foundAudience: summary?.audience ?? "",
    foundOffer: summary?.coreOffering ?? "",
    foundPresence: summary?.activeChannels ?? [],
    previewBrandName,
    coreIdeaHint: summary?.coreOffering,
    analyze,
    goToResult,
    submitIntent,
    reset,
  };
}
