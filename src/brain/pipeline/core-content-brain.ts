import {
  buildContentAtom,
  type AtomBuildTrace,
  type AtomValidationReport,
  type ContentAtom,
} from "@/brain/atom";
import type { SelectedDirectionInput } from "@/brain/atom/build-content-atom";
import {
  compileBrandCore,
  type BrandCore,
} from "@/brain/core";
import type { ContentBrainContext } from "@/brain/content/types";
import { PRODUCT_ATOM_PREFER_LLM } from "@/brain/policy/provider-policy";

export type CoreContentBrainResult =
  | {
      ok: true;
      atom: ContentAtom;
      brandCore: BrandCore;
      provider: "deterministic" | "openai";
      report: AtomValidationReport;
      /** Refs + metadata only — not a second atom copy. */
      trace: AtomBuildTrace;
    }
  | {
      ok: false;
      errors: string[];
      brandCore?: BrandCore;
      atom?: ContentAtom;
      report?: AtomValidationReport;
      trace?: AtomBuildTrace;
    };

/**
 * Brand Core + selected editorial direction → Content Atom (v2 pipeline).
 * Constrained LLM when preferLlm (product default true); honest limited/insufficient
 * fallback — never hollow template belief shifts.
 */
export async function runCoreContentBrain(input: {
  context: ContentBrainContext;
  selected: SelectedDirectionInput;
  preferLlm?: boolean;
}): Promise<CoreContentBrainResult> {
  const brandCore = compileBrandCore(input.context);
  const preferLlm = input.preferLlm ?? PRODUCT_ATOM_PREFER_LLM;

  const built = await buildContentAtom({
    brandCore,
    selected: input.selected,
    preferLlm,
  });

  if (!built.ok) {
    return {
      ok: false,
      errors: built.errors,
      brandCore,
      atom: built.atom,
      report: built.report,
      trace: built.trace,
    };
  }

  return {
    ok: true,
    atom: built.atom,
    brandCore,
    provider: built.provider,
    report: built.report,
    trace: built.trace,
  };
}
