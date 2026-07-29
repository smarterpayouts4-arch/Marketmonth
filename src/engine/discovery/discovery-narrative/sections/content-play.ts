import type {
  ContentPillar,
  DiscoverySection,
} from "@/lib/discovery/discovery-narrative.schema";

import type { BrandSignalGraph, EvidenceItem } from "../types";
import { pickTopicHint } from "../topic-selection";
import {
  bulletFrom,
  businessNoun,
  createEvidenceLedger,
  toEvidenceRef,
} from "./helpers";

/**
 * Derive 3–5 pillars from the company's own evidence — never a fixed template.
 */
export function deriveContentPillars(
  graph: BrandSignalGraph,
  businessName: string
): ContentPillar[] {
  const candidates: Array<{
    id: string;
    name: string;
    description: string;
    items: EvidenceItem[];
  }> = [];

  const compareItems = [
    ...graph.valueMechanism.filter((i) =>
      /compar|price|option|product|indexed/i.test(i.field + " " + (i.normalizedText ?? ""))
    ),
    ...graph.contentInventory.filter((i) => /compar/i.test(i.normalizedText ?? "")),
  ];
  if (compareItems.length) {
    candidates.push({
      id: "compare-clearly",
      name: "Compare clearly",
      description: "Help people evaluate options with simple, side-by-side clarity.",
      items: compareItems,
    });
  }

  const decodeItems = [
    ...graph.contentInventory.filter((i) =>
      /faq|heading|educational|label|ingredient|form|how/i.test(
        i.field + " " + (i.normalizedText ?? "")
      )
    ),
    ...graph.customerProblem,
  ];
  if (decodeItems.length) {
    candidates.push({
      id: "decode-the-decision",
      name: "Decode the decision",
      description: "Turn confusing product language into teachable decision steps.",
      items: decodeItems,
    });
  }

  const personalizeItems = [
    ...graph.valueMechanism.filter((i) =>
      /plan|prefer|diet|budget|advisor|personal/i.test(i.normalizedText ?? "")
    ),
    ...graph.offerInventory,
  ];
  if (personalizeItems.length) {
    candidates.push({
      id: "personalize-the-choice",
      name: "Personalize the choice",
      description: "Show how preferences and constraints change the shortlist.",
      items: personalizeItems,
    });
  }

  const trustItems = graph.trustSignals;
  if (trustItems.length) {
    candidates.push({
      id: "build-trust",
      name: "Build trust",
      description: "Reinforce independence, transparency, and evidence-minded guidance.",
      items: trustItems,
    });
  }

  // Fallback pillars from whatever inventory exists
  if (candidates.length < 3) {
    const headings = graph.contentInventory.filter((i) => i.field === "heading");
    for (const h of headings) {
      if (candidates.length >= 4) break;
      const slug = (h.normalizedText ?? "topic")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      if (candidates.some((c) => c.id === slug)) continue;
      candidates.push({
        id: slug || `topic-${candidates.length + 1}`,
        name: (h.normalizedText ?? "Core topic").slice(0, 40),
        description: `Recurring content drawn from “${h.normalizedText}” on the site.`,
        items: [h],
      });
    }
  }

  if (candidates.length < 3) {
    const identity = graph.businessIdentity.slice(0, 1);
    candidates.push({
      id: "teach-the-offer",
      name: "Teach the offer",
      description: `Explain what ${businessName} does in practical, repeatable language.`,
      items: identity.length ? identity : graph.valueMechanism.slice(0, 1),
    });
  }

  return candidates.slice(0, 5).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    evidence: c.items.slice(0, 3).map(toEvidenceRef),
  }));
}

export function buildContentPlaySection(input: {
  businessName: string;
  graph: BrandSignalGraph;
  pillars: ContentPillar[];
  cadenceLabel: string;
  ownedIdea: string;
}): DiscoverySection {
  const name = businessNoun(input.businessName);
  const support = [
    ...input.graph.contentInventory,
    ...input.graph.valueMechanism,
    ...input.graph.trustSignals,
  ].filter((i) => i.normalizedText);

  const pillarNames = input.pillars.map((p) => p.name).join(", ");
  const topic = pickTopicHint(input.graph, input.ownedIdea);

  // Each bullet draws from the pool that actually supports its claim, with a
  // shared ledger so no two bullets surface the same primary excerpt.
  const ledger = createEvidenceLedger();
  const topicPool = [
    ...(topic.source ? [topic.source] : []),
    ...input.graph.contentInventory.filter((i) => i.field === "heading"),
    ...input.graph.offerInventory,
    ...input.graph.contentInventory,
  ];
  const valueTrustPool = [
    ...input.graph.valueMechanism,
    ...input.graph.trustSignals,
  ];
  const platformPool = [...input.graph.socialFootprint, ...input.graph.contentInventory];

  const bullets = [
    bulletFrom(
      `Build one monthly idea around ${topic.phrase}, then expand it across days and formats.`,
      [...topicPool, ...support],
      "recommended",
      ledger
    ),
    bulletFrom(
      `Recurring pillars grounded in your evidence: ${pillarNames}.`,
      [...valueTrustPool, ...support],
      "inferred",
      ledger
    ),
    bulletFrom(
      `Adapt the same idea by platform instead of pasting identical posts everywhere.`,
      [...platformPool, ...support],
      "recommended",
      ledger
    ),
    bulletFrom(
      `Publishing rhythm: ${input.cadenceLabel} — recommended by Market Month, not found on your website.`,
      [...topicPool, ...support],
      "recommended",
      ledger
    ),
    bulletFrom(
      `Make ${name} known for helping people move from confusion to “${input.ownedIdea.toLowerCase()}” through connected content.`,
      [...valueTrustPool, ...support],
      "recommended",
      ledger
    ),
  ].filter(Boolean);

  return {
    id: "content-play",
    label: "Your Content Play",
    subheading: "A repeatable publishing system",
    headline: "Build one monthly idea, then expand it across days, formats, and platforms.",
    bullets: bullets.slice(0, 5) as DiscoverySection["bullets"],
    socialMeaning:
      "Consistency is more sustainable when content comes from one core topic rather than unrelated daily ideas.",
    reveal: `Market Month can turn the strategy already inside ${name} into a consistent monthly system.`,
  };
}
