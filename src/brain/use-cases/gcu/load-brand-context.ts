import { createBrandContextRepository } from "@/brain/content/repository/create-brand-context-repository";
import { DEFAULT_FIXTURE_RELATIVE } from "@/brain/content/repository/default-fixture";
import type { ContentBrainContext } from "@/brain/content/types";
import { getBrandCore } from "@/brain/core";
import type { BrandCoreIdentity } from "@/brain/core";

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
  const brandRepo = createBrandContextRepository({
    source: "fixture",
    fixturePath: input.fixturePath ?? DEFAULT_FIXTURE_RELATIVE,
  });

  const context = await brandRepo.loadByDomain(input.domain);
  if (!context) {
    return {
      ok: false,
      result: {
        ok: false,
        error: `No brand context for domain: ${input.domain}`,
        status: 404,
      },
    };
  }

  const { identity } = getBrandCore(context.domain, { context });

  return { ok: true, value: { context, identity } };
}
