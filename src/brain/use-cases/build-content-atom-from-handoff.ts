import type { ContentAtom } from "@/brain/atom";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import type { BrandCore } from "@/brain/core";
import { runCoreContentBrain } from "@/brain/pipeline";
import { PRODUCT_ATOM_PREFER_LLM } from "@/brain/policy/provider-policy";

import { loadBrandContextForAtom } from "./load-brand-context-for-atom";

export type BuildContentAtomFromHandoffInput = {
  handoff: ContentDirectionsHandoffV1;
  domain: string;
  selectedVariationId?: string;
  fixturePath?: string;
};

export type BuildContentAtomFromHandoffResult =
  | {
      ok: true;
      atom: ContentAtom;
      brandCore: BrandCore;
      provider: "deterministic";
    }
  | {
      ok: false;
      error: string;
      status: number;
      errors?: string[];
    };

/**
 * Brain use case: Brand Core + selected handoff direction → Content Atom.
 * Matches Studio production: deterministic Atom path (preferLlm: false).
 * Routes must call this instead of composing repository + pipeline themselves.
 */
export async function buildContentAtomFromHandoff(
  input: BuildContentAtomFromHandoffInput
): Promise<BuildContentAtomFromHandoffResult> {
  const domain = input.domain.trim();
  if (!domain) {
    return { ok: false, error: "domain is required", status: 400 };
  }

  const handoff = input.handoff;
  if (!handoff?.masterTopic || !handoff.variations?.length) {
    return {
      ok: false,
      error:
        "handoff with masterTopic and variations is required (save a selected direction first)",
      status: 400,
    };
  }

  const selectedId =
    input.selectedVariationId?.trim() || handoff.selectedVariationId;
  const variation = handoff.variations.find((v) => v.id === selectedId);
  if (!variation) {
    return {
      ok: false,
      error: `Unknown selectedVariationId: ${selectedId}`,
      status: 400,
    };
  }

  const loaded = await loadBrandContextForAtom({
    domain,
    fixturePath: input.fixturePath,
  });
  if (!loaded.ok) {
    return {
      ok: false,
      error: loaded.error,
      status: loaded.status,
    };
  }

  const result = await runCoreContentBrain({
    context: loaded.context,
    preferLlm: PRODUCT_ATOM_PREFER_LLM,
    selected: {
      masterTopic: handoff.masterTopic,
      variation,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      error: "Content Atom validation failed",
      status: 422,
      errors: result.errors,
    };
  }

  return {
    ok: true,
    atom: result.atom,
    brandCore: result.brandCore,
    provider: "deterministic",
  };
}
