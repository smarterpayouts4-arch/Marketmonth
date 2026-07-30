"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { AtomValidationReport, ContentAtom } from "@/brain/atom";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import { REQUIRED_VARIATION_COUNT } from "@/brain/content/types";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { CompanyResearchImportV1 } from "@/brain/evaluation/company-research-assist";
import type {
  IdeaLabInspectResult,
  IdeaLabRun,
} from "@/brain/evaluation/idea-lab.types";
import type {
  IdeaLabCandidatesResult,
  TopicCandidate,
  TopicGenerationDiagnostic,
  TopicGenerationWarning,
} from "@/brain/evaluation/topic-candidate-types";
import {
  emptyExtraContextUi,
  type ExtraContextUiState,
} from "@/components/dashboard/marketing-topic/extra-context-client";

import { mapIdeaCandidateToVariation } from "./map-idea-to-variation";

const LAB_COMPANY_ID = "zynava.com";

const OBJECTIVE_REQUIRED_MESSAGE =
  "Please select what you want this topic to accomplish.";

function plainError(message: string, inspect: IdeaLabInspectResult | null): string {
  if (/csv|shape|cells|row/i.test(message)) {
    return "The CSV structure is invalid. Open Test Inspector for details.";
  }
  if (inspect?.parseError || /fixture|read|ENOENT/i.test(message)) {
    return "The Zynava fixture could not be read. Open Test Inspector for details.";
  }
  return message;
}

