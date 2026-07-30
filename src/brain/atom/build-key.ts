import { createHash } from "node:crypto";

import type { AtomBuildEnvelope } from "./build-envelope";

/**
 * Idempotency key for atom builds. Same company + BrandCore + topic +
 * direction + policy + prompt + evidence package → return existing draft.
 */
export type AtomBuildKeyParts = {
  companyId: string;
  brandCoreHash: string;
  brandCoreVersion: string | number;
  topicId?: string;
  directionId: string;
  buildPolicyVersion: string;
  promptVersion: string;
  evidencePackageHash: string;
};

export function hashEvidencePackage(
  evidenceIds: readonly string[]
): string {
  const sorted = [...evidenceIds].map((id) => id.trim()).filter(Boolean).sort();
  return createHash("sha256").update(sorted.join("|")).digest("hex").slice(0, 16);
}

export function buildAtomBuildKey(parts: AtomBuildKeyParts): string {
  const raw = [
    parts.companyId.trim().toLowerCase(),
    parts.brandCoreHash,
    String(parts.brandCoreVersion),
    parts.topicId?.trim() || "",
    parts.directionId,
    parts.buildPolicyVersion,
    parts.promptVersion,
    parts.evidencePackageHash,
  ].join("::");
  return `abk_${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

export function atomBuildKeyFromEnvelope(
  envelope: AtomBuildEnvelope,
  promptVersion: string
): string {
  return buildAtomBuildKey({
    companyId: envelope.identity.company_id,
    brandCoreHash: envelope.identity.brand_core_hash,
    brandCoreVersion: envelope.identity.brand_core_version,
    topicId: envelope.topic.topicId ?? envelope.direction.topicId,
    directionId: envelope.direction.directionId,
    buildPolicyVersion: envelope.buildPolicyVersion,
    promptVersion,
    evidencePackageHash: hashEvidencePackage(
      envelope.evidence.map((e) => e.evidence_id)
    ),
  });
}
