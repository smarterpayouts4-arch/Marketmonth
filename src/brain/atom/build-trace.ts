import { createHash } from "node:crypto";

/**
 * Durable atom build trace — references + execution metadata only.
 * Never stores a copy of the atom body (canonical truth stays in the store).
 */

export type AtomBuildTrace = {
  kind: "atom_build_trace";
  companyId: string;
  brandCoreId: string;
  brandCoreHash: string;
  brandCoreVersion: string | number;
  topicId?: string;
  directionId: string;
  buildPolicyVersion: string;
  promptVersion?: string;
  evidenceAdmissionPolicyVersion?: string;
  model?: string;
  path: "deterministic" | "model_assisted";
  admittedEvidenceIds: string[];
  /** Refs + role/reason only — never full proof text. */
  admittedEvidence?: Array<{ proof_id: string; role: string; reason: string }>;
  rejectedEvidence?: Array<{ proof_id: string; reason: string }>;
  validationStatus: string;
  gateSummary: { passed: number; warned: number; failed: number };
  repairAttempts: number;
  timingMs: number;
  atomId: string;
  atomVersion: number;
  reportHash?: string;
  approvalStatus: string;
  buildKey?: string;
  createdAt: string;
};

export function summarizeGates(
  gateResults: Array<{ outcome: string }>
): AtomBuildTrace["gateSummary"] {
  let passed = 0;
  let warned = 0;
  let failed = 0;
  for (const g of gateResults) {
    if (g.outcome === "pass") passed += 1;
    else if (g.outcome === "warn") warned += 1;
    else if (g.outcome === "fail") failed += 1;
  }
  return { passed, warned, failed };
}

export function hashReportRef(report: {
  buildStatus: string;
  violations: unknown[];
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        buildStatus: report.buildStatus,
        n: report.violations.length,
      })
    )
    .digest("hex")
    .slice(0, 16);
}
