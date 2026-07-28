import { z } from "zod";

export const analyzeRequestSchema = z.object({
  url: z.string().min(1, "Enter a website URL"),
});

export const stageEventSchema = z.object({
  type: z.literal("stage"),
  id: z.string(),
  status: z.enum(["pending", "active", "complete", "error"]),
  label: z.string(),
});

export const resultEventSchema = z.object({
  type: z.literal("result"),
  brandProfile: z.record(z.string(), z.unknown()),
  analysisId: z.string(),
  brandProfileId: z.string(),
  cached: z.boolean(),
  marketingOpportunity: z.string().optional(),
  pageCount: z.number().optional(),
});

export const errorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});
