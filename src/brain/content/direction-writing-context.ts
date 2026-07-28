import { z } from "zod";

import {
  MARKETING_FOCUS_VALUES,
  type MarketingFocus,
} from "./marketing-focus";
import type { ContentBrainContext } from "./types";

export const WRITING_CONTEXT_VERSION =
  "direction-writing-context-v1" as const;

export const DIRECTIONS_GENERATOR_VERSION =
  "deterministic-directions-v2" as const;

export type ObjectiveFramingStrategy =
  | "education_process"
  | "value_differentiation"
  | "awareness_positioning"
  | "decision_criteria"
  | "trust_credibility";

export type DerivedLabelSource =
  | "selected_topic"
  | "brand_context"
  | "title_fallback";

export type DerivedLabel<T = string> = {
  value: T;
  source: DerivedLabelSource;
  sourceField?: string;
};

/**
 * Structured handoff from a selected TopicCandidate (or typed Lab topic).
 * masterTitle must never be trim-assigned — validate without mutating.
 */
export type SelectedTopicContext = {
  topicId: string;
  masterTitle: string;
  objective: MarketingFocus;
  audience?: string;
  audiencePain?: string;
  strategicAngle?: string;
  relevanceReasons?: string[];
  evidenceIds?: string[];
  /** Preferred writing subject (candidate.subject.label) — not the hooked title. */
  subjectLabel?: string;
};

export type DirectionWritingContext = {
  masterTopic: string;
  topicSubject: string;
  topicSubjectDerived: DerivedLabel;
  audienceLabel: DerivedLabel;
  offerLabel: DerivedLabel;
  audiencePain?: DerivedLabel;
  valuePromise?: DerivedLabel;
  objective: MarketingFocus;
  framingStrategy: ObjectiveFramingStrategy;
};

export const selectedTopicContextSchema = z.object({
  topicId: z.string().min(1),
  masterTitle: z.string().refine(
    (value) => value.trim().length > 0,
    "Master title is required"
  ),
  objective: z.enum(MARKETING_FOCUS_VALUES),
  audience: z.string().optional(),
  audiencePain: z.string().optional(),
  strategicAngle: z.string().optional(),
  relevanceReasons: z.array(z.string()).optional(),
  evidenceIds: z.array(z.string()).optional(),
  subjectLabel: z.string().optional(),
});

export function framingStrategyForObjective(
  objective: MarketingFocus
): ObjectiveFramingStrategy {
  switch (objective) {
    case "product_education":
      return "education_process";
    case "value_proposition":
      return "value_differentiation";
    case "brand_awareness":
      return "awareness_positioning";
    case "decision_support":
      return "decision_criteria";
    case "trust_authority":
      return "trust_credibility";
  }
}

function label(
  value: string,
  source: DerivedLabelSource,
  sourceField?: string
): DerivedLabel {
  return { value, source, sourceField };
}

const GERUND_MAP: Record<string, string> = {
  evaluate: "evaluating",
  compare: "comparing",
  choose: "choosing",
  build: "building",
  use: "using",
  find: "finding",
  select: "selecting",
  trust: "trusting",
  understand: "understanding",
  rely: "relying",
};

/**
 * Fallback only: derive a concise subject phrase from a display title.
 * Does not mutate the original title.
 */
export function parseTopicSubjectFromTitle(masterTitle: string): string {
  let s = masterTitle.trim();
  const howTo = /^(how to|how should)\s+/i.test(s);
  s = s.replace(/^(how to|how should|why|what|when|where|who)\s+/i, "");
  s = s.replace(/\?+$/g, "");
  s = s.replace(/\s*[—–-]\s*before they commit\.?$/i, "");
  s = s.replace(/\s+before buying\.?$/i, "");
  s = s.replace(/\s+before they commit\.?$/i, "");
  if (!s) return masterTitle.trim() || "this topic";
  if (howTo) {
    const parts = s.split(/\s+/);
    const first = (parts[0] ?? "").toLowerCase();
    const gerund = GERUND_MAP[first];
    if (gerund) {
      parts[0] = gerund;
      s = parts.join(" ");
    }
  }
  return s.replace(/\s+/g, " ").trim();
}

function shortAudience(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t;
  return `${t.slice(0, 47).trimEnd()}…`;
}

/**
 * Build writing labels from selected topic metadata, then brand context,
 * then title-parse fallback. Never mutates inputs. masterTopic is exact.
 */
export function buildDirectionWritingContext(args: {
  selected?: SelectedTopicContext | null;
  context: ContentBrainContext;
  /** Exact master title when selected is absent (legacy). Not trim-assigned. */
  fallbackMasterTitle?: string;
  fallbackObjective?: MarketingFocus;
}): DirectionWritingContext {
  const selected = args.selected ?? null;
  const masterTopic = selected
    ? selected.masterTitle
    : (args.fallbackMasterTitle ?? "");
  if (!masterTopic.trim()) {
    throw new Error("masterTopic is required to build DirectionWritingContext");
  }

  const objective: MarketingFocus =
    selected?.objective ?? args.fallbackObjective ?? "product_education";
  const framingStrategy = framingStrategyForObjective(objective);

  let topicSubjectDerived: DerivedLabel;
  if (selected?.subjectLabel?.trim()) {
    topicSubjectDerived = label(
      parseTopicSubjectFromTitle(selected.subjectLabel.trim()),
      "selected_topic",
      "subjectLabel"
    );
  } else {
    // Angle is a hint — prefer title parse for subject when no label handoff
    topicSubjectDerived = label(
      parseTopicSubjectFromTitle(masterTopic),
      "title_fallback",
      "masterTitle"
    );
  }

  let audienceLabel: DerivedLabel;
  if (selected?.audience?.trim()) {
    audienceLabel = label(
      shortAudience(selected.audience),
      "selected_topic",
      "audience"
    );
  } else if (args.context.audience?.trim()) {
    audienceLabel = label(
      shortAudience(args.context.audience),
      "brand_context",
      "audience"
    );
  } else {
    audienceLabel = label(
      `${args.context.brandName} buyers`,
      "brand_context",
      "brandName"
    );
  }

  let offerLabel: DerivedLabel;
  const product0 = args.context.products[0]?.trim();
  const service0 = args.context.services[0]?.trim();
  if (product0) {
    offerLabel = label(product0, "brand_context", "products[0]");
  } else if (service0) {
    offerLabel = label(service0, "brand_context", "services[0]");
  } else if (args.context.marketingOpportunity?.trim()) {
    offerLabel = label(
      args.context.marketingOpportunity.trim().slice(0, 60),
      "brand_context",
      "marketingOpportunity"
    );
  } else {
    offerLabel = label(
      args.context.brandName,
      "brand_context",
      "brandName"
    );
  }

  let audiencePain: DerivedLabel | undefined;
  if (selected?.audiencePain?.trim()) {
    audiencePain = label(
      selected.audiencePain.trim(),
      "selected_topic",
      "audiencePain"
    );
  } else if (args.context.marketingOpportunity?.trim()) {
    audiencePain = label(
      args.context.marketingOpportunity.trim(),
      "brand_context",
      "marketingOpportunity"
    );
  }

  let valuePromise: DerivedLabel | undefined;
  if (args.context.valueProposition?.trim()) {
    valuePromise = label(
      args.context.valueProposition.trim(),
      "brand_context",
      "valueProposition"
    );
  }

  return {
    masterTopic,
    topicSubject: topicSubjectDerived.value,
    topicSubjectDerived,
    audienceLabel,
    offerLabel,
    audiencePain,
    valuePromise,
    objective,
    framingStrategy,
  };
}
