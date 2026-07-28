import type { BrandCore } from "@/brain/core/brand-core.schema";

import {
  computeMessageHash,
  contentAtomSchema,
  type ContentAtom,
} from "./content-atom.schema";

export type AtomValidation =
  | { ok: true; atom: ContentAtom }
  | { ok: false; errors: string[]; atom?: ContentAtom };

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
  return finalizeAtom(parsed.data);
}

function finalizeAtom(atom: ContentAtom): AtomValidation {
  const errors: string[] = [];
  const expectedHash = computeMessageHash(atom);
  if (atom.message_hash !== expectedHash) {
    errors.push(
      `message_hash mismatch: got ${atom.message_hash}, expected ${expectedHash}`
    );
  }
  if (!atom.hook_strategy.opening_intent.trim()) {
    errors.push("hook_strategy.opening_intent is required");
  }
  if (!atom.central_claim.canonical_wording.trim()) {
    errors.push("central_claim.canonical_wording is required");
  }
  if (atom.supporting_proof.length === 0) {
    errors.push("supporting_proof must not be empty");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      atom: { ...atom, status: "invalid" },
    };
  }

  return { ok: true, atom: { ...atom, status: "ready" } };
}

/** Ensure proof IDs exist on Brand Core when library is present. */
export function validateAtomAgainstBrandCore(
  atom: ContentAtom,
  brandCore: BrandCore
): AtomValidation {
  const base = validateContentAtom(atom);
  if (!base.ok) return base;

  const libraryIds = new Set(brandCore.proof_library.map((p) => p.proof_id));
  const errors: string[] = [];
  for (const proof of atom.supporting_proof) {
    if (libraryIds.size > 0 && !libraryIds.has(proof.proof_id)) {
      errors.push(`supporting_proof ${proof.proof_id} not in Brand Core library`);
    }
  }
  for (const banned of brandCore.banned_claims ?? []) {
    const hay = `${atom.central_claim.canonical_wording} ${atom.promised_payoff}`.toLowerCase();
    if (banned.trim() && hay.includes(banned.toLowerCase())) {
      errors.push(`banned claim language present: ${banned}`);
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      atom: { ...base.atom, status: "invalid" },
    };
  }
  return base;
}
