import { evaluateSafety, mergeSafety } from "./safety";
import type { ContentBrainContext, MasterTopic, SafetyFlags } from "./types";
import { shortHash } from "./evidence";

export type ExpandUserTopicResult =
  | {
      ok: true;
      masterTopic: MasterTopic;
      warnings: string[];
    }
  | {
      ok: false;
      missingFields: string[];
      warnings: string[];
      safety: SafetyFlags;
    };

/**
 * Manual mode: preserve the owner's topic text as the master umbrella.
 * Evaluate relevance + safety; do not rewrite the punchline away.
 */
export function evaluateAndExpandUserTopic(args: {
  topic: string;
  context: ContentBrainContext;
}): ExpandUserTopicResult {
  const topic = args.topic.trim();
  const warnings: string[] = [];

  if (!topic) {
    return {
      ok: false,
      missingFields: ["topic"],
      warnings: ["Topic is required in manual mode"],
      safety: { status: "blocked", reasons: ["Empty topic"] },
    };
  }

  if (topic.length < 8) {
    return {
      ok: false,
      missingFields: ["topic"],
      warnings: ["Topic is too short to develop into directions"],
      safety: { status: "needs_review", reasons: ["Topic too short"] },
    };
  }

  const safety = evaluateSafety(topic);
  if (safety.status === "blocked") {
    return {
      ok: false,
      missingFields: [],
      warnings: ["Topic failed safety checks"],
      safety,
    };
  }

  const relevance = scoreRelevance(topic, args.context);
  if (relevance < 0.15) {
    warnings.push(
      "Topic has weak overlap with known brand context; directions may be loosely grounded"
    );
  }

  const evidenceIds = pickEvidenceIds(args.context, 3);
  const subheading =
    args.context.valueProposition?.trim() ||
    args.context.description?.trim() ||
    `Develop clear directions for ${args.context.brandName}`;

  const masterTopic: MasterTopic = {
    id: `master_${shortHash(`manual|${topic}|${args.context.contextVersion}`)}`,
    source: "manual",
    punchline: clamp(topic, 90),
    subheading: clamp(subheading, 150),
    rationale: clamp(
      `Owner-selected master topic for ${args.context.brandName}. Six alternative editorial directions will explore this umbrella without replacing it.`,
      280
    ),
    evidenceIds,
    confidence: relevance >= 0.4 ? "high" : relevance >= 0.2 ? "medium" : "low",
    safety: mergeSafety(safety, evaluateSafety(subheading)),
  };

  return { ok: true, masterTopic, warnings };
}

function scoreRelevance(topic: string, context: ContentBrainContext): number {
  const tokens = tokenize(topic);
  if (tokens.length === 0) return 0;
  const corpus = [
    context.brandName,
    context.description,
    context.audience,
    context.valueProposition,
    context.marketingOpportunity,
    ...context.products,
    ...context.services,
    ...context.contentOpportunities,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const t of tokens) {
    if (corpus.includes(t)) hits += 1;
  }
  return hits / tokens.length;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

function pickEvidenceIds(context: ContentBrainContext, n: number): string[] {
  return Object.keys(context.evidenceById).slice(0, n);
}

function clamp(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
