import OpenAI from "openai";

import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import {
  aiGroundedStrategyResultSchema,
  type GroundedOnlineMarketingStrategy,
} from "@/lib/discovery/strategy.schema";

import type { BrandProfile, StrategyIntent } from "../brand-profile";
import { fallbackStrategy } from "./fb-strategy";
import { STRATEGY_SYSTEM } from "./prompts";

export async function llmStrategy(input: {
  brandProfile: BrandProfile;
  intent: StrategyIntent;
  evidence: DiscoveryEvidence[];
}): Promise<GroundedOnlineMarketingStrategy> {
  const { brandProfile, intent, evidence } = input;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_DISCOVERY_MODEL || "gpt-5.4-nano",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: STRATEGY_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          brandProfile: {
            businessName: brandProfile.businessName,
            description: brandProfile.description,
            audience: brandProfile.audience,
            products: brandProfile.products,
            services: brandProfile.services,
            valueProposition: brandProfile.valueProposition,
            brandVoice: brandProfile.brandVoice,
            marketingOpportunity: brandProfile.marketingOpportunity,
            socialProfiles: brandProfile.socialProfiles,
          },
          intent: {
            goal: intent.goal,
            promoteFirst: intent.promoteFirst,
            reach:
              intent.reach === "online_broad" ? "Global" : intent.reach,
            growthDirection: intent.growthDirection,
            buyerTension: intent.buyerTension,
            brandCoreEdit: intent.brandCoreEdit,
          },
          evidence: evidence.map((e) => ({
            id: e.id,
            field: e.field,
            kind: e.kind,
            value: e.value,
            sourcePageType: e.sourcePageType,
            confidence: e.confidence,
          })),
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return fallbackStrategy(brandProfile, intent, evidence);

  try {
    const parsed = aiGroundedStrategyResultSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return fallbackStrategy(brandProfile, intent, evidence);
    }
    return parsed.data.strategyPreview;
  } catch {
    return fallbackStrategy(brandProfile, intent, evidence);
  }
}
