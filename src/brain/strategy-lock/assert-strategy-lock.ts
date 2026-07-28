import {
  beliefShiftHash,
  intendedActionHash,
  payoffHash,
  type ContentAtom,
} from "@/brain/atom";

import type { StrategyLock } from "./strategy-lock.schema";

export type StrategyLockCheck =
  | { ok: true }
  | { ok: false; violations: string[] };

/**
 * Fail-closed: package lock must match current ready atom identity + strategy hashes.
 * Does not require identical wording.
 */
export function assertStrategyLock(
  atom: ContentAtom,
  lock: StrategyLock,
  used?: { claim_ids?: string[]; proof_ids?: string[] }
): StrategyLockCheck {
  const violations: string[] = [];

  if (atom.status !== "ready") {
    violations.push(`atom status must be ready, got ${atom.status}`);
  }
  if (lock.atom_id !== atom.atom_id) {
    violations.push(`atom_id mismatch: ${lock.atom_id} !== ${atom.atom_id}`);
  }
  if (lock.atom_version !== atom.atom_version) {
    violations.push(
      `atom_version mismatch: ${lock.atom_version} !== ${atom.atom_version}`
    );
  }
  if (lock.message_hash !== atom.message_hash) {
    violations.push("message_hash mismatch — stale or altered atom");
  }
  if (String(lock.brand_core_id) !== String(atom.brand_core_id)) {
    violations.push("brand_core_id mismatch");
  }
  if (String(lock.brand_core_version) !== String(atom.brand_core_version)) {
    violations.push("brand_core_version mismatch");
  }
  if (lock.belief_shift_hash !== beliefShiftHash(atom.desired_belief_shift)) {
    violations.push("belief_shift_hash mismatch");
  }
  if (lock.payoff_hash !== payoffHash(atom.promised_payoff)) {
    violations.push("payoff_hash mismatch");
  }
  if (lock.intended_action_hash !== intendedActionHash(atom.intended_action)) {
    violations.push("intended_action_hash mismatch");
  }

  const atomClaimIds = new Set([atom.central_claim.claim_id]);
  const atomProofIds = new Set(atom.supporting_proof.map((p) => p.proof_id));

  for (const id of lock.claim_ids) {
    if (!atomClaimIds.has(id)) {
      violations.push(`unknown claim_id in lock: ${id}`);
    }
  }
  for (const id of lock.proof_ids) {
    if (!atomProofIds.has(id)) {
      violations.push(`unknown proof_id in lock: ${id}`);
    }
  }
  for (const id of used?.claim_ids ?? []) {
    if (!atomClaimIds.has(id)) {
      violations.push(`unknown claim_id used in package: ${id}`);
    }
  }
  for (const id of used?.proof_ids ?? []) {
    if (!atomProofIds.has(id)) {
      violations.push(`unknown proof_id used in package: ${id}`);
    }
  }

  if (violations.length > 0) return { ok: false, violations };
  return { ok: true };
}
