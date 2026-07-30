"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { TopicCandidate } from "@/brain/evaluation/topic-candidate-types";
import { AtomReviewPanel } from "@/components/dashboard/content/atom-review-panel";
import { TopicCandidatesPanel } from "@/components/topic-candidates";

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
  const [topicCategory, setTopicCategoryId] = useState<TopicCategoryId | null>(
    null
  );

  const displayBrand = brandName.trim() || "your brand";

  const {
    topicDraft,
    setTopicDraft,
    readyResult,
    selectedVariationId,
    loading,
    loadingCandidates,
    regenerating,
    error,
    similarTopicNotice,
    historyPersistNotice,
    showStartOver,
    selectVariation,
    createFromTopic,
    autoGenerate,
    selectCandidate,
    regenerateIdeas,
    startOver,
    confirmDirectionAndBuildAtom,
    candidates,
    candidateCompleteness,
    candidateWarnings,
    candidateDiagnostic,
    selectedCandidateId,
    hasCandidates,
    hasInsufficient,
    atom,
    atomValidation,
    atomRecordRevision,
    loadingAtom,
    reviewingAtom,
    approveMtAtom,
    requestMtAtomChanges,
    clearAtomStage,
  } = useContentDirections({
    brandName: displayBrand,
    domain,
    canGenerate,
  });

  async function handleGenerate() {
    setPendingMode("manual");
    try {
      await createFromTopic(contextState, topicCategory);
    } finally {
      setPendingMode(null);
    }
  }

  async function handleAutoGenerate() {
    setPendingMode("automatic");
    try {
      await autoGenerate(contextState, topicCategory);
    } finally {
      setPendingMode(null);
    }
  }

  async function handleRegenerate() {
    setPendingMode("manual");
    try {
      await regenerateIdeas(contextState, topicCategory);
    } finally {
      setPendingMode(null);
    }
  }

  async function handleConfirmDirection(variationId: string) {
    selectVariation(variationId);
    const extraSummary =
      buildExtraContextPayload(contextState)?.text.trim() || undefined;
    await confirmDirectionAndBuildAtom(variationId, {
      topicCategory,
      extraContextSummary: extraSummary,
    });
  }

  async function handleApproveAtom(
    ack?: Parameters<typeof approveMtAtom>[0]
  ) {
    const next = await approveMtAtom(ack);
    if (next?.approvalStatus === "locked") {
      router.push(
        `/content?atomId=${encodeURIComponent(next.atom_id)}`
      );
    }
  }

  async function handleSelectCandidate(candidate: TopicCandidate) {
    setPendingMode("automatic");
    try {
      await selectCandidate(candidate, contextState, topicCategory);
    } finally {
      setPendingMode(null);
    }
  }

  const hasDirections = Boolean(readyResult) && !atom && !loadingAtom;

  return (
    <div className="w-full animate-fade-in pb-2">
      <MarketingTopicHeader compact={hasDirections || Boolean(atom)} />

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

      {!atom ? (
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
            loading={loading || loadingAtom}
            generateDisabled={!canGenerate}
            compact={hasDirections}
            topicCategory={topicCategory}
            onTopicCategoryIdChange={setTopicCategoryId}
            contextExpanded={contextExpanded}
            onContextExpandedChange={setContextExpanded}
            contextState={contextState}
            onContextChange={setContextState}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {similarTopicNotice ? (
        <p className="mt-2 text-xs text-text-muted" role="status">
          {similarTopicNotice}
        </p>
      ) : null}

      {historyPersistNotice ? (
        <p className="mt-2 text-xs text-warning" role="status">
          {historyPersistNotice}
        </p>
      ) : null}

      {loadingAtom ? (
        <div
          className="mt-4 rounded-xl border border-border bg-card p-6 shadow-soft"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <p className="mt-3 text-sm text-text-secondary">
            Building Content Atom…
          </p>
        </div>
      ) : null}

      {atom ? (
        <div className="mt-4" data-testid="marketing-topic-atom-stage">
          <AtomReviewPanel
            atom={atom}
            validation={atomValidation}
            recordRevision={atomRecordRevision ?? undefined}
            busy={reviewingAtom}
            onApprove={(ack) => {
              void handleApproveAtom(ack);
            }}
            onRequestChanges={() => {
              void requestMtAtomChanges();
            }}
            onBackToDirections={clearAtomStage}
          />
          {atom.approvalStatus === "locked" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-text-secondary">
                Atom locked. Opening Content Studio…
              </p>
              <a
                href={`/content?atomId=${encodeURIComponent(atom.atom_id)}`}
                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft"
              >
                Open Content Studio
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {!atom && !loadingAtom ? (
        <>
          <TopicCandidatesPanel
            loading={loadingCandidates}
            pendingMode={pendingMode}
            hasCandidates={hasCandidates}
            hasDirections={hasDirections}
            hasInsufficient={hasInsufficient}
            candidates={candidates}
            candidateCompleteness={candidateCompleteness}
            candidateWarnings={candidateWarnings}
            candidateDiagnostic={candidateDiagnostic}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={(c) => {
              void handleSelectCandidate(c);
            }}
            testIdPrefix="marketing-topic-candidates"
            emptyHint=""
          />

          {loading && !loadingCandidates ? (
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
                onConfirm={(id) => {
                  void handleConfirmDirection(id);
                }}
                disabled={loading || loadingAtom}
              />
            </>
          ) : null}

          {readyResult && loading && regenerating ? (
            <ContentVariationGrid
              variations={[...readyResult.variations]}
              selectedVariationId={selectedVariationId}
              onHighlight={selectVariation}
              onConfirm={(id) => {
                void handleConfirmDirection(id);
              }}
              disabled
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
