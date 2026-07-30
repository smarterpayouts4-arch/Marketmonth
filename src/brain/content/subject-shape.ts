/**
 * Shared subject-shape helpers for FAQ / noun / other labels.
 * Zero internal imports — safe for evaluation + content layers.
 */

export type SubjectShape = "question" | "noun" | "other";

export const QUESTION_LEAD_RE =
  /^(who|whose|what|when|where|why|how|which|does|do|did|is|are|was|were|can|could|should|would|will)\b/i;

export function isQuestionShapedSubject(text: string): boolean {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return false;
  if (t.endsWith("?")) return true;
  return QUESTION_LEAD_RE.test(t);
}

export function classifySubjectShape(text: string): SubjectShape {
  if (isQuestionShapedSubject(text)) return "question";
  const t = text.trim();
  if (!t) return "other";
  // Short noun phrases without interrogative lead
  if (!QUESTION_LEAD_RE.test(t) && t.split(/\s+/).length <= 12) return "noun";
  return "other";
}

/**
 * Derive a noun phrase from a question-shaped subject without inventing words.
 * "Do you offer same-day emergency service?" → "same-day emergency service"
 */
export function toNounSubject(text: string): string | null {
  let t = text.trim().replace(/\s+/g, " ");
  if (!t) return null;
  t = t.replace(/[?!.]+$/g, "").trim();

  const patterns: RegExp[] = [
    /^(?:do|does|did|can|could|should|would|will)\s+(?:you|we|they|it)\s+(?:offer|provide|have|sell|include|support|cover)\s+(.+)$/i,
    /^(?:is|are|was|were)\s+(?:there|it)\s+(.+)$/i,
    /^(?:what|which)\s+(?:is|are|was|were)\s+(?:the\s+)?(.+)$/i,
    /^(?:how|when|where|why)\s+(?:do|does|did|can|could|should|would|will|is|are)\s+(?:you|we|i|they|it)?\s*(.+)$/i,
    /^(?:who|whose|what|when|where|why|how|which|does|do|did|is|are|was|were|can|could|should|would|will)\b[\s,:-]+(.+)$/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    const rest = m?.[1]?.trim();
    if (rest && rest.length >= 3 && !QUESTION_LEAD_RE.test(rest)) {
      return capitalizeNoun(rest);
    }
  }

  if (!QUESTION_LEAD_RE.test(t) && t.length >= 3) return capitalizeNoun(t);
  return null;
}

function capitalizeNoun(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type DualSubjectFields = {
  rawSubject: string;
  normalizedSubject: string;
  subjectShape: SubjectShape;
};

/** Strip dangling list/heading separators without inventing words. */
function stripSeparatorEdges(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s·|—–\-,;:]+/u, "")
    .replace(/[\s·|—–\-,;:]+$/u, "")
    .trim();
}

/** Build dual subject fields; never invent replacement wording. */
export function dualSubjectFromLabel(raw: string): DualSubjectFields {
  const rawSubject = stripSeparatorEdges(raw);
  const subjectShape = classifySubjectShape(rawSubject);
  const noun =
    subjectShape === "question" ? toNounSubject(rawSubject) : null;
  const normalizedSubject = stripSeparatorEdges(
    noun ??
      (subjectShape === "question"
        ? rawSubject.replace(/[?!.]+$/g, "").trim()
        : rawSubject)
  );
  return { rawSubject, normalizedSubject, subjectShape };
}
