import type {
  DetectedChannel,
  DiscoverySection,
} from "@/lib/discovery/discovery-narrative.schema";

import type { BrandSignalGraph } from "../types";
import { truncateForEmbed } from "../../complete-sentence";
import { isHeadlineEligible } from "../normalize/score-evidence";
import { bulletFrom, businessNoun, firstText, pickText } from "./helpers";

export function buildWinSection(input: {
  businessName: string;
  graph: BrandSignalGraph;
  channels: DetectedChannel[];
  ownedIdea: string;
}): DiscoverySection {
  const name = businessNoun(input.businessName);
  const problems = pickText(input.graph.customerProblem, 4);
  const value = pickText(input.graph.valueMechanism, 4);
  const trust = pickText(input.graph.trustSignals, 4);
  const support = [...problems, ...value, ...trust];
  const eligible = isHeadlineEligible(support);

  const problemText =
    firstText(problems) ||
    "customers face too many options and conflicting claims";

  const headline = eligible
    ? `Become the brand people remember when ${shortProblem(problemText)}.`
    : `${name} can build recognition around one useful idea.`;

  const missing = input.channels
    .filter((c) => c.status === "link-not-detected")
    .map((c) => (c.platform === "x" ? "X" : c.platform.charAt(0).toUpperCase() + c.platform.slice(1)));

  // Boundary-safe: fall back to a generic framing rather than quote a fragment.
  const problemEmbed = truncateForEmbed(problemText, 140);

  const bullets = [
    bulletFrom(
      problemEmbed
        ? `Customers face pressure in moments like: ${problemEmbed}`
        : "Customers face pressure when the next decision is unclear.",
      problems.length ? problems : value,
      problems.length ? "observed" : "inferred"
    ),
    bulletFrom(
      `${name} can repeatedly answer the questions that appear during that uncertainty.`,
      [...value, ...problems],
      "inferred"
    ),
    bulletFrom(
      `The brand is positioned to own recognition around “${input.ownedIdea}.”`,
      [...value, ...trust],
      "inferred"
    ),
    trust.length
      ? bulletFrom(
          "Trust differentiators already on the site make that position credible when reinforced over time.",
          trust,
          "observed"
        )
      : null,
    missing.length
      ? bulletFrom(
          `${missing.slice(0, 3).join(", ")} ${missing.length === 1 ? "link was" : "links were"} not detected, which may represent optional expansion opportunities.`,
          input.graph.socialFootprint.length
            ? input.graph.socialFootprint
            : value,
          "recommended"
        )
      : null,
  ].filter(Boolean);

  return {
    id: "win",
    label: "Where You Can Win",
    subheading: "Customer need meets publishing opportunity",
    headline,
    bullets: bullets.slice(0, 5) as DiscoverySection["bullets"],
    socialMeaning:
      "A single post introduces an idea. A connected series across multiple days keeps one strategic message active — recommended by Market Month, not found on your website.",
    reveal:
      "The opportunity is not simply to post more. It is to become associated with one useful idea.",
    transition: "Next, the content play that turns this into a monthly system.",
  };
}

function shortProblem(text: string): string {
  const t = text.toLowerCase();
  if (/confus|overwhelm|too many|choice/.test(t)) {
    return "choices feel overwhelming";
  }
  if (/trust|claim|marketing/.test(t)) {
    return "claims feel hard to trust";
  }
  return "the next decision feels unclear";
}
