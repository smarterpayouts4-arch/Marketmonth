import type { ContentAtom } from "./content-atom.schema";
import type { AtomValidationReport } from "./validate/types";

export type SpecialtyResearchHandoff = {
  atomId: string;
  topic: string;
  subject: string;
  audienceProblem: string;
  centralClaim: string;
  unresolvedQuestions: string[];
  suggestedChecks: string[];
  verifiedEvidence: string[];
  inferredClaims: string[];
  brandPlacement: "end" | "integrated" | "primary";
};

/**
 * Display-only research handoff for limited atoms. No auto-routing.
 */
export function buildSpecialtyResearchHandoff(
  atom: ContentAtom,
  report?: AtomValidationReport | null
): SpecialtyResearchHandoff | null {
  if (atom.buildStatus !== "limited" && atom.buildStatus !== "insufficient") {
    return null;
  }

  const unresolved = [
    ...atom.missing_information,
    ...(report?.statusReasons
      ?.filter((r) =>
        /research|missing|framework_promise|depth|preflight/i.test(
          `${r.source} ${r.message}`
        )
      )
      .map((r) => r.message) ?? []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const unique = [...new Set(unresolved)].slice(0, 12);

  return {
    atomId: atom.atom_id,
    topic: atom.lineage.masterTitle,
    subject: atom.lineage.specificTopic || atom.lineage.masterTitle,
    audienceProblem: atom.kernel.audience_problem,
    centralClaim: atom.kernel.central_claim.canonical_wording,
    unresolvedQuestions: unique,
    suggestedChecks: [
      "Verify exact comparison criteria with authoritative sources",
      "Confirm which label concepts can be stated precisely from evidence",
      "Do not introduce treatment or outcome claims",
    ],
    verifiedEvidence: atom.kernel.supporting_proof.map((p) => p.evidence_id),
    inferredClaims: atom.claimLedger.claims
      .filter((c) => c.classification === "inferred")
      .map((c) => c.statement)
      .slice(0, 8),
    brandPlacement: "end",
  };
}
