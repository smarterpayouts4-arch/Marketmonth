/**
 * Assertion-level banned-claim detection.
 * belief_shift.from is exempt (belief being challenged).
 * Negated / dispelling usage is allowed ("rather than guaranteed results").
 */

const NEGATION_MARKERS =
  /(?:\bnot?\b|\bnever\b|\bwithout\b|\brather than\b|\binstead of\b|n[o']t\b|\bwon't\b|\bdoesn't\b|\bdoes not\b|\bisn't\b|\baren't\b|\bavoid\b|\bno\b)/;

export function collectAssertedText(parts: {
  audience_state: string;
  audience_problem: string;
  why_problem_exists: string;
  core_tension: string;
  central_claim: string;
  belief_shift_to: string;
  resolution: string;
  payoff: string;
  claimTexts: string[];
  extraTexts?: string[];
}): string {
  return [
    parts.audience_state,
    parts.audience_problem,
    parts.why_problem_exists,
    parts.core_tension,
    parts.central_claim,
    parts.belief_shift_to,
    parts.resolution,
    parts.payoff,
    ...parts.claimTexts,
    ...(parts.extraTexts ?? []),
  ]
    .join(" \n ")
    .toLowerCase();
}

export function findAssertedBannedClaims(
  assertedText: string,
  bannedClaims: readonly string[]
): string[] {
  const hits: string[] = [];
  for (const banned of bannedClaims) {
    const phrase = banned.trim().toLowerCase();
    if (!phrase) continue;
    let idx = assertedText.indexOf(phrase);
    while (idx !== -1) {
      const preceding = assertedText.slice(Math.max(0, idx - 40), idx);
      if (!NEGATION_MARKERS.test(preceding)) {
        hits.push(banned);
        break;
      }
      idx = assertedText.indexOf(phrase, idx + phrase.length);
    }
  }
  return hits;
}

/**
 * Heuristic: claim-like framing that needs evidence (demotes, does not hard-invalidate).
 * Catches comparative / performance / medical / market assertions in free text.
 */
export function findClaimLikeFraming(
  texts: Array<{ path: string; text: string }>
): Array<{ path: string; snippet: string }> {
  const patterns = [
    /\b(easier|better|faster|safer|more effective|superior)\b.{0,40}\b(for most|than|vs\.?|versus)\b/i,
    /\b(guarantees?|cures?|treats?|diagnoses?|clinically proven)\b/i,
    /\b(most people|everyone|always|never fails)\b/i,
    /\b(#1|number one|best in|market.?leading)\b/i,
    /\b(absorbs? better|bioavailable|works better)\b/i,
  ];
  const hits: Array<{ path: string; snippet: string }> = [];
  for (const { path, text } of texts) {
    const t = text.trim();
    if (!t) continue;
    for (const re of patterns) {
      const m = re.exec(t);
      if (!m || m.index === undefined) continue;
      const preceding = t.slice(Math.max(0, m.index - 40), m.index);
      // Dispelling / negated wording is not an asserted performance claim.
      if (NEGATION_MARKERS.test(preceding)) continue;
      hits.push({ path, snippet: t.slice(0, 120) });
      break;
    }
  }
  return hits;
}
