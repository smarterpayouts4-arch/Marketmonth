import { z } from "zod";

import {
  brandProfileSchema,
  socialPlatformSchema,
  strategyIntentSchema,
  strategyPreviewSchema,
} from "@/engine/discovery/brand-profile";

const MAX_JSON_CHARS = 200_000;
const idSchema = z.string().min(1).max(80);

const clientBrandProfileSchema = brandProfileSchema.extend({
  socialProfiles: z
    .array(
      z.object({
        platform: z.string(),
        status: z.enum(["present", "missing"]),
        url: z.string().url().optional(),
      })
    )
    .default([]),
});

/** Prefer identifiers; full payload only when records are not yet persisted. */
export const createPlanRequestSchema = z
  .object({
    analysisId: idSchema.optional(),
    strategyPreviewId: idSchema.optional(),
    brandProfileId: idSchema.optional(),
    intent: strategyIntentSchema.optional(),
    /** Untrusted client fallback — validated, stripped, size-limited. */
    brandProfile: clientBrandProfileSchema.optional(),
    strategyPreview: strategyPreviewSchema.optional(),
  })
  .strict()
  .transform((data) => {
    if (!data.brandProfile) return data;
    const socialProfiles = data.brandProfile.socialProfiles
      .map((p) => {
        const platform = socialPlatformSchema.safeParse(p.platform);
        if (!platform.success) return null;
        return {
          platform: platform.data,
          status: p.status,
          ...(p.url ? { url: p.url } : {}),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return {
      ...data,
      brandProfile: brandProfileSchema.parse({
        ...data.brandProfile,
        socialProfiles,
      }),
    };
  });

export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;

export function parseCreatePlanBody(raw: unknown): {
  ok: true;
  data: CreatePlanRequest;
} | {
  ok: false;
  error: string;
  details?: unknown;
} {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of [
      "userId",
      "brandId",
      "devKey",
      "ownerId",
      "ownership",
    ]) {
      if (key in obj) {
        return {
          ok: false,
          error: "Ownership fields are not allowed in create-plan payload.",
        };
      }
    }
  }

  const serialized = JSON.stringify(raw ?? {});
  if (serialized.length > MAX_JSON_CHARS) {
    return { ok: false, error: "Request body too large." };
  }

  const parsed = createPlanRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid create-plan payload.",
      details: parsed.error.flatten(),
    };
  }

  return { ok: true, data: parsed.data };
}
