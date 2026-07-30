import type { ContentAngle } from "@/brain/content/types";
import type { BrandCore } from "@/brain/core/brand-core.schema";
import { resolveBrandCoreIdentity } from "@/brain/core/brand-core-identity";

import { buildAtomEnvelope } from "./build-envelope";
import {
  computeMessageHash,
  contentAtomSchema,
  type ContentAtom,
} from "./content-atom.schema";
import { buildSelectedDirectionContract } from "./direction-contract";
import { runEvidenceSufficiencyPreflight } from "./evidence-sufficiency";
import {
  runAtomValidationPipeline,
  type AtomValidationReport,
} from "./validate";

const ANGLES = new Set<string>([
  "beginner_guide",
  "faq",
  "problem_solution",
  "decision_guide",
  "comparison",
  "trust_transparency",
  "how_it_works",
  "action_oriented",
  "other",
]);

function asAngle(value: string): ContentAngle {
  return (ANGLES.has(value) ? value : "other") as ContentAngle;
}

export type AtomValidation =
  | { ok: true; atom: ContentAtom }
  | { ok: false; errors: string[]; atom?: ContentAtom };

/** Schema + message_hash check (no envelope). */
export function validateContentAtom(input: unknown): AtomValidation {
  const parsed = contentAtomSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "atom"}: ${i.message}`
      ),
    };
  }
  const atom = parsed.data;
  const expectedHash = computeMessageHash(atom);
  if (atom.message_hash !== expectedHash) {
    return {
      ok: false,
      errors: [
        `message_hash mismatch: got ${atom.message_hash}, expected ${expectedHash}`,
      ],
      atom: { ...atom, buildStatus: "invalid" },
    };
  }
  if (
    atom.buildStatus === "invalid" ||
    atom.buildStatus === "draft"
  ) {
    return {
      ok: false,
      errors: [`buildStatus must be complete|limited|insufficient, got ${atom.buildStatus}`],
      atom,
    };
  }
  return { ok: true, atom };
}

/**
 * Re-run closed-world validation against Brand Core proofs.
 * Rebuilds a minimal envelope from the atom lineage + brand core.
 */
export function validateAtomAgainstBrandCore(
  atom: ContentAtom,
  brandCore: BrandCore
): AtomValidation {
  const base = validateContentAtom(atom);
  if (!base.ok && !base.atom) return base;

  const working = base.atom ?? atom;
  const identity = resolveBrandCoreIdentity(brandCore);
  const contract = buildSelectedDirectionContract({
    masterTopic: {
      id: working.lineage.topicId ?? "topic_unknown",
      source: "automatic",
      punchline: working.lineage.masterTitle,
      subheading: "",
      rationale: "",
      evidenceIds: working.safety.allowed_evidence_ids,
      confidence: "medium",
      safety: { status: "safe", reasons: [] },
    },
    variation: {
      id: working.lineage.selectedDirectionId,
      angle: asAngle(working.lineage.angle),
      punchline: working.kernel.central_claim.canonical_wording,
      subheading: "",
      brief: working.kernel.resolution,
      audienceProblem: working.kernel.audience_problem,
      strategicPurpose: working.kernel.resolution,
      evidenceIds: working.safety.allowed_evidence_ids,
      assumptionIds: [],
      confidence: "medium",
      safety: { status: "safe", reasons: [] },
    },
  });
  const preflight = runEvidenceSufficiencyPreflight({ brandCore, contract });
  const envelope = buildAtomEnvelope({
    brandCore,
    identity,
    contract,
    preflight,
    generationId: working.lineage.generationId,
  });

  const report: AtomValidationReport = runAtomValidationPipeline({
    atom: working,
    envelope,
  });

  if (!report.ok) {
    return {
      ok: false,
      errors: report.violations.map((v) => v.message),
      atom: report.atom,
    };
  }
  return { ok: true, atom: report.atom };
}
