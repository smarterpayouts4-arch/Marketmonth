import { z } from "zod";

import { strategyLockSchema } from "@/brain/strategy-lock";

export const youtubeLongPackageEnvelopeSchema = z.object({
  package_id: z.string().min(1),
  package_version: z.number().int().positive(),
  source_atom_id: z.string().min(1),
  source_atom_version: z.number().int().positive(),
  strategy_lock: strategyLockSchema,
  status: z.literal("not_connected"),
  channel: z.literal("youtube-long"),
});

export type YoutubeLongPackageEnvelope = z.infer<
  typeof youtubeLongPackageEnvelopeSchema
>;
