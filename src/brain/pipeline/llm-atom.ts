import {
  buildContentAtom,
  computeMessageHash,
  contentAtomSchema,
  type ContentAtom,
} from "@/brain/atom";
import type { SelectedDirectionInput } from "@/brain/atom/build-content-atom";
import type {
  BrandCore,
  BrandCoreSlice,
} from "@/brain/core/brand-core.schema";

import { callBrainLlm } from "@/brain/llm/openai-client";
import { resolveModel } from "@/brain/policy/model-registry";

import { CORE_CONTENT_BRAIN_SYSTEM } from "./prompts";

function deterministicAtom(
  brandCore: BrandCore,
  selected: SelectedDirectionInput
): ContentAtom {
  const built = buildContentAtom({ brandCore, selected });
  if (built.ok) return built.atom;
  if (built.atom) return built.atom;
  throw new Error(built.errors.join("; "));
}

export async function llmGenerateContentAtom(input: {
  brandCore: BrandCore;
  brandSlice: BrandCoreSlice;
  selected: SelectedDirectionInput;
}): Promise<ContentAtom> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return deterministicAtom(input.brandCore, input.selected);
  }

  const model = resolveModel("contentAtomLlm");

  try {
    // json_object until contentAtomSchema gets a strict-mode mirror (P1.3).
    const result = await callBrainLlm({
      apiKey,
      model,
      system: CORE_CONTENT_BRAIN_SYSTEM,
      user: JSON.stringify({
        brand_core_slice: input.brandSlice,
        master_topic: input.selected.masterTopic,
        selected_direction: input.selected.variation,
        required_ids: {
          brand_core_version: input.brandCore.version,
          selected_direction_id: input.selected.variation.id,
          allowed_proof_ids: input.brandCore.proof_library.map(
            (p) => p.proof_id
          ),
        },
        schema_notes:
          "Return rich ContentAtom with atom_version, message_hash recomputed server-side, selected_direction object, audience, supporting_proof with meaning+evidence_id, hook_strategy.opening_intent, status validating. No platform fields.",
      }),
    });

    if (!result.ok || !result.raw) {
      return deterministicAtom(input.brandCore, input.selected);
    }

    const parsed = contentAtomSchema.safeParse(JSON.parse(result.raw));
    if (!parsed.success) {
      return deterministicAtom(input.brandCore, input.selected);
    }

    const { message_hash, status: _status, ...rest } = parsed.data;
    void message_hash;
    void _status;
    const draft = {
      ...rest,
      brand_core_version: input.brandCore.version,
      atom_version: rest.atom_version || 1,
    };
    return {
      ...draft,
      message_hash: computeMessageHash(draft),
      status: "validating",
    };
  } catch {
    return deterministicAtom(input.brandCore, input.selected);
  }
}
