import type { BrandSignalGraph, EvidenceItem } from "./types";
import { truncatePhrase } from "../complete-sentence";

/**
 * Questions, legal boilerplate, and policy language describe what a business
 * must disclose — not what it should publish about. Selecting the first
 * available content item made Zynava's liability disclaimer the lead content
 * topic, so candidates are filtered before ranking.
 */
const NON_TOPIC_RE =
  /\?|^q:|\b(guarantees?|guaranteed|disclaimer|terms of|privacy polic|refunds?|liabilit(?:y|ies)|copyright|all rights reserved|cookies?|subscribe|newsletter|sign in|log in)\b/i;

const MIN_TOPIC_CHARS = 4;
const MAX_TOPIC_WORDS = 12;

function isTopicCandidate(item: EvidenceItem): boolean {
  const text = item.normalizedText?.trim();
  if (!text || text.length < MIN_TOPIC_CHARS) return false;
  if (item.field === "faq") return false;
  if (NON_TOPIC_RE.test(text)) return false;
  return text.split(/\s+/).length <= MAX_TOPIC_WORDS;
}

export type TopicSelection = {
  phrase: string;
  /** The item the phrase came from, so the bullet can cite its own topic. */
  source: EvidenceItem | null;
};

function firstPhrase(
  candidates: EvidenceItem[],
  maxChars: number
): TopicSelection | null {
  for (const candidate of candidates) {
    if (!isTopicCandidate(candidate)) continue;
    const phrase = truncatePhrase(candidate.normalizedText!, maxChars);
    if (phrase) return { phrase, source: candidate };
  }
  return null;
}

function fallback(ownedIdea: string, maxChars: number): TopicSelection {
  return {
    phrase: truncatePhrase(ownedIdea, maxChars) ?? ownedIdea,
    source: null,
  };
}

/**
 * Topic for the content-play bullet: prefer the site's own headings, which are
 * already short, editorial, and written to be read.
 */
export function pickTopicHint(
  graph: BrandSignalGraph,
  ownedIdea: string,
  maxChars = 80
): TopicSelection {
  const ordered = [
    ...graph.contentInventory.filter((i) => i.field === "heading"),
    ...graph.offerInventory,
    ...graph.contentInventory.filter((i) => i.field !== "heading"),
    ...graph.valueMechanism,
  ];
  return firstPhrase(ordered, maxChars) ?? fallback(ownedIdea, maxChars);
}

/**
 * Topic for the content universe: prefer a concrete product or offer, since it
 * reads naturally inside "How to approach ___ with more confidence".
 */
export function pickProductTopic(
  graph: BrandSignalGraph,
  ownedIdea: string,
  maxChars = 60
): TopicSelection {
  const ordered = [
    ...graph.offerInventory,
    ...graph.valueMechanism.filter((i) => i.field === "indexedProduct"),
    ...graph.contentInventory.filter((i) => i.field === "heading"),
    ...graph.valueMechanism,
  ];
  return firstPhrase(ordered, maxChars) ?? fallback(ownedIdea, maxChars);
}
