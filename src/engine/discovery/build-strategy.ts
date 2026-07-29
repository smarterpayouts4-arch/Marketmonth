/**
 * Thin orchestrator: brand profile + strategy builders.
 * Specialists live in ./build-strategy/*
 */
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import {
  groundedOnlineMarketingStrategySchema,
  type GroundedOnlineMarketingStrategy,
} from "@/lib/discovery/strategy.schema";

import type { BrandProfile, StrategyIntent } from "./brand-profile";
import { fallbackProfile } from "./build-strategy/fb-profile";
import { fallbackStrategy } from "./build-strategy/fb-strategy";
import { llmBrandProfile } from "./build-strategy/llm-profile";
import { llmStrategy } from "./build-strategy/llm-strategy";
import type { ProfileArgs } from "./build-strategy/types";

export type { ProfileArgs } from "./build-strategy/types";

function safeStrategy(
  brandProfile: BrandProfile,
  intent: StrategyIntent,
  evidence: DiscoveryEvidence[]
): GroundedOnlineMarketingStrategy {
  return groundedOnlineMarketingStrategySchema.parse(
    fallbackStrategy(brandProfile, intent, evidence)
  );
}

export async function buildBrandProfile(
  args: ProfileArgs
): Promise<BrandProfile> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackProfile(args);
  }
  try {
    return await llmBrandProfile(args);
  } catch {
    return fallbackProfile(args);
  }
}

export async function buildStrategyWithIntent(input: {
  brandProfile: BrandProfile;
  intent: StrategyIntent;
  evidence?: DiscoveryEvidence[];
}): Promise<GroundedOnlineMarketingStrategy> {
  const evidence = input.evidence ?? [];
  if (!process.env.OPENAI_API_KEY) {
    return safeStrategy(input.brandProfile, input.intent, evidence);
  }
  try {
    return await llmStrategy({
      brandProfile: input.brandProfile,
      intent: input.intent,
      evidence,
    });
  } catch {
    return safeStrategy(input.brandProfile, input.intent, evidence);
  }
}
