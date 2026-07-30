import { buildCraftClause } from "@/brain/craft";
import { callBrainLlm } from "@/brain/llm/openai-client";
import { resolveModel } from "@/brain/policy/model-registry";
import { tokenBudget } from "@/brain/policy/token-budgets";

import type { AtomBuildEnvelope } from "../build-envelope";
import type { ContentAtom } from "../content-atom.schema";
import type { CraftPolishResult } from "./types";
import { ATOM_CRAFT_POLISH_VERSION } from "./types";

const POLISH_JSON_SCHEMA = {
  name: "atom_craft_polish_v1",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "audience_problem",
      "why_problem_exists",
      "core_tension",
      "central_claim",
      "planted_question",
      "opening_intent",
      "hook_resolution",
      "resolution",
      "payoff",
      "intended_action",
      "framework",
      "steps",
      "comparison_criteria",
      "ctaIntent",
    ],
    properties: {
      audience_problem: { type: "string" },
      why_problem_exists: { type: "string" },
      core_tension: { type: "string" },
      central_claim: { type: "string" },
      planted_question: { type: "string" },
      opening_intent: { type: "string" },
      hook_resolution: { type: "string" },
      resolution: { type: "string" },
      payoff: { type: "string" },
      intended_action: { type: "string" },
      framework: { type: "array", items: { type: "string" } },
      steps: { type: "array", items: { type: "string" } },
      comparison_criteria: { type: "array", items: { type: "string" } },
      ctaIntent: { type: "string" },
    },
  },
};

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function polishAtomCraftOpenAi(args: {
  atom: ContentAtom;
  envelope: AtomBuildEnvelope;
  apiKey?: string;
  companyId?: string;
}): Promise<CraftPolishResult | null> {
  const apiKey = args.apiKey ?? process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = resolveModel("contentAtomLlm");
  const k = args.atom.kernel;
  const mod = args.atom.narrativeModules[args.atom.lineage.angle];
  const system = [
    "You are a craft polish pass for a Content Atom.",
    "Pass-1 already produced grounded fields. Rewrite ONLY the prose for storytelling power.",
    "Hard rules:",
    "1. Use only facts present in pass1_fields and allowed_facts. Do not invent numbers, products, studies, or medical claims.",
    "2. Preserve meaning of the central claim; do not change what is being argued.",
    "3. If pass1 promises N checks/steps, enumerate exactly N items in framework or steps — or reduce the promise to match existing items.",
    "4. intended_action must be one complete sentence under 280 characters.",
    "5. For educational topics, put brand only in ctaIntent as a closing bridge.",
    buildCraftClause("atom_polish"),
    "Respond with JSON matching the schema.",
  ].join("\n");

  const user = JSON.stringify({
    polishVersion: ATOM_CRAFT_POLISH_VERSION,
    brand_name: args.envelope.brand.name,
    topic_category: args.envelope.topic.topicCategory ?? null,
    master_title: args.atom.lineage.masterTitle,
    angle: args.atom.lineage.angle,
    pass1_fields: {
      audience_problem: k.audience_problem,
      why_problem_exists: k.why_problem_exists,
      core_tension: k.core_tension,
      central_claim: k.central_claim.canonical_wording,
      planted_question: k.hook_strategy.planted_question,
      opening_intent: k.hook_strategy.opening_intent,
      hook_resolution: k.hook_strategy.resolution,
      resolution: k.resolution,
      payoff: k.payoff,
      intended_action: k.intended_action,
      framework: mod?.framework ?? [],
      steps: mod?.steps ?? [],
      comparison_criteria: mod?.comparisonCriteria ?? [],
      ctaIntent: args.atom.distributionContract.ctaIntent ?? "",
    },
    allowed_facts: args.envelope.evidence.map((e) => ({
      id: e.evidence_id,
      summary: e.summary,
    })),
  });

  const result = await callBrainLlm({
    apiKey,
    model,
    system,
    user,
    jsonSchema: POLISH_JSON_SCHEMA,
    maxOutputTokens: tokenBudget("atomCraftPolish"),
    timeoutMs: 60_000,
    maxRetries: 1,
    costScope: {
      companyId:
        args.companyId ?? args.envelope.identity.company_id,
    },
  });

  if (!result.ok || !result.raw) return null;

  try {
    const raw = JSON.parse(result.raw) as Record<string, unknown>;
    return {
      polishVersion: ATOM_CRAFT_POLISH_VERSION,
      fields: {
        audience_problem: asString(raw.audience_problem),
        why_problem_exists: asString(raw.why_problem_exists),
        core_tension: asString(raw.core_tension),
        central_claim: asString(raw.central_claim),
        planted_question: asString(raw.planted_question),
        opening_intent: asString(raw.opening_intent),
        hook_resolution: asString(raw.hook_resolution),
        resolution: asString(raw.resolution),
        payoff: asString(raw.payoff),
        intended_action: asString(raw.intended_action),
        framework: asStringArray(raw.framework),
        steps: asStringArray(raw.steps),
        comparison_criteria: asStringArray(raw.comparison_criteria),
        ctaIntent: asString(raw.ctaIntent) || undefined,
      },
    };
  } catch {
    return null;
  }
}
