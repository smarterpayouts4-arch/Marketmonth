import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { ContentVariation, MasterTopic } from "@/brain/content/types";
import type { BrandCore } from "@/brain/core/brand-core.schema";
import { resolveBrandCoreIdentity } from "@/brain/core/brand-core-identity";

import { buildAtomEnvelope } from "./build-envelope";
import {
  hashReportRef,
  summarizeGates,
  type AtomBuildTrace,
} from "./build-trace";
import { atomBuildKeyFromEnvelope } from "./build-key";
import { compileAtomSkeleton } from "./compile";
import type { ContentAtom } from "./content-atom.schema";
import {
  ATOM_PROMPT_VERSION,
  computeMessageHash,
} from "./content-atom.schema";
import { buildSelectedDirectionContract } from "./direction-contract";
import { runEvidenceSufficiencyPreflight } from "./evidence-sufficiency";
import { applyAtomCraftEnrichment } from "./craft-polish";
import {
  applyGeneratedFill,
  generateAtomFromEnvelope,
} from "./generate";
import { repairAtomOnce } from "./repair";
import { runAtomValidationPipeline } from "./validate";
import type { AtomValidationReport } from "./validate";

export type SelectedDirectionInput = {
  masterTopic: MasterTopic;
  variation: ContentVariation;
  selectedTopicContext?: SelectedTopicContext;
  generationId?: string;
  topicCategory?: import("@/brain/content/topic-category").TopicCategoryId;
};

export type BuildContentAtomResult =
  | {
      ok: true;
      atom: ContentAtom;
      report: AtomValidationReport;
      provider: "openai" | "deterministic";
      /** References + execution metadata only — never a copy of the atom. */
      trace: AtomBuildTrace;
    }
  | {
      ok: false;
      errors: string[];
      atom?: ContentAtom;
      report?: AtomValidationReport;
      provider?: "openai" | "deterministic";
      trace?: AtomBuildTrace;
    };

/**
 * Canonical Content Atom builder — contract → preflight → envelope →
 * compile → (optional constrained LLM) → validate → optional repair → status.
 *
 * On LLM failure / thin corpus: returns limited/insufficient atom — never
 * hollow template belief shifts.
 */
