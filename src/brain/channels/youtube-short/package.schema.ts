import { z } from "zod";

import { packageEnvelopeSchema } from "../package-envelope.schema";
import {
  YOUTUBE_SHORT_DURATION_MAX_SECONDS,
  YOUTUBE_SHORT_SCENE_DURATION_MAX_SECONDS,
} from "./duration-policy";

export const youtubeShortSceneSchema = z.object({
  scene_id: z.string().min(1).max(64),
  duration_seconds: z
    .number()
    .positive()
    .max(YOUTUBE_SHORT_SCENE_DURATION_MAX_SECONDS),
  spoken_line: z.string().min(1).max(400),
  on_screen_text: z.string().max(120).optional(),
  visual_prompt: z.string().min(1).max(500),
});

export const youtubeShortPackageSchema = packageEnvelopeSchema.extend({
  channel: z.literal("youtube-short"),
  title: z.string().min(1).max(100),
  spoken_hook: z.string().min(1).max(280),
  script: z.string().min(1).max(4000),
  retention_plan: z.object({
    opening_seconds: z.number().positive().max(5),
    pattern_interrupts: z.array(z.string().min(1).max(160)).max(8),
    payoff_timestamp: z
      .number()
      .nonnegative()
      .max(YOUTUBE_SHORT_DURATION_MAX_SECONDS),
  }),
  thumbnail_or_first_frame: z.object({
    text: z.string().min(1).max(80),
    image_prompt: z.string().min(1).max(500),
  }),
  scenes: z.array(youtubeShortSceneSchema).min(2).max(12),
  voice_direction: z.object({
    tone: z.string().min(1).max(120),
    pace: z.string().min(1).max(80),
    emphasis: z.string().max(200).optional(),
  }),
  render_plan: z.object({
    image_provider: z.string().min(1).max(64),
    voice_provider: z.string().min(1).max(64),
    video_compiler: z.string().min(1).max(64),
    aspect_ratio: z.literal("9:16"),
    target_duration_seconds: z
      .number()
      .positive()
      .max(YOUTUBE_SHORT_DURATION_MAX_SECONDS),
  }),
  claim_ids_used: z.array(z.string()).min(1),
  proof_ids_used: z.array(z.string()).min(1),
});

export type YouTubeShortPackage = z.infer<typeof youtubeShortPackageSchema>;
export type YouTubeShortScene = z.infer<typeof youtubeShortSceneSchema>;
