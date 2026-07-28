/**
 * Deterministic topic normalization for comparison grouping only.
 * Does not alter the user-visible input_topic.
 */
export function normalizeInputTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

export function topicsAreSimilar(a: string, b: string): boolean {
  const na = normalizeInputTopic(a);
  const nb = normalizeInputTopic(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}
