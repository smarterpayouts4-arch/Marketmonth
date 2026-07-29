"use client";

import { startTransition, useRef, useState } from "react";

import {
  buildContentDirectionsHandoff,
  summarizeExtraContext,
} from "@/brain/content/handoff";
import type { TopicCategoryId } from "@/brain/content/topic-category";

import { buildContentDirectionsRequest } from "../build-content-directions-request";
import { saveContentDirectionsHandoff } from "../content-directions-storage";
import type { ExtraContextUiState } from "../extra-context-client";
import type {
  ContentDirectionsApiResponse,
  ReadyDirectionResult,
} from "../types";

type UseContentDirectionsArgs = {
  brandName: string;
  domain: string | null;
  canGenerate: boolean;
};

type SessionStatus = "idle" | "generating" | "ready" | "error";

/**
 * Marketing Topic workspace = ephemeral session only.
 * Never hydrates prior handoff/history into the UI.
 * Content Studio loads saved handoff independently after select+continue.
 */
export function useContentDirections({
  brandName,
  domain,
  canGenerate,
}: UseContentDirectionsArgs) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [readyResult, setReadyResult] = useState<ReadyDirectionResult | null>(
    null
  );
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(
    null
  );
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [similarTopicNotice, setSimilarTopicNotice] = useState<string | null>(
    null
  );
  const [historyPersistNotice, setHistoryPersistNotice] = useState<
    string | null
  >(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const lastFocusRef = useRef<TopicCategoryId | null>(null);
  const lastExtraSummaryRef = useRef<string | undefined>(undefined);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastModeRef = useRef<"automatic" | "manual">("automatic");
  const generationIdRef = useRef<string | null>(null);

  const loading = sessionStatus === "generating";
  const regenerating = loading && Boolean(readyResult);
  const effectiveTopic = topicDraft;

  function invalidateInFlight() {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function startOver() {
    const abandonId = generationIdRef.current;
    invalidateInFlight();
    generationIdRef.current = null;
    setGenerationId(null);
    setSimilarTopicNotice(null);
    setHistoryPersistNotice(null);
    setSavedNotice(null);
    setTopicDraft("");
    setReadyResult(null);
    setSelectedVariationId(null);
    setError(null);
    setSessionStatus("idle");

    if (abandonId) {
      void fetch("/api/brain/topic-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "abandon",
          generationId: abandonId,
        }),
      }).catch(() => {
        /* history abandon is best-effort */
      });
    }
  }

  async function requestDirections(args: {
    mode: "automatic" | "manual";
    contextState: ExtraContextUiState;
    topicCategory: TopicCategoryId | null;
    generationReason?: "manual" | "automatic" | "regenerate";
    lockedMasterTopic?: string;
    parentGenerationId?: string | null;
    clearCards?: boolean;
  }): Promise<void> {
    if (!canGenerate || !domain) {
      setError("Add a brand website to unlock generation.");
      setSessionStatus("error");
      return;
    }

    const built = buildContentDirectionsRequest({
      domain,
      mode: args.mode,
      topic:
        args.generationReason === "regenerate"
          ? args.lockedMasterTopic
          : args.mode === "manual"
            ? topicDraft
            : undefined,
      topicCategory: args.topicCategory,
      contextState: args.contextState,
      generationReason: args.generationReason,
      parentGenerationId: args.parentGenerationId ?? undefined,
      lockedMasterTopic: args.lockedMasterTopic,
    });
    if (!built.ok) {
      setError(built.error);
      setSessionStatus("error");
      return;
    }

    lastFocusRef.current = args.topicCategory;
    lastExtraSummaryRef.current = built.body.extraContext?.text
      ? summarizeExtraContext(built.body.extraContext.text)
      : undefined;
    lastModeRef.current = args.mode;

    invalidateInFlight();
    const requestId = requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    setSimilarTopicNotice(null);
    setHistoryPersistNotice(null);
    setSavedNotice(null);
    setError(null);
    if (args.clearCards) {
      setReadyResult(null);
      setSelectedVariationId(null);
    }
    setSessionStatus("generating");

    try {
      const res = await fetch("/api/brain/content-directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.body),
        signal: controller.signal,
      });
      const data = (await res.json()) as ContentDirectionsApiResponse;

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!res.ok || !data.ok || !data.result) {
        setError(data.error ?? "Could not create content directions");
        setSessionStatus("error");
        return;
      }

      const next = data.result;
      if (next.status === "blocked") {
        setReadyResult(null);
        setSelectedVariationId(null);
        setError(
          next.warnings[0] ??
            `Blocked: ${(next.missingFields ?? []).join(", ") || "unavailable"}`
        );
        setSessionStatus("error");
        return;
      }

      const nextGenerationId = data.meta?.generationId ?? null;
      generationIdRef.current = nextGenerationId;
      setGenerationId(nextGenerationId);
      if (data.meta?.similarTopicNotice) {
        setSimilarTopicNotice(data.meta.similarTopicNotice);
      }
      if (data.meta?.historyPersisted === false) {
        setHistoryPersistNotice(
          data.meta.historyError
            ? `Ideas were created, but topic history was not saved (${data.meta.historyError}). This run cannot be compared later.`
            : "Ideas were created, but topic history was not saved. This run cannot be compared later."
        );
      }

      startTransition(() => {
        if (requestIdRef.current !== requestId) return;
        setTopicDraft(next.masterTopic.punchline);
        setReadyResult(next);
        setSelectedVariationId(null);
        setSessionStatus("ready");
      });
    } catch {
      if (controller.signal.aborted) return;
      if (requestIdRef.current !== requestId) return;
      setError("Network error while creating content directions");
      setSessionStatus("error");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function selectVariation(id: string) {
    setSelectedVariationId(id);
    setSavedNotice(null);
  }

  function saveSelectedDirection(
    variationId?: string,
    opts?: {
      topicCategory?: TopicCategoryId | null;
      extraContextSummary?: string;
    }
  ): boolean {
    const id = variationId ?? selectedVariationId;
    if (!domain || !readyResult || !id) return false;

    const focus = opts?.topicCategory ?? lastFocusRef.current ?? null;
    const extraSummary =
      opts?.extraContextSummary ?? lastExtraSummaryRef.current;

    const built = buildContentDirectionsHandoff({
      result: readyResult,
      selectedVariationId: id,
      brandDomain: domain,
      topicCategory: focus ?? undefined,
      extraContextSummary: extraSummary,
    });
    if (!built.ok) {
      setError(built.errors.join("; "));
      setSessionStatus("error");
      return false;
    }

    saveContentDirectionsHandoff(built.handoff);

    const gid = generationIdRef.current ?? generationId;
    if (gid) {
      void fetch("/api/brain/topic-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "continue",
          generationId: gid,
          selectedDirectionId: id,
        }),
      }).catch(() => {
        /* history update is best-effort */
      });
    }

    setSelectedVariationId(id);
    setSavedNotice(null);
    return true;
  }

  const selectedVariation =
    readyResult?.variations.find((v) => v.id === selectedVariationId) ?? null;

  const showStartOver =
    sessionStatus !== "idle" ||
    Boolean(topicDraft.trim()) ||
    Boolean(error) ||
    Boolean(readyResult);

  return {
    brandName,
    topicDraft: effectiveTopic,
    setTopicDraft,
    result: readyResult,
    readyResult,
    blockedResult: null,
    selectedVariationId,
    selectedVariation,
    loading,
    regenerating,
    error,
    savedNotice,
    similarTopicNotice,
    historyPersistNotice,
    sessionStatus,
    showStartOver,
    generationId,
    selectVariation,
    startOver,
    createFromTopic: (
      ctx: ExtraContextUiState,
      focus: TopicCategoryId | null
    ) =>
      requestDirections({
        mode: "manual",
        contextState: ctx,
        topicCategory: focus,
        generationReason: "manual",
        clearCards: true,
      }),
    autoGenerate: (
      ctx: ExtraContextUiState,
      focus: TopicCategoryId | null
    ) =>
      requestDirections({
        mode: "automatic",
        contextState: ctx,
        topicCategory: focus,
        generationReason: "automatic",
        clearCards: true,
      }),
    regenerateIdeas: (
      ctx: ExtraContextUiState,
      focus: TopicCategoryId | null
    ) => {
      if (!readyResult) return Promise.resolve();
      return requestDirections({
        mode: lastModeRef.current,
        contextState: ctx,
        topicCategory: focus,
        generationReason: "regenerate",
        lockedMasterTopic: readyResult.masterTopic.punchline,
        parentGenerationId: generationIdRef.current ?? generationId,
        clearCards: false,
      });
    },
    saveSelectedDirection,
  };
}
