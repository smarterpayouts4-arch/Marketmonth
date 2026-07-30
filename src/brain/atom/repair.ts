import type { AtomBuildEnvelope } from "./build-envelope";
import {
  computeMessageHash,
  type ContentAtom,
} from "./content-atom.schema";

/** Paths that repairAtomOnce actually rewrites. */
const REPAIRABLE_PATHS = new Set([
  "claimLedger",
  "kernel.supporting_proof",
  "kernel.belief_shift.from",
  "kernel.belief_shift.to",
  "missing_information",
]);

export type RepairResult = {
  atom: ContentAtom;
  repaired: boolean;
  paths: string[];
};

/**
 * Bounded repair — max 1 attempt, whitelisted fields only.
 * Strips fabricated citations; does not invent new strategic prose.
 */
export function repairAtomOnce(input: {
  atom: ContentAtom;
  envelope: AtomBuildEnvelope;
  violationPaths: string[];
}): RepairResult {
  const allowed = new Set(input.envelope.evidence.map((e) => e.evidence_id));
  const paths: string[] = [];
  let atom = input.atom;

  const wantsLedger = input.violationPaths.some(
    (p) => p.startsWith("claimLedger") || REPAIRABLE_PATHS.has("claimLedger")
  );
  const wantsProofs = input.violationPaths.some((p) =>
    p.startsWith("kernel.supporting_proof")
  );

  if (wantsLedger || wantsProofs) {
    const claims = atom.claimLedger.claims.filter((c) =>
      c.evidenceIds.every((id) => allowed.has(id))
    );
    if (claims.length !== atom.claimLedger.claims.length) {
      paths.push("claimLedger");
      atom = {
        ...atom,
        claimLedger: { ...atom.claimLedger, claims },
      };
    }
    const proofs = atom.kernel.supporting_proof.filter((p) =>
      allowed.has(p.evidence_id)
    );
    if (proofs.length !== atom.kernel.supporting_proof.length) {
      paths.push("kernel.supporting_proof");
      atom = {
        ...atom,
        kernel: { ...atom.kernel, supporting_proof: proofs },
      };
    }
  }

  const from = atom.kernel.belief_shift.from.toLowerCase();
  const to = atom.kernel.belief_shift.to.toLowerCase();
  if (
    from.includes("disconnected content ideas") ||
    to.includes("one clear idea can power")
  ) {
    paths.push("kernel.belief_shift.from", "kernel.belief_shift.to");
    atom = {
      ...atom,
      kernel: {
        ...atom.kernel,
        belief_shift: {
          from: "Evidence does not yet support a specific prior belief",
          to: "Lock a belief shift only after grounded claims exist",
        },
      },
      missing_information: unique([
        ...atom.missing_information,
        "belief_shift required repair after template echo",
      ]),
    };
  }

  if (paths.length === 0) {
    return { atom: input.atom, repaired: false, paths: [] };
  }

  atom = {
    ...atom,
    message_hash: computeMessageHash(atom),
  };
  return { atom, repaired: true, paths };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