export async function buildContentAtom(input: {
  brandCore: BrandCore;
  selected: SelectedDirectionInput;
  preferLlm?: boolean;
  apiKey?: string;
}): Promise<BuildContentAtomResult> {
  const started = Date.now();
  const { brandCore, selected } = input;
  const identity = resolveBrandCoreIdentity(brandCore);
  const contract = buildSelectedDirectionContract({
    masterTopic: selected.masterTopic,
    variation: selected.variation,
    selectedTopicContext: selected.selectedTopicContext,
    topicCategory:
      selected.topicCategory ?? selected.selectedTopicContext?.objective,
  });
  const preflight = runEvidenceSufficiencyPreflight({ brandCore, contract });

  if (preflight.status === "direction_conflict") {
    const envelope = buildAtomEnvelope({
      brandCore,
      identity,
      contract,
      preflight,
      generationId: selected.generationId,
    });
    const skeleton = compileAtomSkeleton(envelope);
    const report = runAtomValidationPipeline({ atom: skeleton, envelope });
    return {
      ok: false,
      errors: report.violations.map((v) => v.message),
      atom: report.atom,
      report,
      provider: "deterministic",
      trace: makeTrace({
        envelope,
        atom: report.atom,
        report,
        provider: "deterministic",
        repairAttempts: 0,
        timingMs: Date.now() - started,
      }),
    };
  }

  const envelope = buildAtomEnvelope({
    brandCore,
    identity,
    contract,
    preflight,
    generationId: selected.generationId,
  });
  let atom = compileAtomSkeleton(envelope);
  let provider: "openai" | "deterministic" = "deterministic";
  let selfAssessed: "complete" | "limited" | "insufficient" | undefined;
  let repairAttempts = 0;

  const preferLlm =
    input.preferLlm === true &&
    preflight.status !== "insufficient" &&
    Boolean(input.apiKey ?? process.env.OPENAI_API_KEY?.trim());

  if (preferLlm) {
    const generated = await generateAtomFromEnvelope({
      envelope,
      skeleton: atom,
      apiKey: input.apiKey,
    });
    if (generated.ok) {
      atom = applyGeneratedFill(atom, generated.fill, envelope);
      atom = {
        ...atom,
        lineage: {
          ...atom.lineage,
          model: generated.model,
          createdBy: "model_assisted",
        },
      };
      atom.message_hash = computeMessageHash(atom);
      provider = "openai";
      selfAssessed = generated.fill.self_assessed_status;

      // Pass 2: fact-locked craft polish (fail-closed → keep pass-1 atom)
      const polished = await applyAtomCraftEnrichment({
        atom,
        envelope,
        apiKey: input.apiKey,
      });
      atom = polished.atom;
    } else {
      // Honest degrade — keep skeleton, mark limited/insufficient via validation.
      atom = {
        ...atom,
        missing_information: unique([
          ...atom.missing_information,
          `llm_unavailable: ${generated.reason}`,
        ]),
      };
      atom.message_hash = computeMessageHash(atom);
      if (preflight.status === "ready") {
        selfAssessed = "limited";
      } else if (preflight.status === "insufficient") {
        selfAssessed = "insufficient";
      } else {
        selfAssessed = "limited";
      }
    }
  } else if (preflight.status === "insufficient") {
    selfAssessed = "insufficient";
  } else {
    // Deterministic-only path: never claim complete from skeleton alone.
    selfAssessed = "limited";
  }

  let report = runAtomValidationPipeline({
    atom,
    envelope,
    selfAssessed,
  });

  if (!report.ok) {
    const repaired = repairAtomOnce({
      atom: report.atom,
      envelope,
      violationPaths: report.violations.map((v) => v.path),
    });
    if (repaired.repaired) {
      repairAttempts = 1;
      report = runAtomValidationPipeline({
        atom: repaired.atom,
        envelope,
        selfAssessed,
      });
    }
  }

  const finalAtom = report.atom;
  const trace = makeTrace({
    envelope,
    atom: finalAtom,
    report,
    provider,
    repairAttempts,
    timingMs: Date.now() - started,
  });
  const buildOk =
    finalAtom.buildStatus === "complete" ||
    finalAtom.buildStatus === "limited" ||
    finalAtom.buildStatus === "insufficient";

  if (!buildOk) {
    return {
      ok: false,
      errors:
        report.violations.length > 0
          ? report.violations.map((v) => v.message)
          : [`atom buildStatus=${finalAtom.buildStatus}`],
      atom: finalAtom,
      report,
      provider,
      trace,
    };
  }

  // insufficient is a successful honest outcome for the builder (ok:true)
  // so Studio can render the thin atom; specialists still gate on readiness.
  return {
    ok: true,
    atom: finalAtom,
    report,
    provider,
    trace,
  };
}

function makeTrace(input: {
  envelope: ReturnType<typeof buildAtomEnvelope>;
  atom: ContentAtom;
  report: AtomValidationReport;
  provider: "openai" | "deterministic";
  repairAttempts: number;
  timingMs: number;
}): AtomBuildTrace {
  const { envelope, atom, report, provider } = input;
  return {
    kind: "atom_build_trace",
    companyId: envelope.identity.company_id,
    brandCoreId: envelope.identity.brand_core_id,
    brandCoreHash: envelope.identity.brand_core_hash,
    brandCoreVersion: envelope.identity.brand_core_version,
    topicId: envelope.topic.topicId ?? envelope.direction.topicId,
    directionId: envelope.direction.directionId,
    buildPolicyVersion: envelope.buildPolicyVersion,
    promptVersion: atom.lineage.promptVersion ?? ATOM_PROMPT_VERSION,
    evidenceAdmissionPolicyVersion: envelope.evidenceAdmissionPolicyVersion,
    model: atom.lineage.model,
    path: provider === "openai" ? "model_assisted" : "deterministic",
    admittedEvidenceIds: [...envelope.preflight.usableEvidenceIds],
    admittedEvidence: (envelope.preflight.admitted ?? []).map((a) => ({
      proof_id: a.proof_id,
      role: a.role,
      reason: a.reason,
    })),
    rejectedEvidence: (envelope.preflight.rejected ?? []).map((r) => ({
      proof_id: r.proof_id,
      reason: r.reason,
    })),
    validationStatus: report.buildStatus,
    gateSummary: summarizeGates(report.gateResults),
    repairAttempts: input.repairAttempts,
    timingMs: input.timingMs,
    atomId: atom.atom_id,
    atomVersion: atom.atom_version,
    reportHash: hashReportRef(report),
    approvalStatus: atom.approvalStatus,
    buildKey: atomBuildKeyFromEnvelope(envelope, ATOM_PROMPT_VERSION),
    createdAt: new Date().toISOString(),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
