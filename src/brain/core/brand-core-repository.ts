import type { ContentBrainContext } from "@/brain/content/types";

import {
  getBrandCore,
  getBrandCoreAsync,
  type GetBrandCoreResult,
} from "./get-brand-core";

/**
 * Sole runtime Brand Core repository. Callers must not read approved CSV
 * or Neon drafts directly — only this interface.
 */
export interface BrandCoreRepository {
  /** Sync, disk-only. Safe for scripts, tests, and dev-only routes. */
  getBrandCore(
    companyId: string,
    options?: {
      context?: ContentBrainContext;
      fixturePath?: string;
      absolutePath?: string;
    }
  ): GetBrandCoreResult;
  /** Disk, then DB artifact mirror. Use from anything that runs deployed. */
  getBrandCoreAsync(
    companyId: string,
    options?: { context?: ContentBrainContext }
  ): Promise<GetBrandCoreResult>;
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

  getBrandCoreAsync(
    companyId: string,
    options?: { context?: ContentBrainContext }
  ): Promise<GetBrandCoreResult> {
    return getBrandCoreAsync(companyId, options);
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
