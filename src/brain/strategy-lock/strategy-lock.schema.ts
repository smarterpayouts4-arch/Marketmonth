import { z } from "zod";

export const strategyLockSchema = z.object({
  atom_id: z.string().min(1).max(64),
  atom_version: z.number().int().positive(),
  message_hash: z.string().min(1).max(64),
  claim_ids: z.array(z.string().min(1)).min(1).max(24),
  proof_ids: z.array(z.string().min(1)).min(1).max(24),
  belief_shift_hash: z.string().min(1).max(64),
  payoff_hash: z.string().min(1).max(64),
  intended_action_hash: z.string().min(1).max(64),
  brand_core_id: z.string().min(1).max(64),
  brand_core_version: z.union([z.string().min(1).max(64), z.number()]),
});

export type StrategyLock = z.infer<typeof strategyLockSchema>;
