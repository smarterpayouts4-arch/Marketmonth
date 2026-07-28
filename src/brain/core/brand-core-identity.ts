import { createHash } from "node:crypto";

import { brandCoreContentHash } from "./compile-brand-core";
import type { BrandCore } from "./brand-core.schema";

export type BrandCoreIdentity = {
  company_id: string;
  brand_core_id: string;
  brand_core_version: number;
  brand_core_hash: string;
};

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

/**
 * Canonical Brand Core identity shared by Directions history, Atom, and StrategyLock.
 * brand_core_id is stable per company; version + hash change when compiled content changes.
 */
export function resolveBrandCoreIdentity(core: BrandCore): BrandCoreIdentity {
  const company_id = core.domain.trim().toLowerCase();
  const brand_core_id = `bc_${shortHash(`${company_id}|${core.brand_name.trim().toLowerCase()}`)}`;
  const brand_core_hash = brandCoreContentHash(core);
  const brand_core_version = Number.parseInt(brand_core_hash.slice(0, 8), 16);
  return {
    company_id,
    brand_core_id,
    brand_core_version,
    brand_core_hash,
  };
}
