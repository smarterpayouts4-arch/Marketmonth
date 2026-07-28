"use client";

import { useCallback, useMemo, useState } from "react";

import type { MarketingFocus } from "@/brain/content/marketing-focus";
import type { CompanyResearchImportV1 } from "@/brain/evaluation/company-research-assist";
import type {
  IdeaLabInspectResult,
  IdeaLabRun,
} from "@/brain/evaluation/idea-lab.types";
import type { IdeaHumanEvaluation } from "@/brain/evaluation/idea-quality.schema";
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
  const [evals, setEvals] = useState<Record<string, IdeaHumanEvaluation>>({});
  const [evalOpen, setEvalOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [showPaths, setShowPaths] = useState(false);
  const [savingEval, setSavingEval] = useState(false);

  const [marketingFocus, setMarketingFocus] = useState<MarketingFocus | null>(
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

  const handleFocusChange = (value: MarketingFocus | null) => {
    setMarketingFocus(value);
    if (value) setFocusError(null);
  };

  const buildResearchPrompt = async () => {
    if (!marketingFocus) {
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
          marketingFocus,
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
    if (!marketingFocus) {
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
    setEvalOpen(false);
    setEvals({});
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
          marketingFocus,
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
    if (!marketingFocus) {
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
        objective: marketingFocus,
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
          marketingFocus,
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
      setEvalOpen(false);
      setEvals({});
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

  const resetEvaluation = () => {
    setEvals({});
    setSelectedIdeaId(null);
    setEvalOpen(false);
  };

  const resetLabHistory = () => {
    if (
      !confirm(
        "Clear only Idea Lab history? Product topic history is untouched. Evaluation scores stay until you Reset Evaluation."
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

  const saveEvaluation = async () => {
    if (!run || !selectedIdeaId) return;
    setSavingEval(true);
    try {
      const ideas = Object.values(evals);
      const res = await fetch("/api/dev/brain/idea-lab/runs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.runId,
          evaluation: {
            label: "Human evaluation for this run",
            ideas,
            selectedIdeaId,
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        run?: IdeaLabRun;
        error?: string;
      };
      if (!data.ok || !data.run) {
        setError(data.error ?? "Save evaluation failed");
        return;
      }
      setRun(data.run);
      await refreshRuns();
    } finally {
      setSavingEval(false);
    }
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

  const hasDirections = variations.length > 0 && !loading;
  const hasCandidates = Boolean(candidates && candidates.length > 0);
  const hasInsufficient =
    Boolean(candidateDiagnostic) && !hasCandidates && !hasDirections;
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
    evals,
    setEvals,
    evalOpen,
    setEvalOpen,
    inspectorOpen,
    setInspectorOpen,
    compareId,
    setCompareId,
    showPaths,
    setShowPaths,
    savingEval,
    marketingFocus,
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
    resetEvaluation,
    resetLabHistory,
    saveEvaluation,
    variations,
    selectedTitle,
    hasDirections,
    hasCandidates,
    hasInsufficient,
    fixtureBlocked,
  };
}
