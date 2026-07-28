import type { DirectionsBrandCoreSlice } from "@/brain/core";

import { INTELLIGENT_V1_PROMPT_VERSION } from "./constants";

export function buildIntelligentV1Messages(args: {
  brandSlice: DirectionsBrandCoreSlice;
  masterTopic: string;
  mode: "manual" | "automatic";
}): { system: string; user: string; promptVersion: string } {
  const system = [
    "You are MarketMonth Directions Brain intelligent-v1.",
    "Return ONLY valid JSON matching the required schema.",
    "Use only IDs present in the Brand Core slice. Never invent IDs.",
    "reason_summary must cite slice IDs (problems, offers, claims, evidence) in plain language.",
    "Do not expose private chain-of-thought.",
    "Proof/evidence is not an approved claim unless listed under claims.",
    "Produce exactly six directions that differ by strategic question (differentiation_summary must be unique).",
    "Each direction needs at least one audience_problem_id.",
    "Each direction needs claim_ids OR non_claim_educational=true.",
    "Attach evidence_ids only if they appear in the selected claim's allowed_evidence_ids.",
    "Respect banned_claims and required_qualifiers.",
    "idea_summary must be 180–600 characters.",
  ].join(" ");

  const user = JSON.stringify(
    {
      mode: args.mode,
      instruction:
        args.mode === "manual"
          ? "Keep master_topic.topic exactly equal to the provided master_topic string. Ground six ideas in the Brand Core slice."
          : "Propose one master_topic grounded in the Brand Core slice, then six ideas.",
      master_topic: args.masterTopic,
      brand_core_slice: args.brandSlice,
      output_schema: {
        master_topic: {
          topic: "string",
          reason_summary: "string citing IDs",
          audience_problem_ids: ["problem_…"],
          offer_ids: ["offer_…"],
          claim_ids: ["claim_…"],
          evidence_ids: ["ev_…"],
        },
        directions: [
          {
            direction_id: "string",
            specific_topic: "string",
            idea_summary: "180-600 chars",
            strategic_angle: "string",
            audience_problem_ids: ["problem_…"],
            claim_ids: ["claim_…"],
            evidence_ids: ["ev_…"],
            required_qualifiers: [],
            differentiation_summary: "unique strategic question",
            non_claim_educational: false,
          },
        ],
      },
    },
    null,
    2
  );

  return {
    system,
    user,
    promptVersion: INTELLIGENT_V1_PROMPT_VERSION,
  };
}
