"use client";

import { startTransition, useRef, useState } from "react";

import type {
  AtomValidationReport,
  ContentAtom,
  LimitationsAcknowledgement,
} from "@/brain/atom";
import {
  buildContentDirectionsHandoff,
  summarizeExtraContext,
} from "@/brain/content/handoff";
import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import type {
  TopicCandidate,
  TopicCandidateGenerationResult,
  TopicGenerationDiagnostic,
  TopicGenerationWarning,
} from "@/brain/evaluation/topic-candidate-types";
import {
  selectedTopicContextFromCandidate,
  selectedTopicContextFromTypedTopic,
} from "@/components/topic-candidates/from-candidate";

import { buildContentDirectionsRequest } from "../build-content-directions-request";
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
 * Flow: candidates → directions → build atom → approve/lock → /content?atomId=
 * Does not write Studio localStorage handoff pointers.
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

  const [candidates, setCandidates] = useState<TopicCandidate[] | null>(null);
  const [candidateCompleteness, setCandidateCompleteness] = useState<
    "complete" | "limited" | null
  >(null);
  const [candidateWarnings, setCandidateWarnings] = useState<
    TopicGenerationWarning[]
  >([]);
  const [candidateDiagnostic, setCandidateDiagnostic] =
    useState<TopicGenerationDiagnostic | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null
  );
  const [selectedTopicContext, setSelectedTopicContext] =
    useState<SelectedTopicContext | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [atom, setAtom] = useState<ContentAtom | null>(null);
  const [atomValidation, setAtomValidation] =
    useState<AtomValidationReport | null>(null);
  const [atomRecordRevision, setAtomRecordRevision] = useState<number | null>(
    null
  );
  const [loadingAtom, setLoadingAtom] = useState(false);
  const [reviewingAtom, setReviewingAtom] = useState(false);
  const atomRequestIdRef = useRef(0);

  const lastFocusRef = useRef<TopicCategoryId | null>(null);
  const lastExtraSummaryRef = useRef<string | undefined>(undefined);
  const lastContextRef = useRef<ExtraContextUiState | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastModeRef = useRef<"automatic" | "manual">("automatic");
  const generationIdRef = useRef<string | null>(null);
  const selectedTopicContextRef = useRef<SelectedTopicContext | null>(null);

  const loading = sessionStatus === "generating" || loadingCandidates;
  const regenerating = sessionStatus === "generating" && Boolean(readyResult);
  const effectiveTopic = topicDraft;

  function invalidateInFlight() {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function clearCandidateStage() {
    setCandidates(null);
    setCandidateCompleteness(null);
    setCandidateWarnings([]);
    setCandidateDiagnostic(null);
    setSelectedCandidateId(null);
    setSelectedTopicContext(null);
    selectedTopicContextRef.current = null;
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
    setLoadingCandidates(false);
    clearCandidateStage();
    setAtom(null);
    setAtomValidation(null);
    setAtomRecordRevision(null);
    setLoadingAtom(false);
    setReviewingAtom(false);
    atomRequestIdRef.current += 1;

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

  async function fetchTopicCandidates(
    topicCategory: TopicCategoryId
  ): Promise<void> {
    if (!canGenerate || !domain) {
      setError("Add a brand website to unlock generation.");
      setSessionStatus("error");
      return;
    }

    invalidateInFlight();
    const requestId = requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    lastFocusRef.current = topicCategory;
    lastModeRef.current = "automatic";
    setError(null);
    setSimilarTopicNotice(null);
    setHistoryPersistNotice(null);
    setSavedNotice(null);
    setReadyResult(null);
    setSelectedVariationId(null);
    clearCandidateStage();
    setLoadingCandidates(true);
    setSessionStatus("idle");

    try {
      const res = await fetch("/api/brain/topic-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, topicCategory }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: TopicCandidateGenerationResult;
      };

      if (requestIdRef.current !== requestId) return;

      if (!res.ok || !data.ok || !data.result) {
        setError(data.error ?? "Could not rank topic candidates");
        setSessionStatus("error");
        return;
      }

      const result = data.result;
      if (result.status === "insufficient_context") {
        setCandidates(null);
        setCandidateCompleteness(null);
        setCandidateWarnings([]);
        setCandidateDiagnostic(result.diagnostic);
        return;
      }

      setCandidates(result.candidates);
      setCandidateCompleteness(result.completeness);
      setCandidateWarnings(result.warnings ?? []);
      setCandidateDiagnostic(null);
    } catch {
      if (controller.signal.aborted) return;
      if (requestIdRef.current !== requestId) return;
      setError("Network error while ranking topic candidates");
      setSessionStatus("error");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (requestIdRef.current === requestId) {
        setLoadingCandidates(false);
      }
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
    selectedTopicContext?: SelectedTopicContext;
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
          : args.selectedTopicContext?.masterTitle ??
            (args.mode === "manual" ? topicDraft : undefined),
      topicCategory: args.topicCategory,
      contextState: args.contextState,
      generationReason: args.generationReason,
      parentGenerationId: args.parentGenerationId ?? undefined,
      lockedMasterTopic: args.lockedMasterTopic,
      selectedTopicContext: args.selectedTopicContext,
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
    lastContextRef.current = args.contextState;
    lastModeRef.current = args.mode;
    if (args.selectedTopicContext) {
      selectedTopicContextRef.current = args.selectedTopicContext;
      setSelectedTopicContext(args.selectedTopicContext);
    }

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

  async function confirmDirectionAndBuildAtom(
    variationId?: string,
    opts?: {
      topicCategory?: TopicCategoryId | null;
      extraContextSummary?: string;
    }
  ): Promise<boolean> {
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

    setSelectedVariationId(id);
    setSavedNotice(null);

    const gid = generationIdRef.current ?? generationId;
    if (gid) {
      void fetch("/api/brain/topic-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "continue",
          generationId: gid,
          selectedDirectionId: id,
          selectedTopicContext:
            selectedTopicContextRef.current ?? selectedTopicContext ?? undefined,
          handoff: built.handoff,
        }),
      }).catch(() => {
        /* history update is best-effort */
      });
    }

    atomRequestIdRef.current += 1;
    const requestId = atomRequestIdRef.current;
    setLoadingAtom(true);
    setError(null);
    setAtom(null);
    setAtomValidation(null);
    try {
      const res = await fetch("/api/brain/content-atom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoff: built.handoff,
          domain,
          selectedVariationId: id,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        atom?: ContentAtom;
        validation?: AtomValidationReport;
        recordRevision?: number;
        error?: string;
      };
      if (atomRequestIdRef.current !== requestId) return false;
      if (!res.ok || !data.ok || !data.atom) {
        setError(data.error ?? "Content Atom build failed");
        return false;
      }
      setAtom(data.atom);
      setAtomValidation(data.validation ?? null);
      setAtomRecordRevision(data.recordRevision ?? 1);
      return true;
    } catch {
      if (atomRequestIdRef.current !== requestId) return false;
      setError("Network error while building Content Atom");
      return false;
    } finally {
      if (atomRequestIdRef.current === requestId) {
        setLoadingAtom(false);
      }
    }
  }

  async function reviewMtAtom(
    action: "approve" | "request_changes" | "reject",
    limitationsAcknowledgement?: LimitationsAcknowledgement
  ): Promise<ContentAtom | null> {
    if (!atom || !domain) return null;
    setReviewingAtom(true);
    setError(null);
    try {
      const res = await fetch("/api/brain/content-atom/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atomId: atom.atom_id,
          domain: atom.lineage.companyId || domain,
          action,
          expectedRevision: atomRecordRevision ?? undefined,
          limitationsAcknowledgement,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        atom?: ContentAtom;
        recordRevision?: number;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.atom) {
        setError(data.error ?? "Atom review failed");
        return null;
      }
      setAtom(data.atom);
      setAtomRecordRevision(data.recordRevision ?? atomRecordRevision);
      return data.atom;
    } catch {
      setError("Network error while reviewing Content Atom");
      return null;
    } finally {
      setReviewingAtom(false);
    }
  }

  function clearAtomStage() {
    setAtom(null);
    setAtomValidation(null);
    setAtomRecordRevision(null);
  }

  const selectedVariation =
    readyResult?.variations.find((v) => v.id === selectedVariationId) ?? null;

  const showStartOver =
    sessionStatus !== "idle" ||
    Boolean(topicDraft.trim()) ||
    Boolean(error) ||
    Boolean(readyResult) ||
    Boolean(candidates) ||
    Boolean(candidateDiagnostic) ||
    Boolean(atom);

  const hasCandidates = Boolean(candidates && candidates.length > 0);
  const hasInsufficient = Boolean(candidateDiagnostic);

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
    loadingCandidates,
    regenerating,
    error,
    savedNotice,
    similarTopicNotice,
    historyPersistNotice,
    sessionStatus,
    showStartOver,
    generationId,
    candidates,
    candidateCompleteness,
    candidateWarnings,
    candidateDiagnostic,
    selectedCandidateId,
    selectedTopicContext,
    hasCandidates,
    hasInsufficient,
    selectVariation,
    startOver,
    createFromTopic: async (
      ctx: ExtraContextUiState,
      focus: TopicCategoryId | null
    ) => {
      if (!focus) {
        setError("Please select what you want this topic to accomplish.");
        setSessionStatus("error");
        return;
      }
      const title = topicDraft.trim();
      if (!title) {
        setError("Enter a topic to create directions.");
        setSessionStatus("error");
        return;
      }
      clearCandidateStage();
      const typed = selectedTopicContextFromTypedTopic(title, focus);
      return requestDirections({
        mode: "manual",
        contextState: ctx,
        topicCategory: focus,
        generationReason: "manual",
        clearCards: true,
        selectedTopicContext: typed,
      });
    },
    autoGenerate: async (
      ctx: ExtraContextUiState,
      focus: TopicCategoryId | null
    ) => {
      if (!focus) {
        setError("Please select what you want this topic to accomplish.");
        setSessionStatus("error");
        return;
      }
      lastContextRef.current = ctx;
      return fetchTopicCandidates(focus);
    },
    selectCandidate: async (
      candidate: TopicCandidate,
      ctx: ExtraContextUiState,
      focus: TopicCategoryId | null
    ) => {
      if (!focus) {
        setError("Please select what you want this topic to accomplish.");
        setSessionStatus("error");
        return;
      }
      setSelectedCandidateId(candidate.topicId);
      setTopicDraft(candidate.title);
      const stc = selectedTopicContextFromCandidate(candidate, focus);
      return requestDirections({
        mode: "automatic",
        contextState: ctx,
        topicCategory: focus,
        generationReason: "automatic",
        clearCards: true,
        selectedTopicContext: stc,
      });
    },
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
        selectedTopicContext:
          selectedTopicContextRef.current ?? selectedTopicContext ?? undefined,
      });
    },
    atom,
    atomValidation,
    atomRecordRevision,
    loadingAtom,
    reviewingAtom,
    confirmDirectionAndBuildAtom,
    approveMtAtom: (ack?: LimitationsAcknowledgement) =>
      reviewMtAtom("approve", ack),
    requestMtAtomChanges: () => reviewMtAtom("request_changes"),
    clearAtomStage,
  };
}
