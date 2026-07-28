/**
 * Reject insights that would read the same for unrelated companies
 * (five-company swap test).
 */

const GENERIC_PHRASES = [
  /create educational content/i,
  /use social proof/i,
  /expand to tiktok/i,
  /try (instagram|tiktok|facebook)/i,
  /focus on transparency/i,
  /encourage user[- ]generated content/i,
  /user[- ]generated content/i,
  /build authority with educational content/i,
  /post (more )?consistently/i,
  /leverage (ugc|user[- ]generated)/i,
  /be more transparent/i,
  /improve your seo/i,
  /grow on social media/i,
];

/** True when the sentence is too generic to be a company-specific reward. */
export function failsFiveCompanyTest(insight: string): boolean {
  const cleaned = insight.replace(/\s+/g, " ").trim();
  if (!cleaned) return true;
  if (GENERIC_PHRASES.some((re) => re.test(cleaned))) return true;

  // Template-like “focus on X” without a concrete object from the business.
  if (/^(focus on|prioritize|emphasize)\s+\w+\.?$/i.test(cleaned)) return true;

  return false;
}

/** Soft demotion: phrases that sound strategic but are usually ungrounded. */
export function looksLikeUnsupportedClaim(text: string): boolean {
  return (
    /lowest prices available/i.test(text) ||
    /ensuring the lowest/i.test(text) ||
    /guaranteed (results|savings)/i.test(text) ||
    /missed channels?:/i.test(text)
  );
}

/** Soften absolute commercial claims for presentation. */
export function softenUnverifiedClaims(text: string): string {
  return text
    .replace(/ensuring the lowest prices available/gi, "comparing available prices")
    .replace(/the lowest prices available/gi, "available prices")
    .replace(/lowest prices/gi, "available prices")
    .replace(/\s+/g, " ")
    .trim();
}
