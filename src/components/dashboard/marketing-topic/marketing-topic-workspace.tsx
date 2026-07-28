"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { MarketingFocus } from "@/brain/content/marketing-focus";

import { ContentVariationGrid } from "./content-variation-grid";
import {
  buildExtraContextPayload,
  emptyExtraContextUi,
  type ExtraContextUiState,
} from "./extra-context-client";
import { useContentDirections } from "./hooks/use-content-directions";
import { MarketingTopicHeader } from "./marketing-topic-header";
import { TopicCreationCard } from "./topic-creation-card";
import { VariationGridLoading } from "./variation-grid-loading";

type MarketingTopicWorkspaceProps = {
  brandName: string;
  domain: string | null;
  canGenerate: boolean;
};

export function MarketingTopicWorkspace({
  brandName,
  domain,
  canGenerate,
}: MarketingTopicWorkspaceProps) {
  const router = useRouter();
  const [pendingMode, setPendingMode] = useState<"automatic" | "manual" | null>(
    null
  );
  const [contextExpanded, setContextExpanded] = useState(false);
  const [contextState, setContextState] = useState<ExtraContextUiState>(
    emptyExtraContextUi
  );
  const [marketingFocus, setMarketingFocus] = useState<MarketingFocus | null>(
    null
  );

  const displayBrand = brandName.trim() || "your brand";

  const {
    topicDraft,
    setTopicDraft,
    readyResult,
    selectedVariationId,
    loading,
    regenerating,
    error,
    similarTopicNotice,
    historyPersistNotice,
    showStartOver,
    selectVariation,
    createFromTopic,
    autoGenerate,
    regenerateIdeas,
    startOver,
    saveSelectedDirection,
  } = useContentDirections({
    brandName: displayBrand,
    domain,
    canGenerate,
  });

  async function handleGenerate() {
    setPendingMode("manual");
    try {
      await createFromTopic(contextState, marketingFocus);
    } finally {
      setPendingMode(null);
    }
  }

  async function handleAutoGenerate() {
    setPendingMode("automatic");
    try {
      await autoGenerate(contextState, marketingFocus);
    } finally {
      setPendingMode(null);
    }
  }

  async function handleRegenerate() {
    setPendingMode("manual");
    try {
      await regenerateIdeas(contextState, marketingFocus);
    } finally {
      setPendingMode(null);
    }
  }

  function handleConfirmDirection(variationId: string) {
    selectVariation(variationId);
    const extraSummary =
      buildExtraContextPayload(contextState)?.text.trim() || undefined;
    const saved = saveSelectedDirection(variationId, {
      marketingFocus,
      extraContextSummary: extraSummary,
    });
    if (saved) {
      router.push("/content");
    }
  }

  const hasDirections = Boolean(readyResult);

  return (
    <div className="w-full animate-fade-in pb-2">
      <MarketingTopicHeader compact={hasDirections} />

      {!canGenerate ? (
        <div className="mt-2.5 rounded-xl border border-dashed border-border bg-card/60 px-4 py-2.5 text-sm text-text-secondary">
          Add a brand website so we can ground topics in your context.{" "}
          <Link
            href="/brand"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Open Brand
          </Link>
        </div>
      ) : null}

      <div className="mt-3">
        <TopicCreationCard
          topic={topicDraft}
          onTopicChange={setTopicDraft}
          onGenerate={() => {
            void handleGenerate();
          }}
          onAutoGenerate={() => {
            void handleAutoGenerate();
          }}
          onStartOver={startOver}
          onRegenerateIdeas={() => {
            void handleRegenerate();
          }}
          showStartOver={showStartOver}
          showRegenerate={hasDirections}
          loading={loading}
          generateDisabled={!canGenerate}
          compact={hasDirections}
          marketingFocus={marketingFocus}
          onMarketingFocusChange={setMarketingFocus}
          contextExpanded={contextExpanded}
          onContextExpandedChange={setContextExpanded}
          contextState={contextState}
          onContextChange={setContextState}
        />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {similarTopicNotice ? (
        <p className="mt-2 text-xs text-text-muted" role="status">
          {similarTopicNotice}
        </p>
      ) : null}

      {historyPersistNotice ? (
        <p className="mt-2 text-xs text-amber-800" role="status">
          {historyPersistNotice}
        </p>
      ) : null}

      {loading ? (
        <VariationGridLoading
          mode={pendingMode}
          brandName={displayBrand}
          regenerating={regenerating}
        />
      ) : null}

      {readyResult && !loading ? (
        <>
          {readyResult.warnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-text-muted">
              {readyResult.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <ContentVariationGrid
            variations={[...readyResult.variations]}
            selectedVariationId={selectedVariationId}
            onHighlight={selectVariation}
            onConfirm={handleConfirmDirection}
            disabled={loading}
          />
        </>
      ) : null}

      {readyResult && loading && regenerating ? (
        <ContentVariationGrid
          variations={[...readyResult.variations]}
          selectedVariationId={selectedVariationId}
          onHighlight={selectVariation}
          onConfirm={handleConfirmDirection}
          disabled
        />
      ) : null}
    </div>
  );
}
