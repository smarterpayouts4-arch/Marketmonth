"use client";

import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import { PhaseTabBar } from "@/components/dashboard/phase-tab-bar";
import type { DashboardPhase, HomePhaseStatus } from "@/data/mock-brand";
import { useDevWorkspace } from "@/lib/dev/use-dev-workspace";
import { cn } from "@/lib/utils";

import { AlternateRenders } from "./alternate-renders";
import { ChannelPreview } from "./channel-preview";
import {
  ContentGenerateAction,
  ContentPrimaryActions,
} from "./content-actions";
import { ContentChannelTabs } from "./content-channel-tabs";
import { ContentEmptyState } from "./content-empty-state";
import { ContentErrorState } from "./content-error-state";
import { ContentFormatTabs } from "./content-format-tabs";
import { ContentStudioHeader } from "./content-studio-header";
import { useContentStudio } from "./hooks/use-content-studio";
import { PipelineThinking } from "./pipeline-thinking";
import { PromptInspector } from "./prompt-inspector/prompt-inspector";

type ContentStudioProps = {
  promptInspectorEnabled: boolean;
};

function studioPhaseStatuses(
  handoffReady: boolean
): Record<DashboardPhase, HomePhaseStatus> {
  return {
    "marketing-topic": handoffReady ? "complete" : "not_started",
    content: "active",
    review: "not_started",
    results: "not_started",
  };
}

