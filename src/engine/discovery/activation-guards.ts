/** Shared generic-rejection checks for engine activation (no UI imports). */

const GENERIC_PHRASES = [
  /create educational content/i,
  /expand to tiktok/i,
  /post more on social/i,
  /grow your brand/i,
  /engage your audience/i,
  /build awareness online/i,
  /^we sell things\.?$/i,
  /^(welcome|home|coming soon)\.?$/i,
];

export function failsGenericInsight(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const words = t.split(/\s+/).filter(Boolean);
  // Thin one-liners are not enough to claim a confident customer outcome
  if (words.length < 5) return true;
  return GENERIC_PHRASES.some((re) => re.test(t));
}
