import type { ContentAtom } from "@/brain/atom";
import { assertStrategyLock } from "@/brain/strategy-lock";

import type { YouTubeShortPackage } from "./package.schema";
import { computeYouTubeShortPackageHash } from "./hash-package";

export type PackageValidation =
  | { ok: true; package: YouTubeShortPackage }
  | { ok: false; errors: string[] };

const BANNED_PATTERNS = [
  /\bcure[sd]?\b/i,
  /\bguaranteed?\b/i,
  /\bwill (fix|eliminate|prevent)\b/i,
  /\bmiracle\b/i,
];

export function validateYouTubeShortPackage(
  atom: ContentAtom,
  pkg: YouTubeShortPackage
): PackageValidation {
  const errors: string[] = [];

  const lockCheck = assertStrategyLock(atom, pkg.strategy_lock, {
    claim_ids: pkg.claim_ids_used,
    proof_ids: pkg.proof_ids_used,
  });
  if (!lockCheck.ok) errors.push(...lockCheck.violations);

  if (pkg.source_atom_id !== atom.atom_id) {
    errors.push("source_atom_id mismatch");
  }
  if (pkg.source_atom_version !== atom.atom_version) {
    errors.push("source_atom_version mismatch");
  }

  const { package_hash, ...hashInput } = pkg;
  void package_hash;
  const expectedHash = computeYouTubeShortPackageHash(hashInput);
  if (pkg.package_hash !== expectedHash) {
    errors.push("package_hash mismatch");
  }

  const textBlob = [
    pkg.title,
    pkg.spoken_hook,
    pkg.script,
    ...pkg.scenes.map((s) => s.spoken_line),
  ].join("\n");

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(textBlob)) {
      errors.push(`banned claim language matched: ${pattern}`);
    }
  }
  for (const banned of atom.safety.banned_claims) {
    if (banned.trim() && textBlob.toLowerCase().includes(banned.toLowerCase())) {
      errors.push(`atom banned_claims hit: ${banned}`);
    }
  }

  const duration = pkg.scenes.reduce((s, sc) => s + sc.duration_seconds, 0);
  if (duration > 60) {
    errors.push(`total scene duration ${duration}s exceeds 60s`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, package: pkg };
}
