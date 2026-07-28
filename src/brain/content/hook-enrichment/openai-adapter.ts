import OpenAI from "openai";

import { resolveModel } from "@/brain/policy/model-registry";

import type { HookEnrichmentRequest, HookEnrichmentResult } from "./types";
import { HOOK_ENRICHMENT_VERSION } from "./types";

type RawHookJson = {
  hook?: unknown;
  tensionLine?: unknown;
  payoffLine?: unknown;
};

function asTrimmedString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max).trimEnd() : t;
}

/**
 * OpenAI hook polish only. Uses cheapest nano model by default.
 * Never regenerates direction structure.
 */
export async function enrichHookWithOpenAI(
  request: HookEnrichmentRequest
): Promise<HookEnrichmentResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = resolveModel("hookEnrichment");

  const system = [
    "You polish content marketing hooks only.",
    "Improve opening hook, tension, curiosity gap, and payoff framing.",
    "Return JSON: { hook, tensionLine?, payoffLine? }.",
    "Do NOT change the master topic, product names, ingredients, numbers, studies, certifications, or medical claims.",
    "Do NOT invent new facts. Use only allowedFacts and the grounded summary.",
    "Keep hook under 90 characters. Prefer scroll-stopping curiosity without clickbait lies.",
  ].join(" ");

  const user = JSON.stringify({
    masterTitle: request.masterTitle,
    objective: request.objective,
    angle: request.angle,
    audienceLabel: request.audienceLabel,
    groundedSummary: request.groundedSummary,
    allowedFacts: request.allowedFacts,
    originalHook: request.originalHook,
  });

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const json = JSON.parse(raw) as RawHookJson;
    const hook = asTrimmedString(json.hook, 120);
    if (!hook) return null;
    return {
      hook,
      tensionLine: asTrimmedString(json.tensionLine, 160),
      payoffLine: asTrimmedString(json.payoffLine, 160),
      enrichmentVersion: HOOK_ENRICHMENT_VERSION,
      providerUsed: "openai",
    };
  } catch {
    return null;
  }
}