export function ContentStudio({
  promptInspectorEnabled,
}: ContentStudioProps) {
  const router = useRouter();
  const workspace = useDevWorkspace();
  const domain = workspace?.website
    ? workspace.website
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
    : null;

  const brandName =
    workspace?.companyName?.trim() ||
    workspace?.dashboardBrand?.companyName?.trim() ||
    "Your brand";

  const studio = useContentStudio({ domain });
  const initialRequested = useRef(false);

  const onHandoffReady = useEffectEvent(() => {
    if (initialRequested.current) return;
    if (studio.handoffState.status !== "ready") return;
    if (studio.atom || studio.loadingAtom) return;
    initialRequested.current = true;
    void studio.loadInitial();
  });

  useEffect(() => {
    onHandoffReady();
  }, [studio.handoffState.status, studio.atom, studio.loadingAtom]);

  const statuses = useMemo(
    () => studioPhaseStatuses(studio.handoffState.status === "ready"),
    [studio.handoffState.status]
  );

  function handlePhaseChange(phase: DashboardPhase) {
    if (phase === "content") return;
    if (phase === "marketing-topic") {
      router.push("/dashboard?phase=marketing-topic");
      return;
    }
    if (phase === "review") {
      router.push("/review");
      return;
    }
    if (phase === "results") {
      router.push("/analytics");
    }
  }

  if (!workspace) {
    return (
      <div className="mx-auto w-full max-w-[1400px] py-8" aria-busy>
        <p className="text-sm text-text-secondary" aria-live="polite">
          Loading workspace…
        </p>
      </div>
    );
  }

  if (studio.handoffState.status === "loading") {
    return (
      <div className="w-full py-2">
        <PhaseTabBar
          activePhase="content"
          statuses={statuses}
          onChange={handlePhaseChange}
        />
        <p className="mt-6 text-sm text-text-secondary" aria-live="polite">
          Checking saved topic selection…
        </p>
      </div>
    );
  }

  if (studio.handoffState.status === "missing") {
    return (
      <div className="w-full py-2">
        <PhaseTabBar
          activePhase="content"
          statuses={statuses}
          onChange={handlePhaseChange}
        />
        <div className="mt-6">
          <ContentEmptyState />
        </div>
      </div>
    );
  }

  if (studio.handoffState.status === "invalid") {
    return (
      <div className="w-full py-2">
        <PhaseTabBar
          activePhase="content"
          statuses={statuses}
          onChange={handlePhaseChange}
        />
        <div className="mt-6">
          <ContentEmptyState
            title="Saved topic selection is invalid"
            description="The Marketing Topic handoff could not be validated for this brand. Return and save a direction again."
            errors={studio.handoffState.errors}
          />
        </div>
      </div>
    );
  }

  const handoff = studio.handoffState.handoff;
  const displayBrand = handoff.brand.name || brandName;
  const selectedAsset = studio.selectedAsset;
  const previewPkg = studio.displayPackage;

  return (
    <div
      data-studio-shell
      className="flex h-auto min-h-0 w-full flex-col gap-1.5 lg:h-full lg:overflow-hidden"
    >
      <div className="shrink-0">
        <PhaseTabBar
          activePhase="content"
          statuses={statuses}
          onChange={handlePhaseChange}
        />
      </div>

      <ContentStudioHeader
        actions={
          <ContentPrimaryActions
            onSaveDraft={() => {
              studio.saveDraft();
            }}
            canContinue={studio.packageValid}
            draftSavedAt={studio.draftSavedAt}
          />
        }
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3 lg:gap-4",
          promptInspectorEnabled
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(280px,32%)]"
            : "grid-cols-1"
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
          <div className="shrink-0 space-y-1">
            <ContentChannelTabs
              active={studio.channel}
              onChange={studio.selectChannel}
            />
            {studio.formats.length > 1 ? (
              <ContentFormatTabs
                channel={studio.channel}
                formats={studio.formats}
                active={studio.format}
                onChange={studio.selectFormat}
              />
            ) : null}
            <PipelineThinking
              stage={
                studio.loadingAtom
                  ? "atom"
                  : studio.updatingPackage
                    ? "youtube_short"
                    : "idle"
              }
            />
          </div>

          {studio.error && studio.channelEnabled ? (
            <div className="shrink-0">
              <ContentErrorState
                message={studio.error}
                onRetry={() => {
                  void studio.retry();
                }}
              />
            </div>
          ) : null}

          {!studio.channelEnabled ? (
            <div
              className="mx-auto flex min-h-[380px] w-full max-w-[720px] flex-1 flex-col items-start justify-center rounded-xl border border-dashed border-border bg-card p-6 shadow-soft"
              role="status"
            >
              <p className="text-sm font-medium text-foreground">
                Adapter not connected yet
              </p>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                This channel is registered but has no specialist. Only YouTube
                Short can generate packages right now — other tabs will not
                invent content.
              </p>
            </div>
          ) : null}

          {studio.channelEnabled && studio.loadingAtom && !previewPkg ? (
            <div
              className="mx-auto min-h-[380px] w-full max-w-[720px] flex-1 rounded-xl border border-border bg-card p-6 shadow-soft"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
              <p className="mt-3 text-sm text-text-secondary">
                Building Content Atom and YouTube Short package…
              </p>
            </div>
          ) : null}

          {studio.channelEnabled && previewPkg ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <ChannelPreview
                channel={studio.channel}
                pkg={previewPkg}
                brandName={displayBrand}
                headlineOverride={selectedAsset?.headline}
                updating={studio.updatingPackage}
              />
              <div className="mt-auto shrink-0 space-y-1.5 pt-3">
                <AlternateRenders
                  assets={previewPkg.alternateAssets}
                  selectedId={studio.selectedAssetId}
                  onSelect={studio.selectAsset}
                />
                <ContentGenerateAction
                  onGenerateNew={() => {
                    void studio.generateNew();
                  }}
                  disabled={studio.loadingAtom || studio.updatingPackage}
                />
              </div>
            </div>
          ) : null}
        </div>

        {promptInspectorEnabled ? (
          <div className="flex min-h-0 min-w-0 flex-col max-lg:mt-2 lg:h-full">
            <div className="min-h-0 flex-1 lg:hidden">
              <details className="h-full">
                <summary className="cursor-pointer list-none rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-text-secondary shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Prompt Inspector (dev only)
                </summary>
                <div className="mt-2 h-[min(70vh,520px)]">
                  <PromptInspector
                    handoff={handoff}
                    atom={studio.atom}
                    pkg={studio.activePackage ?? previewPkg}
                    channel={studio.channel}
                  />
                </div>
              </details>
            </div>
            <div className="hidden min-h-0 flex-1 lg:flex lg:h-full">
              <PromptInspector
                handoff={handoff}
                atom={studio.atom}
                pkg={studio.activePackage ?? previewPkg}
                channel={studio.channel}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
