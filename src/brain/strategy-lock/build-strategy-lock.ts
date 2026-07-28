import {
  beliefShiftHash,
  intendedActionHash,
  payoffHash,
  type ContentAtom,
} from "@/brain/atom";

import type { StrategyLock } from "./strategy-lock.schema";

export function buildStrategyLock(atom: ContentAtom): StrategyLock {
  return {
    atom_id: atom.atom_id,
    atom_version: atom.atom_version,
    message_hash: atom.message_hash,
    claim_ids: [atom.central_claim.claim_id],
    proof_ids: atom.supporting_proof.map((p) => p.proof_id),
    belief_shift_hash: beliefShiftHash(atom.desired_belief_shift),
    payoff_hash: payoffHash(atom.promised_payoff),
    intended_action_hash: intendedActionHash(atom.intended_action),
    brand_core_id: atom.brand_core_id,
    brand_core_version: atom.brand_core_version,
  };
}
