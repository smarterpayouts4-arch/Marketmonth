import type {
  ContentUniverse,
  PlatformAdaptation,
} from "@/lib/discovery/discovery-narrative.schema";

import type { BrandSignalGraph, EvidenceItem } from "./types";
import { truncateForEmbed } from "../complete-sentence";
import { pickProductTopic } from "./topic-selection";
import { firstText } from "./sections/helpers";

function pickCoreTopic(
  businessName: string,
  graph: BrandSignalGraph,
  ownedIdea: string
): { coreTopic: string; audienceProblem: string; refs: string[] } {
  const GENERIC_PROBLEM =
    "customers face too many choices without a clear way to decide";
  const problem = firstText(graph.customerProblem) || GENERIC_PROBLEM;

  const topic = pickProductTopic(graph, ownedIdea, 60);

  return {
    coreTopic: `How to approach ${topic.phrase} with more confidence`,
    audienceProblem: truncateForEmbed(problem, 160) ?? GENERIC_PROBLEM,
    refs: Array.from(
      new Set(
        [
          ...(topic.source ? [topic.source] : []),
          ...graph.customerProblem.slice(0, 2),
          ...graph.valueMechanism.slice(0, 2),
        ].map((i) => i.id)
      )
    ),
  };
}

/**
 * Expand one core topic into connected multi-day pieces.
 * Every piece stays tied to the same strategy; formats vary by platform.
 */
export function buildContentUniverse(input: {
  businessName: string;
  graph: BrandSignalGraph;
  ownedIdea: string;
  platforms: PlatformAdaptation[];
}): ContentUniverse {
  const { coreTopic, audienceProblem, refs } = pickCoreTopic(
    input.businessName,
    input.graph,
    input.ownedIdea
  );

  const platforms = input.platforms.slice(0, 4);
  const fallbackPlatform = platforms[0]?.platform ?? "facebook";

  const plan: Array<{
    dayOffset: number;
    platform: string;
    format: string;
    hook: string;
    angle: string;
    objective: ContentUniverse["pieces"][number]["objective"];
  }> = [
    {
      dayOffset: 1,
      platform: platforms.find((p) => p.platform === "tiktok" || p.platform === "instagram")?.platform ?? fallbackPlatform,
      format: "Short video hook",
      hook: `Start with the confusion around ${input.ownedIdea.toLowerCase()}.`,
      angle: "One sharp problem statement, one clear promise of clarity.",
      objective: "awareness",
    },
    {
      dayOffset: 3,
      platform:
        platforms.find((p) => p.platform === "instagram" || p.platform === "facebook")
          ?.platform ?? fallbackPlatform,
      format: "Carousel",
      hook: "Break the decision into a few visible steps.",
      angle: "Side-by-side comparison points customers can save.",
      objective: "education",
    },
    {
      dayOffset: 5,
      platform:
        platforms.find((p) => p.platform === "facebook")?.platform ?? fallbackPlatform,
      format: "Question / comparison post",
      hook: "Ask the question your audience is already asking.",
      angle: "Invite comments that reveal real buyer constraints.",
      objective: "consideration",
    },
    {
      dayOffset: 7,
      platform:
        platforms.find((p) => p.platform === "youtube")?.platform ?? fallbackPlatform,
      format: "Explainer",
      hook: `Go deeper on ${coreTopic.toLowerCase()}.`,
      angle: "A longer teaching piece that earns trust.",
      objective: "education",
    },
    {
      dayOffset: 9,
      platform:
        platforms.find((p) => p.platform === "linkedin")?.platform ?? fallbackPlatform,
      format: "Category perspective",
      hook: "Share the business point of view on trust and clarity.",
      angle: "Position the brand as a steady guide, not a loud seller.",
      objective: "trust",
    },
    {
      dayOffset: 11,
      platform: fallbackPlatform,
      format: "Tool / offer demonstration",
      hook: "Show the path from confusion to a clear next step.",
      angle: "Demonstrate the helpful action without overselling.",
      objective: "conversion",
    },
  ];

  const evidenceRefs =
    refs.length > 0 ? refs : input.graph.businessIdentity.slice(0, 1).map((i) => i.id);

  return {
    coreTopic,
    strategicPurpose: `Reinforce “${input.ownedIdea}” across days, formats, and platforms.`,
    audienceProblem,
    pieces: plan.map((p) => ({
      ...p,
      evidenceRefs: evidenceRefs.length ? evidenceRefs : ["narrative-core"],
    })),
  };
}

export function deriveOwnedIdea(graph: BrandSignalGraph, businessName: string): string {
  const tension = firstText(graph.customerProblem);
  const value = firstText(
    graph.valueMechanism.filter((i) => i.field === "valueProposition")
  );
  if (tension && /confus|overwhelm|too many|choice/i.test(tension)) {
    return "Confident decisions";
  }
  if (value && /compar|search|plan|clarity|clear/i.test(value)) {
    return "Clear, confident choices";
  }
  return `${businessName} clarity`;
}

export function supportItems(
  graph: BrandSignalGraph,
  n = 4
): EvidenceItem[] {
  return [
    ...graph.valueMechanism,
    ...graph.trustSignals,
    ...graph.contentInventory,
  ]
    .filter((i) => i.normalizedText && i.qualityScore >= 0.55)
    .slice(0, n);
}
