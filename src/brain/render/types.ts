import { z } from "zod";

/**
 * Provider-independent image config — never hardwire a model name into atom schemas.
 */
export const imageProviderConfigSchema = z.object({
  image_provider: z.string().min(1).max(64),
  image_model: z.string().min(1).max(128),
});

export type ImageProviderConfig = z.infer<typeof imageProviderConfigSchema>;

export type AssetSpec = {
  prompt: string;
  aspect_ratio: "1:1" | "4:5" | "9:16" | "16:9";
  purpose: "cover" | "post" | "scene_still";
  negative_notes?: string[];
};

export type GeneratedImage = {
  status: "generated" | "stubbed" | "skipped";
  provider: string;
  model: string;
  /** URL or data URI when available; stub path otherwise */
  asset_ref: string;
  prompt_used: string;
};

export type VoiceProviderConfig = {
  voice_provider: string;
  voice_model: string;
  voice_id?: string;
};

export type GeneratedVoice = {
  status: "generated" | "stubbed" | "skipped";
  provider: string;
  model: string;
  asset_ref: string;
  script_used: string;
};

/** Compiled JSON2Video-shaped payload (application-owned, not LLM-invented). */
export type Json2VideoPayload = {
  template: "mm_scene_plan_v1";
  project: {
    id: string;
    resolution: string;
    scenes: Array<{
      duration: number;
      comment: string;
      elements: Array<{
        type: "text" | "image" | "voice" | "shape";
        text?: string;
        src?: string;
        position?: string;
        duration?: number;
      }>;
    }>;
  };
  meta: {
    package_id: string;
    atom_id: string;
    compiled_at: string;
  };
};
