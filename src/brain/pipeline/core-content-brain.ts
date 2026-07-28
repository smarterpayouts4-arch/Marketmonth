import {
  buildContentAtom,
  type ContentAtom,
  validateAtomAgainstBrandCore,
} from "@/brain/atom";
import type { SelectedDirectionInput } from "@/brain/atom/build-content-atom";
import {
  compileBrandCore,
  toBrandCoreSlice,
  type BrandCore,
} from "@/brain/core";
import type { ContentBrainContext } from "@/brain/content/types";

import { llmGenerateContentAtom } from "./llm-atom";

export type CoreContentBrainResult =
  | {
      ok: true;
      atom: ContentAtom;
      brandCore: BrandCore;
      provider: "deterministic" | "openai";
    }
  | {
      ok: false;
      errors: string[];
      brandCore?: BrandCore;
    };

/**
 * Brand Core + selected editorial direction → Content Atom.
 * Deterministic builder validates to ready|invalid; LLM path falls back on failure.
 */
export async function runCoreContentBrain(input: {
  context: ContentBrainContext;
  selected: SelectedDirectionInput;
  preferLlm?: boolean;
}): Promise<CoreContentBrainResult> {
  const brandCore = compileBrandCore(input.context);
  const brandSlice = toBrandCoreSlice(brandCore);

  const preferLlm =
    input.preferLlm !== false && Boolean(process.env.OPENAI_API_KEY);

  if (preferLlm) {
    const atom = await llmGenerateContentAtom({
      brandCore,
      brandSlice,
      selected: input.selected,
    });
    const validated = validateAtomAgainstBrandCore(atom, brandCore);
    if (validated.ok) {
      return {
        ok: true,
        atom: validated.atom,
        brandCore,
        provider: "openai",
      };
    }
  }

  const built = buildContentAtom({
    brandCore,
    selected: input.selected,
  });
  if (!built.ok) {
    return { ok: false, errors: built.errors, brandCore };
  }

  return {
    ok: true,
    atom: built.atom,
    brandCore,
    provider: "deterministic",
  };
}
