import { createBrandContextRepository } from "@/brain/content/repository/create-brand-context-repository";
import { fixturePathForCompany } from "@/brain/core/get-brand-core";
import type { ContentBrainContext } from "@/brain/content/types";

/**
 * Shared Brand Context load for atom build + produce use cases.
 * Resolves the company artifact from domain — never falls back to another brand.
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

  const fixturePath =
    input.fixturePath ?? fixturePathForCompany(domain) ?? undefined;
  if (!fixturePath) {
    return {
      ok: false,
      error: `No approved company artifact for domain: ${domain}`,
      status: 404,
    };
  }

  const repository = createBrandContextRepository({
    source: "fixture",
    fixturePath,
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
