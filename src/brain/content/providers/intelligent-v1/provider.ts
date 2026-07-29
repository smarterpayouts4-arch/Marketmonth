import { callBrainLlm } from "@/brain/llm/openai-client";
import { resolveModel } from "@/brain/policy/model-registry";

import type { DirectionProvider } from "../types";
import {
  INTELLIGENT_V1_BRAIN_VERSION,
  INTELLIGENT_V1_PROMPT_VERSION,
  INTELLIGENT_V1_VALIDATOR_VERSION,
} from "./constants";
import {
  mapIntelligentToMasterTopic,
  mapIntelligentToVariations,
} from "./map-to-variations";
import { buildIntelligentV1Messages } from "./prompt";
import {
  intelligentDirectionsResultSchema,
  type IntelligentDirectionsResult,
} from "./schema";
import { validateIntelligentDirections } from "./validate";

/**
 * Brand-aware Directions provider. Manual mode first: preserves master topic,
 * grounds six ideas, validates IDs. Fails closed without OPENAI_API_KEY.
 * Automatic mode intentionally disabled until manual experiments succeed.
 */
export const intelligentV1Provider: DirectionProvider = {
  id: "intelligent-v1",
  async generateDirections(input) {
    const model = resolveModel("directionsIntelligent");
    const provenance = {
      provider_id: "intelligent-v1" as const,
      brain_version: INTELLIGENT_V1_BRAIN_VERSION,
      prompt_version: INTELLIGENT_V1_PROMPT_VERSION,
      model,
    };

    if (input.mode === "automatic") {
      return {
        provenance,
        masterTopic: input.masterTopic,
        variations: [],
        invalid: true,
        intelligentPayload: {
          error: "intelligent-v1 automatic mode not enabled yet",
        },
        validation: {
          validator_version: INTELLIGENT_V1_VALIDATOR_VERSION,
          ok: false,
          errors: [
            "intelligent-v1 automatic topic selection is disabled until manual mode is proven",
          ],
        },
      };
    }

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return {
        provenance: { ...provenance, model: null },
        masterTopic: input.masterTopic,
        variations: [],
        invalid: true,
        intelligentPayload: { error: "OPENAI_API_KEY missing" },
        validation: {
          validator_version: INTELLIGENT_V1_VALIDATOR_VERSION,
          ok: false,
          errors: ["OPENAI_API_KEY is required for intelligent-v1"],
        },
      };
    }

    const lockedTopic = input.masterTopic.punchline;
    const messages = buildIntelligentV1Messages({
      brandSlice: input.brandSlice,
      masterTopic: lockedTopic,
      mode: "manual",
    });

    let parsed: IntelligentDirectionsResult | null = null;
    let parseError: string | null = null;

    try {
      // json_object until the directions schema gets a strict mirror (P1.3).
      const result = await callBrainLlm({
        apiKey: process.env.OPENAI_API_KEY!,
        model,
        system: messages.system,
        user: messages.user,
        temperature: 0.4,
      });
      if (!result.ok) {
        throw new Error(result.detail || "OpenAI call failed");
      }
      const json = JSON.parse(result.raw) as unknown;
      const shape = intelligentDirectionsResultSchema.safeParse(json);
      if (!shape.success) {
        parseError = shape.error.message;
      } else {
        parsed = {
          ...shape.data,
          master_topic: {
            ...shape.data.master_topic,
            topic: lockedTopic.slice(0, 90),
          },
        };
      }
    } catch (err) {
      parseError = err instanceof Error ? err.message : "OpenAI call failed";
    }

    if (!parsed) {
      return {
        provenance,
        masterTopic: input.masterTopic,
        variations: [],
        invalid: true,
        intelligentPayload: { error: parseError },
        validation: {
          validator_version: INTELLIGENT_V1_VALIDATOR_VERSION,
          ok: false,
          errors: [parseError ?? "Failed to parse model output"],
        },
      };
    }

    const validation = validateIntelligentDirections({
      result: parsed,
      slice: input.brandSlice,
      lockedMasterTopic: lockedTopic,
    });

    if (!validation.ok) {
      return {
        provenance,
        masterTopic: input.masterTopic,
        variations: [],
        invalid: true,
        intelligentPayload: parsed,
        validation,
      };
    }

    const masterTopic = mapIntelligentToMasterTopic(
      parsed,
      "manual",
      input.context.contextVersion
    );
    masterTopic.punchline = lockedTopic.slice(0, 90);

    const variations = mapIntelligentToVariations(
      parsed,
      masterTopic,
      input.context.contextVersion,
      input.context.website
    );

    return {
      provenance,
      masterTopic,
      variations,
      intelligentPayload: parsed,
      validation,
      invalid: false,
    };
  },
};
