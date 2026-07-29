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
    const loaded = getBrandCoreRepository().getBrandCore(input.domain, {
      absolutePath: input.fixturePath,
    });
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
