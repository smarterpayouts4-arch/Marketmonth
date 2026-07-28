import { createBrandContextRepository } from "@/brain/content/repository/create-brand-context-repository";
import { DEFAULT_FIXTURE_RELATIVE } from "@/brain/content/repository/default-fixture";
import type { ContentBrainContext } from "@/brain/content/types";

/**
 * Shared Brand Context load for atom build + produce use cases.
 */
export async function loadBrandContextForAtom(input: {
  domain: string;
  fixturePath?: string;
}): Promise<
  | { ok: true; context: ContentBrainContext }
  | { ok: false; error: string; status: number }
> {
  const domain = input.domain.trim();
  if (!domain) {
    return { ok: false, error: "domain is required", status: 400 };
  }

  const repository = createBrandContextRepository({
    source: "fixture",
    fixturePath: input.fixturePath ?? DEFAULT_FIXTURE_RELATIVE,
  });
  const context = await repository.loadByDomain(domain);
  if (!context) {
    return {
      ok: false,
      error: `No brand context for domain: ${domain}`,
      status: 404,
    };
  }
  return { ok: true, context };
}
