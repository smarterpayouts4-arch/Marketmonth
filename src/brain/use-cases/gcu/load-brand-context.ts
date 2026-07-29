import type { ContentBrainContext } from "@/brain/content/types";
import {
  getBrandCoreRepository,
  type BrandCoreIdentity,
} from "@/brain/core";
import { DEFAULT_FIXTURE_RELATIVE } from "@/brain/content/repository/default-fixture";

import type { GenerateAndRecordContentDirectionsResult } from "./types";

/** @deprecated Prefer DEFAULT_FIXTURE_RELATIVE — kept for existing imports. */
export const DEFAULT_FIXTURE = DEFAULT_FIXTURE_RELATIVE;

export type LoadedBrandContext = {
  context: ContentBrainContext;
  identity: BrandCoreIdentity;
};

export async function loadBrandContext(input: {
  domain: string;
  fixturePath?: string;
}): Promise<
  | { ok: false; result: GenerateAndRecordContentDirectionsResult }
  | { ok: true; value: LoadedBrandContext }
> {
  try {
    // Explicit fixture override (publish temp CSV) stays on the sync disk
    // path; normal product reads go disk-then-DB so deploys without the
    // data/companies folder still resolve Brand Core.
    const repo = getBrandCoreRepository();
    const loaded = input.fixturePath
      ? repo.getBrandCore(input.domain, { absolutePath: input.fixturePath })
      : await repo.getBrandCoreAsync(input.domain);
    return {
      ok: true,
      value: { context: loaded.context, identity: loaded.identity },
    };
  } catch (err) {
    return {
      ok: false,
      result: {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : `No brand context for domain: ${input.domain}`,
        status: 404,
      },
    };
  }
}
