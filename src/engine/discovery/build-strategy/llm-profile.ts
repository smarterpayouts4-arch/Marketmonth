import OpenAI from "openai";

import {
  aiBrandProfileResultSchema,
  type BrandProfile,
} from "../brand-profile";
import { fallbackProfile } from "./fb-profile";
import { BRAND_PROFILE_SYSTEM } from "./prompts";
import type { ProfileArgs } from "./types";

export async function llmBrandProfile(args: ProfileArgs): Promise<BrandProfile> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_DISCOVERY_MODEL || "gpt-5.4-nano",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: BRAND_PROFILE_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          website: args.website,
          signals: {
            title: args.signals.title,
            metaDescription: args.signals.metaDescription,
            headings: args.signals.headings.slice(0, 16),
            aboutText: args.signals.aboutText.slice(0, 2500),
            productText: args.signals.productText.slice(0, 2000),
            faqText: args.signals.faqText.slice(0, 1200),
            faqs: args.signals.faqs.slice(0, 8).map((f) => ({
              question: f.question,
              answer: f.answer.slice(0, 240),
            })),
            bodySample: args.signals.bodySample.slice(0, 1200),
          },
          social: args.social,
          competitorHints: args.competitorHints,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return fallbackProfile(args);

  const parsed = aiBrandProfileResultSchema.safeParse(JSON.parse(content));
  if (!parsed.success) return fallbackProfile(args);

  return {
    ...parsed.data.brandProfile,
    website: args.website,
    colors: args.signals.colors,
    socialProfiles: args.social,
    seoSummary: args.seo,
    // Typed catalog from signals — never invent from LLM products[]
    indexedProducts: args.signals.indexedProducts.map((p) => ({
      name: p.name,
      price: p.price,
      sourceUrl: p.sourceUrl,
    })),
    competitors: parsed.data.brandProfile.competitors.map((c) => ({
      ...c,
      reason: c.reason.includes("Suggested")
        ? c.reason
        : `Suggested competitor — ${c.reason}`,
    })),
    // LLM free text is derived — activation/topics must not treat as observed labels
    derivedFieldNames: [
      "description",
      "audience",
      "products",
      "services",
      "valueProposition",
      "brandVoice",
      "marketingOpportunity",
    ],
  };
}
