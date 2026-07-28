import type { SafetyFlags } from "./types";

/**
 * Claim-based safety (not category-based).
 * Educational framing is allowed; treatment / diagnosis / guaranteed outcomes are not.
 */

const BLOCKED_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\b(cure|cures|cured|curing)\b/i,
    reason: "Implies cure / treatment outcome",
  },
  {
    re: /\b(diagnos(?:e|es|is|ing)|treat(?:s|ing|ment)?|prescribe)\b/i,
    reason: "Implies medical diagnosis or treatment",
  },
  {
    re: /\b(guaranteed?\s+(results?|outcomes?|roi|growth)|100%\s+effective)\b/i,
    reason: "Guaranteed outcome claim",
  },
  {
    re: /\b(fda[\s-]?approved|clinically\s+proven\s+to\s+cure)\b/i,
    reason: "Regulated medical efficacy claim",
  },
];

const REVIEW_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\b(miracle|secret\s+hack|overnight\s+success)\b/i,
    reason: "Hype language needs review",
  },
  {
    re: /\b(best\s+in\s+the\s+world|never\s+fails)\b/i,
    reason: "Absolute superlative needs review",
  },
];

export function evaluateSafety(text: string): SafetyFlags {
  const hay = text.trim();
  if (!hay) {
    return { status: "needs_review", reasons: ["Empty copy"] };
  }

  const blocked: string[] = [];
  for (const { re, reason } of BLOCKED_PATTERNS) {
    if (re.test(hay)) blocked.push(reason);
  }
  if (blocked.length > 0) {
    return { status: "blocked", reasons: unique(blocked) };
  }

  const review: string[] = [];
  for (const { re, reason } of REVIEW_PATTERNS) {
    if (re.test(hay)) review.push(reason);
  }
  if (review.length > 0) {
    return { status: "needs_review", reasons: unique(review) };
  }

  return { status: "safe", reasons: [] };
}

export function mergeSafety(...flags: SafetyFlags[]): SafetyFlags {
  const reasons = unique(flags.flatMap((f) => f.reasons));
  if (flags.some((f) => f.status === "blocked")) {
    return { status: "blocked", reasons };
  }
  if (flags.some((f) => f.status === "needs_review")) {
    return { status: "needs_review", reasons };
  }
  return { status: "safe", reasons: [] };
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