/** State + API orchestration for Idea Lab sandbox (not presentational). */
export function useIdeaLabSandbox() {
  const [inspect, setInspect] = useState<IdeaLabInspectResult | null>(null);
  const [run, setRun] = useState<IdeaLabRun | null>(null);
  const [runs, setRuns] = useState<IdeaLabRun[]>([]);
  const [topicDraft, setTopicDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingMode, setPendingMode] = useState<"automatic" | "manual" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<TopicCandidate[] | null>(null);
  const [candidateCompleteness, setCandidateCompleteness] = useState<
    "complete" | "limited" | null
  >(null);
  const [candidateWarnings, setCandidateWarnings] = useState<
    TopicGenerationWarning[]
  >([]);
  const [candidateDiagnostic, setCandidateDiagnostic] =
    useState<TopicGenerationDiagnostic | null>(null);
  const [lastCandidatesResult, setLastCandidatesResult] =
    useState<IdeaLabCandidatesResult | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null
  );
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [showPaths, setShowPaths] = useState(false);

  const [topicCategory, setTopicCategoryId] = useState<TopicCategoryId | null>(
    null
  );
  const [contextExpanded, setContextExpanded] = useState(false);
  const [contextState, setContextState] = useState<ExtraContextUiState>(
    emptyExtraContextUi
  );

  const [researchPrompt, setResearchPrompt] = useState<string | null>(null);
  const [researchPaste, setResearchPaste] = useState("");
  const [researchImport, setResearchImport] =
    useState<CompanyResearchImportV1 | null>(null);
  const [researchStatus, setResearchStatus] = useState<
    "idle" | "ready" | "error"
  >("idle");
  const [researchMessage, setResearchMessage] = useState<string | null>(null);
  const [loadingResearchPrompt, setLoadingResearchPrompt] = useState(false);

  const [atom, setAtom] = useState<ContentAtom | null>(null);
  const [atomValidation, setAtomValidation] =
    useState<AtomValidationReport | null>(null);
  const [atomRecordRevision, setAtomRecordRevision] = useState<number | null>(
    null
  );
  const [loadingAtom, setLoadingAtom] = useState(false);
  const [reviewingAtom, setReviewingAtom] = useState(false);
  const atomRequestIdRef = useRef(0);

  const refreshInspect = useCallback(async () => {
    const res = await fetch("/api/dev/brain/idea-lab/generate");
    const data = (await res.json()) as {
      ok: boolean;
      inspect?: IdeaLabInspectResult;
      error?: string;
    };
    if (!data.ok || !data.inspect) {
      setError(plainError(data.error ?? "Inspect failed", null));
      return;
    }
    setInspect(data.inspect);
    if (data.inspect.parseError) {
      setError(
        "The CSV structure is invalid. Open Test Inspector for details."
      );
    }
  }, []);

  const refreshRuns = useCallback(async () => {
    const res = await fetch("/api/dev/brain/idea-lab/runs");
    const data = (await res.json()) as { ok: boolean; runs?: IdeaLabRun[] };
    if (data.ok && data.runs) setRuns(data.runs);
  }, []);

  const openInspector = () => {
    setInspectorOpen(true);
    void refreshInspect();
    void refreshRuns();
  };

  const handleFocusChange = (value: TopicCategoryId | null) => {
    setTopicCategoryId(value);
    if (value) setFocusError(null);
  };

  const buildResearchPrompt = async () => {
    if (!topicCategory) {
      setFocusError(OBJECTIVE_REQUIRED_MESSAGE);
      setResearchStatus("error");
      setResearchMessage(OBJECTIVE_REQUIRED_MESSAGE);
      return;
    }
    setLoadingResearchPrompt(true);
    setResearchMessage(null);
    try {
      const res = await fetch("/api/dev/brain/idea-lab/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "research_prompt",
          topicCategory,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        prompt?: string;
        code?: string;
        error?: string;
      };
      if (!data.ok || !data.prompt) {
        if (data.code === "TOPIC_OBJECTIVE_REQUIRED") {
          setFocusError(data.error ?? OBJECTIVE_REQUIRED_MESSAGE);
        }
        setResearchStatus("error");
        setResearchMessage(data.error ?? "Could not build research prompt");
        return;
      }
      setResearchPrompt(data.prompt);
      setResearchStatus("idle");
      setResearchMessage("Prompt ready — copy into ChatGPT or Gemini.");
    } finally {
      setLoadingResearchPrompt(false);
    }
  };

  const copyResearchPrompt = async () => {
    if (!researchPrompt) {
      await buildResearchPrompt();
      return;
    }
    try {
      await navigator.clipboard.writeText(researchPrompt);
      setResearchMessage("Prompt copied.");
    } catch {
      setResearchMessage("Copy failed — select the prompt preview manually.");
    }
  };

  const validateResearchImport = async () => {
    setResearchMessage(null);
    const res = await fetch("/api/dev/brain/idea-lab/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: "research_validate",
        researchPaste,
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      researchImport?: CompanyResearchImportV1;
      findingCount?: number;
      error?: string;
    };
    if (!data.ok || !data.researchImport) {
      setResearchImport(null);
      setResearchStatus("error");
      setResearchMessage(data.error ?? "Invalid research import");
      return;
    }
    setResearchImport(data.researchImport);
    setResearchStatus("ready");
    setResearchMessage(
      `Validated ${data.findingCount ?? data.researchImport.findings.length} finding(s). Run Auto-generate to apply.`
    );
  };

  const clearResearchAssist = () => {
    setResearchPrompt(null);
    setResearchPaste("");
    setResearchImport(null);
    setResearchStatus("idle");
    setResearchMessage(null);
  };

  const generateCandidates = async () => {
    if (!topicCategory) {
      setFocusError(OBJECTIVE_REQUIRED_MESSAGE);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setFocusError(null);
    setPendingMode("automatic");
    setRun(null);
    setSelectedIdeaId(null);
    setSelectedCandidateId(null);
    setCandidates(null);
    setCandidateCompleteness(null);
    setCandidateWarnings([]);
    setCandidateDiagnostic(null);
    setLastCandidatesResult(null);
    try {
      const res = await fetch("/api/dev/brain/idea-lab/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "candidates",
          topicCategory,
          ...(researchImport ? { researchImport } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        stage?: string;
        candidates?: IdeaLabCandidatesResult;
        code?: string;
        error?: string;
      };
      if (!data.ok || !data.candidates) {
        if (data.code === "TOPIC_OBJECTIVE_REQUIRED") {
          setFocusError(data.error ?? OBJECTIVE_REQUIRED_MESSAGE);
          return;
        }
        setError(plainError(data.error ?? "Candidate generate failed", inspect));
        return;
      }
      const result = data.candidates;
      setLastCandidatesResult(result);
      if (result.generation.status === "insufficient_context") {
        setCandidates([]);
        setCandidateCompleteness(null);
        setCandidateWarnings([]);
        setCandidateDiagnostic(result.generation.diagnostic);
        setTopicDraft("");
        return;
      }
      setCandidates(result.candidates);
      setCandidateCompleteness(result.generation.completeness);
      setCandidateWarnings([...result.generation.warnings]);
      setCandidateDiagnostic(null);
      setTopicDraft("");
    } finally {
      setLoading(false);
      setPendingMode(null);
    }
  };

  const generateDirections = async (args: {
    masterTitle: string;
    candidate?: TopicCandidate | null;
  }) => {
    if (!topicCategory) {
      setFocusError(OBJECTIVE_REQUIRED_MESSAGE);
      return;
    }
    if (!args.masterTitle.trim()) {
      setError("Enter or select a topic before generating directions.");
      return;
    }

    setLoading(true);
    setError(null);
    setPendingMode("manual");
    try {
      const selectedTopicContext = {
        topicId:
          args.candidate?.topicId ??
          selectedCandidateId ??
          `typed_${Date.now().toString(36)}`,
        masterTitle: args.masterTitle,
        objective: topicCategory,
        audience: args.candidate?.audience,
        audiencePain: args.candidate?.audiencePain,
        strategicAngle: args.candidate?.strategicAngle,
        relevanceReasons: args.candidate?.relevanceReasons,
        evidenceIds: args.candidate?.evidenceIds,
        subjectLabel: args.candidate?.subject?.label,
      };
      const res = await fetch("/api/dev/brain/idea-lab/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "directions",
          topicCategory,
          selectedTopicContext,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        run?: IdeaLabRun;
        code?: string;
        error?: string;
      };
      if (!data.ok || !data.run) {
        if (data.code === "TOPIC_OBJECTIVE_REQUIRED") {
          setFocusError(data.error ?? OBJECTIVE_REQUIRED_MESSAGE);
          return;
        }
        setError(plainError(data.error ?? "Generate failed", inspect));
        return;
      }
      setRun(data.run);
      setTopicDraft(data.run.generation.masterTopic || args.masterTitle);
      setSelectedIdeaId(null);
      if (data.run.historyWarning && data.run.generationSucceeded) {
        setError(data.run.historyWarning);
      } else if (
        data.run.generationSucceeded &&
        data.run.historyPersisted === false
      ) {
        setError(
          data.run.persistenceError
            ? `Ideas generated, but Lab history was not persisted: ${data.run.persistenceError}`
            : "Ideas generated, but Lab history was not persisted."
        );
      }
      await refreshRuns();
      await refreshInspect();
    } finally {
      setLoading(false);
      setPendingMode(null);
    }
  };

  const onSelectCandidate = (candidate: TopicCandidate) => {
    setSelectedCandidateId(candidate.topicId);
    setTopicDraft(candidate.title);
    void generateDirections({
      masterTitle: candidate.title,
      candidate,
    });
  };

  const resetLabHistory = () => {
    if (
      !confirm(
        "Clear only Idea Lab history? Product topic history is untouched."
      )
    ) {
      return;
    }
    void (async () => {
      const res = await fetch("/api/dev/brain/idea-lab/runs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_lab_history" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Reset Lab History failed");
        return;
      }
      await refreshInspect();
    })();
  };

  const variations = useMemo(
    () => (run?.generation.ideas ?? []).map(mapIdeaCandidateToVariation),
    [run]
  );

  const selectedIdea = run?.generation.ideas.find(
    (i) => i.id === selectedIdeaId
  );
  const selectedTitle =
    selectedIdea?.specificTopic ||
    selectedIdea?.punchline ||
    "Selected idea";

  const buildLabHandoff = useCallback(
    (ideaId: string): ContentDirectionsHandoffV1 | null => {
      if (!run || variations.length !== REQUIRED_VARIATION_COUNT) return null;
      if (!variations.some((v) => v.id === ideaId)) return null;
      const domain =
        run.contextSummary.website?.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ||
        LAB_COMPANY_ID;
      return {
        version: 1,
        generationId: run.runId,
        contextVersion: run.brandCoreSummary.brandCoreHash,
        brand: {
          name: run.contextSummary.brandName,
          domain,
        },
        mode: "manual",
        masterTopic: {
          id: run.directionLineage?.selectedTopicId ?? `lab_${run.runId}`,
          source: "manual",
          punchline: run.generation.masterTopic,
          subheading: "",
          rationale: run.generation.masterTopicRationale ?? "",
          evidenceIds: [],
          confidence: "medium",
          safety: { status: "safe", reasons: [] },
        },
        variations: variations as ContentDirectionsHandoffV1["variations"],
        selectedVariationId: ideaId,
        selectedAt: new Date().toISOString(),
        ...(topicCategory ? { topicCategory } : {}),
      };
    },
    [run, topicCategory, variations]
  );

  const stampAtomTrace = useCallback(
    (nextAtom: ContentAtom, status: "success" | "error") => {
      setRun((prev) => {
        if (!prev) return prev;
        const step = {
          step: (prev.trace?.length ?? 0) + 1,
          stage: "atom",
          modulePath: "src/brain/use-cases/build-content-atom-from-handoff.ts",
          symbol: "buildContentAtomFromHandoff",
          status,
          completedAt: new Date().toISOString(),
          outputSummary: {
            atomId: nextAtom.atom_id,
            buildStatus: nextAtom.buildStatus,
            approvalStatus: nextAtom.approvalStatus,
          },
        };
        return { ...prev, trace: [...(prev.trace ?? []), step] };
      });
    },
    []
  );

  const confirmDirectionAndBuildAtom = async (ideaId: string) => {
    setSelectedIdeaId(ideaId);
    const handoff = buildLabHandoff(ideaId);
    if (!handoff) {
      setError("Select a direction from the six ideas before building an atom.");
      return;
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
          handoff,
          domain: handoff.brand.domain,
          selectedVariationId: ideaId,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        atom?: ContentAtom;
        validation?: AtomValidationReport;
        recordRevision?: number;
        error?: string;
      };
      if (atomRequestIdRef.current !== requestId) return;
      if (!res.ok || !data.ok || !data.atom) {
        setError(data.error ?? "Content Atom build failed");
        return;
      }
      setAtom(data.atom);
      setAtomValidation(data.validation ?? null);
      setAtomRecordRevision(data.recordRevision ?? 1);
      stampAtomTrace(data.atom, "success");
    } catch {
      if (atomRequestIdRef.current !== requestId) return;
      setError("Network error while building Content Atom");
    } finally {
      if (atomRequestIdRef.current === requestId) {
        setLoadingAtom(false);
      }
    }
  };

  const reviewLabAtom = async (
    action: "approve" | "request_changes" | "reject",
    limitationsAcknowledgement?: import("@/brain/atom").LimitationsAcknowledgement
  ) => {
    if (!atom) return;
    setReviewingAtom(true);
    setError(null);
    try {
      const res = await fetch("/api/brain/content-atom/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atomId: atom.atom_id,
          domain: atom.lineage.companyId || LAB_COMPANY_ID,
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
        return;
      }
      setAtom(data.atom);
      setAtomRecordRevision(data.recordRevision ?? atomRecordRevision);
    } catch {
      setError("Network error while reviewing Content Atom");
    } finally {
      setReviewingAtom(false);
    }
  };

  const clearAtomStage = () => {
    setAtom(null);
    setAtomValidation(null);
    setAtomRecordRevision(null);
    setSelectedIdeaId(null);
  };

  const hasDirections = variations.length > 0 && !loading && !atom;
  const hasCandidates = Boolean(candidates && candidates.length > 0);
  const hasInsufficient =
    Boolean(candidateDiagnostic) && !hasCandidates && !hasDirections && !atom;
  const fixtureBlocked = Boolean(inspect?.parseError);

  return {
    inspect,
    run,
    runs,
    topicDraft,
    setTopicDraft,
    loading,
    pendingMode,
    error,
    focusError,
    candidates,
    candidateCompleteness,
    candidateWarnings,
    candidateDiagnostic,
    lastCandidatesResult,
    selectedCandidateId,
    selectedIdeaId,
    setSelectedIdeaId,
    inspectorOpen,
    setInspectorOpen,
    compareId,
    setCompareId,
    showPaths,
    setShowPaths,
    topicCategory,
    contextExpanded,
    setContextExpanded,
    contextState,
    setContextState,
    researchPrompt,
    researchPaste,
    setResearchPaste,
    researchImport,
    researchStatus,
    researchMessage,
    loadingResearchPrompt,
    buildResearchPrompt,
    copyResearchPrompt,
    validateResearchImport,
    clearResearchAssist,
    openInspector,
    handleFocusChange,
    generateCandidates,
    generateDirections,
    onSelectCandidate,
    resetLabHistory,
    variations,
    selectedTitle,
    hasDirections,
    hasCandidates,
    hasInsufficient,
    fixtureBlocked,
    atom,
    atomValidation,
    atomRecordRevision,
    loadingAtom,
    reviewingAtom,
    confirmDirectionAndBuildAtom,
    approveLabAtom: (
      ack?: import("@/brain/atom").LimitationsAcknowledgement
    ) => reviewLabAtom("approve", ack),
    requestLabAtomChanges: () => reviewLabAtom("request_changes"),
    clearAtomStage,
  };
}
