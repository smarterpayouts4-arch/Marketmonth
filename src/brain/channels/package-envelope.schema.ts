import { z } from "zod";

import { strategyLockSchema } from "@/brain/strategy-lock";

/** Shared envelope every channel package must pin. */
export const packageEnvelopeSchema = z.object({
  package_id: z.string().min(1).max(64),
  package_version: z.number().int().positive(),
  package_hash: z.string().min(1).max(64),
  channel: z.string().min(1).max(64),
  source_atom_id: z.string().min(1).max(64),
  source_atom_version: z.number().int().positive(),
  strategy_lock: strategyLockSchema,
  status: z.enum(["draft", "validated", "rejected"]),
  created_at: z.string().min(1),
});

export type PackageEnvelope = z.infer<typeof packageEnvelopeSchema>;
