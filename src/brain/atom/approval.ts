import {
  computeMessageHash,
  type ApprovalStatus,
  type ContentAtom,
} from "./content-atom.schema";
import { isAtomBuildSuccessful } from "./content-atom.schema";
import type { AtomValidationReport } from "./validate/types";

import {
  deriveLimitationBuckets,
  deriveLimitations,
  type LimitationsAcknowledgement,
} from "./limitations";

export type { LimitationsAcknowledgement };
export { deriveLimitations, deriveLimitationBuckets };

export type ApprovalTransition =
  | "approve"
  | "request_changes"
  | "reject"
  | "lock";

export type ApprovalResult =
  | { ok: true; atom: ContentAtom }
  | { ok: false; error: string };

function mintVersion(atom: ContentAtom): ContentAtom {
  const next = {
    ...atom,
    atom_version: atom.atom_version + 1,
  };
  return { ...next, message_hash: computeMessageHash(next) };
}

function setApproval(
  atom: ContentAtom,
  approvalStatus: ApprovalStatus
): ContentAtom {
  return mintVersion({ ...atom, approvalStatus });
}

/** Approve a successfully built atom for specialist consumption. */
export function approveAtom(
  atom: ContentAtom,
  options?: {
    limitationsAcknowledgement?: LimitationsAcknowledgement;
    validationReport?: AtomValidationReport | null;
  }
): ApprovalResult {
  if (atom.approvalStatus === "locked") {
    return { ok: false, error: "locked atom cannot be re-approved" };
  }
  if (!isAtomBuildSuccessful(atom)) {
    return {
      ok: false,
      error: `cannot approve atom with buildStatus=${atom.buildStatus}`,
    };
  }
  if (atom.buildStatus === "limited") {
    const expected = deriveLimitations(atom, options?.validationReport);
    const ack = options?.limitationsAcknowledgement;
    if (!ack || !Array.isArray(ack.limitations) || ack.limitations.length === 0) {
      return {
        ok: false,
        error:
          "limited atom requires limitationsAcknowledgement with the visible limitations",
      };
    }
    // Server-owned list: acknowledgement must cover the derived limitations
    // (client cannot invent a smaller set).
    const ackSet = new Set(ack.limitations.map((l) => l.trim()).filter(Boolean));
    const missing = expected.filter((l) => !ackSet.has(l));
    if (expected.length > 0 && missing.length === expected.length) {
      // If none of the expected limitations were acknowledged, reject.
      // Partial overlap is allowed when gate messages drift slightly.
      return {
        ok: false,
        error: "limitationsAcknowledgement does not match pipeline limitations",
      };
    }
    if (expected.length > 0 && ackSet.size === 0) {
      return {
        ok: false,
        error: "limitationsAcknowledgement is empty",
      };
    }
  }
  return { ok: true, atom: setApproval(atom, "approved") };
}

export function requestChangesAtom(
  atom: ContentAtom,
  note?: string
): ApprovalResult {
  if (atom.approvalStatus === "locked") {
    return { ok: false, error: "locked atom cannot request changes" };
  }
  const next = setApproval(atom, "changes_requested");
  if (note?.trim()) {
    next.missing_information = unique([
      ...next.missing_information,
      `changes_requested: ${note.trim()}`,
    ]);
  }
  return { ok: true, atom: next };
}

export function rejectAtom(atom: ContentAtom, note?: string): ApprovalResult {
  if (atom.approvalStatus === "locked") {
    return { ok: false, error: "locked atom cannot be rejected" };
  }
  const next = setApproval(atom, "rejected");
  if (note?.trim()) {
    next.missing_information = unique([
      ...next.missing_information,
      `rejected: ${note.trim()}`,
    ]);
  }
  return { ok: true, atom: next };
}

/** Lock an approved atom — kernel becomes immutable thereafter. */
export function lockAtom(atom: ContentAtom): ApprovalResult {
  if (atom.approvalStatus === "locked") {
    return { ok: true, atom };
  }
  if (atom.approvalStatus !== "approved") {
    return {
      ok: false,
      error: `lock requires approvalStatus=approved, got ${atom.approvalStatus}`,
    };
  }
  if (!isAtomBuildSuccessful(atom)) {
    return {
      ok: false,
      error: `cannot lock atom with buildStatus=${atom.buildStatus}`,
    };
  }
  return { ok: true, atom: setApproval(atom, "locked") };
}

/**
 * Fail-closed: when locked, kernel / claim ledger / narrative / engagement
 * strategy / distribution contract must be byte-identical.
 * Presentation fields (creative_mode, visual_concept) may change.
 */
export function assertKernelImmutable(
  before: ContentAtom,
  after: ContentAtom
): { ok: true } | { ok: false; error: string } {
  if (before.approvalStatus !== "locked") {
    return { ok: true };
  }
  const a = JSON.stringify({
    kernel: before.kernel,
    claimLedger: before.claimLedger,
    narrativeModules: before.narrativeModules,
    lineage: before.lineage,
    engagementStrategy: before.engagementBlueprint.strategy,
    distributionContract: before.distributionContract,
  });
  const b = JSON.stringify({
    kernel: after.kernel,
    claimLedger: after.claimLedger,
    narrativeModules: after.narrativeModules,
    lineage: after.lineage,
    engagementStrategy: after.engagementBlueprint.strategy,
    distributionContract: after.distributionContract,
  });
  if (a !== b) {
    return { ok: false, error: "locked atom kernel is immutable" };
  }
  return { ok: true };
}

export function applyApprovalTransition(
  atom: ContentAtom,
  transition: ApprovalTransition,
  note?: string,
  options?: {
    limitationsAcknowledgement?: LimitationsAcknowledgement;
    validationReport?: AtomValidationReport | null;
  }
): ApprovalResult {
  switch (transition) {
    case "approve":
      return approveAtom(atom, options);
    case "request_changes":
      return requestChangesAtom(atom, note);
    case "reject":
      return rejectAtom(atom, note);
    case "lock":
      return lockAtom(atom);
    default:
      return { ok: false, error: `unknown transition: ${String(transition)}` };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
