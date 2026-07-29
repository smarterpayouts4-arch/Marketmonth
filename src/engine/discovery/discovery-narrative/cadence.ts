import type { CadenceRecommendation } from "@/lib/discovery/discovery-narrative.schema";
import type { CompanyProfileProjection } from "@/lib/company-profile/projection.schema";

import type { BrandSignalGraph } from "./types";
import type { DetectedChannel } from "@/lib/discovery/discovery-narrative.schema";

export type ContentInventoryScore = {
  score: number;
  productsServices: number;
  faqs: number;
  educationalTopics: number;
  ownedTopics: number;
  seoOpportunities: number;
  trustSignals: number;
  detectedChannels: number;
};

export function scoreContentInventory(
  projection: CompanyProfileProjection,
  graph: BrandSignalGraph,
  channels: DetectedChannel[]
): ContentInventoryScore {
  const productsServices =
    projection.products.length +
    projection.services.length +
    projection.indexedProducts.length;
  const faqs =
    projection.faqs.length ||
    graph.contentInventory
      .concat(graph.trustSignals, graph.valueMechanism)
      .filter((i) => i.field === "faq" || i.field === "entry").length;

  const topicTokens = (text: string) =>
    text
      .split(/\s*[·|]\s*|\n/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

  const educationalTopics = Math.max(
    graph.contentInventory.filter((i) => i.field === "heading").length,
    graph.contentInventory
      .filter((i) => i.field === "educationalTopics")
      .reduce((n, i) => n + topicTokens(i.normalizedText ?? "").length, 0)
  );
  const ownedTopics = graph.contentInventory
    .filter((i) => i.field === "ownedTopics")
    .reduce((n, i) => n + Math.max(1, topicTokens(i.normalizedText ?? "").length), 0);
  const seoOpportunities = projection.contentOpportunities.length;
  const trustSignals = graph.trustSignals.filter(
    (i) => i.confidence !== "low"
  ).length;
  const detectedChannels = channels.filter(
    (c) => c.status === "link-detected"
  ).length;

  // Weighted inventory score (not hardcoded to a brand).
  // Caps keep a single dense crawl from auto-pushing "active"/"daily".
  const score =
    Math.min(productsServices, 8) * 1.0 +
    Math.min(faqs, 8) * 1.2 +
    Math.min(educationalTopics, 8) * 1.0 +
    Math.min(ownedTopics, 4) * 1.2 +
    Math.min(seoOpportunities, 6) * 0.8 +
    Math.min(trustSignals, 4) * 0.8 +
    Math.min(detectedChannels, 4) * 1.2;

  return {
    score,
    productsServices,
    faqs,
    educationalTopics,
    ownedTopics,
    seoOpportunities,
    trustSignals,
    detectedChannels,
  };
}

/**
 * Cadence is always a Market Month recommendation — never website evidence.
 * Daily is never automatic.
 *
 * Tiers (approx): light < 14 · consistent < 42 · active otherwise.
 * A rich company with FAQs + catalog + 3 social links should land on consistent.
 */
export function recommendCadence(
  inventory: ContentInventoryScore
): CadenceRecommendation {
  const rationale: string[] = [];
  rationale.push(
    `Content inventory score ${inventory.score.toFixed(1)} from products/services (${inventory.productsServices}), FAQs (${inventory.faqs}), topics (${inventory.educationalTopics + inventory.ownedTopics}), and detected channels (${inventory.detectedChannels}).`
  );

  if (inventory.score < 14) {
    rationale.push(
      "Limited topic variety suggests starting light so consistency stays sustainable."
    );
    return {
      level: "light",
      label: "Light: two posts per week",
      postsPerWeekRange: [2, 2],
      description:
        "Two posts per week — recommended by Market Month for limited content inventory or lower production capacity.",
      rationale,
      classification: "recommended",
    };
  }

  if (inventory.score < 42) {
    rationale.push(
      "Enough topic variety exists for a steady rhythm without daily production pressure."
    );
    return {
      level: "consistent",
      label: "Consistent: one post every two to three days",
      postsPerWeekRange: [3, 3],
      description:
        "Approximately three posts per week — recommended by Market Month as the preferred default when there is enough topic variety.",
      rationale,
      classification: "recommended",
    };
  }

  rationale.push(
    "Strong inventory of formats and topics supports a more active publishing pace. Daily is never automatic."
  );
  return {
    level: "active",
    label: "Active: four to five posts per week",
    postsPerWeekRange: [4, 5],
    description:
      "Four to five posts per week — recommended by Market Month only when there are enough distinct formats and topics.",
    rationale,
    classification: "recommended",
  };
}
