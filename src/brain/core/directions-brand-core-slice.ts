import { createHash } from "node:crypto";

import type { BrandCoreIdentity } from "./brand-core-identity";
import type { BrandCore } from "./brand-core.schema";
import {
  directionsBrandCoreSliceSchema,
  type DirectionsBrandCoreSlice,
} from "./directions-brand-core-slice.schema";

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable content-derived id: namespace + hash of normalized canonical text. */
export function stableSliceId(namespace: string, canonical: string): string {
  const digest = createHash("sha256")
    .update(`${namespace}|${normalizeKey(canonical)}`)
    .digest("hex")
    .slice(0, 12);
  return `${namespace}_${digest}`;
}

/**
 * Project Brand Core into the Directions intelligence input contract.
 * Claims are only approved assertions (positioning for v1) — proofs stay evidence.
 */
export function toDirectionsBrandCoreSlice(
  core: BrandCore,
  identity: BrandCoreIdentity
): DirectionsBrandCoreSlice {
  const evidence = core.proof_library.map((proof, order) => ({
    evidence_id: proof.proof_id,
    meaning: proof.summary,
    source: proof.source_ref?.trim() || core.website,
    order,
  }));

  // Accuracy over richness: one claim from positioning. Do not mint claims from proofs.
  const claims = [
    {
      claim_id: stableSliceId("claim", core.positioning),
      wording: core.positioning,
      allowed_evidence_ids: [] as string[],
      order: 0,
    },
  ];

  const offers = core.offers.map((name, order) => ({
    offer_id: stableSliceId("offer", name),
    name,
    description: name,
    order,
  }));

  const problemTexts: string[] = [];
  const primary = core.audience.primary.trim();
  if (primary) problemTexts.push(primary);
  for (const seg of core.audience.segments) {
    const d = seg.description?.trim();
    if (d && normalizeKey(d) !== normalizeKey(primary)) {
      problemTexts.push(d);
    }
  }
  if (problemTexts.length === 0) {
    problemTexts.push(`Audience needs clarity related to ${core.brand_name}`);
  }

  const problems = problemTexts.slice(0, 8).map((description, order) => ({
    problem_id: stableSliceId("problem", description),
    description,
    order,
  }));

  const audiences = [
    {
      audience_id: stableSliceId("audience", primary || core.brand_name),
      description: primary || `Audience for ${core.brand_name}`,
      problems,
      order: 0,
    },
  ];

  const slice: DirectionsBrandCoreSlice = {
    company: {
      id: identity.company_id,
      name: core.brand_name,
      positioning: core.positioning,
    },
    brand_core_id: identity.brand_core_id,
    brand_core_version: identity.brand_core_version,
    brand_core_hash: identity.brand_core_hash,
    audiences,
    offers,
    claims,
    evidence,
    safety: {
      banned_claims: [...core.banned_claims],
      required_qualifiers: [],
    },
  };

  return directionsBrandCoreSliceSchema.parse(slice);
}
