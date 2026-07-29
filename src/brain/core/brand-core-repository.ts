import type { ContentBrainContext } from "@/brain/content/types";

import {
  getBrandCore,
  type GetBrandCoreResult,
} from "./get-brand-core";

/**
 * Sole runtime Brand Core repository. Callers must not read approved CSV
 * or Neon drafts directly — only this interface.
 */
export interface BrandCoreRepository {
  getBrandCore(
    companyId: string,
    options?: {
      context?: ContentBrainContext;
      fixturePath?: string;
      absolutePath?: string;
    }
  ): GetBrandCoreResult;
}

class DefaultBrandCoreRepository implements BrandCoreRepository {
  getBrandCore(
    companyId: string,
    options?: {
      context?: ContentBrainContext;
      fixturePath?: string;
      absolutePath?: string;
    }
  ): GetBrandCoreResult {
    return getBrandCore(companyId, options);
  }
}

let singleton: BrandCoreRepository | null = null;

/** Process-wide Brand Core repository (CSV-backed adapter today). */
export function getBrandCoreRepository(): BrandCoreRepository {
  if (!singleton) singleton = new DefaultBrandCoreRepository();
  return singleton;
}

/** Test seam */
export function setBrandCoreRepositoryForTests(
  repo: BrandCoreRepository | null
): void {
  singleton = repo;
}
