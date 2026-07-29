/**
 * EXPERIMENT — script-only display polish for discovery evidence rows.
 *
 * Deliberately lives under scripts/ so no product module can import it. Current
 * product doctrine (project-knowledge/FEATURES/discovery-engine.md) says the engine
 * builds card copy and the UI "formats only" — enabling this in the product requires
 * an explicit doctrine amendment, not an import.
 *
 * Scope is display-only: row `title` and `summary`. Never bullet text, classification,
 * evidence refs, cadence copy, social wording, insight headlines, or takeaways.
 * Validation is fail-closed: a rejected row keeps its deterministic copy.
 */
import OpenAI from "openai";
import { z } from "zod";

import {
  hasMedicalOrStudyClaim,
  hasNewNumbers,
} from "../../src/brain/evaluation/creative-safety";
import type { CardEvidenceRow } from "./format-discovery-card";

/** Same phrasing ban the narrative goldens assert. */
const FORBIDDEN_SOCIAL_RE =
  /\b(no account|not active|unused|missing account|inactive)\b/i;

const JUNK_RE =
  /@context|schema\.org|application\/ld\+json|<script|neon[_-]?record|candidate[_-]?id/i;

const TITLE_MIN_WORDS = 2;
const TITLE_MAX_WORDS = 6;
const SUMMARY_MAX_WORDS = 30;

const polishOutputSchema = z.object({
  rows: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(80),
        summary: z.string().min(1).max(260),
      })
    )
    .min(1)
    .max(12),
});

export type PolishRejection = {
  id: string;
  reason: string;
  attempted: string;
};

export type PolishOutcome = {
  rows: CardEvidenceRow[];
  rejections: PolishRejection[];
  model: string;
  polishedCount: number;
  error?: string;
};

const SYSTEM = `You improve the DISPLAY WORDING of evidence rows on a marketing discovery card.

Each row has a deterministic title, a summary line, and the source detail it came from.

You may improve: clarity, specificity, and readability of the title and summary.
You must NOT: introduce any fact, number, product, platform, metric, or claim that is not present in the row's detail or supporting points. You must not add social-media performance claims. You must not say an account is missing, unused, or inactive.

Rules:
- title: ${TITLE_MIN_WORDS}-${TITLE_MAX_WORDS} words, plain sentence case, describes what the evidence shows. Titles must be DISTINCT from each other.
- summary: one sentence, at most ${SUMMARY_MAX_WORDS} words, grounded strictly in the detail.
- If a row's detail is garbled, truncated, or unusable, echo the currentTitle and currentSummary back verbatim. Do not invent readable copy to cover for bad input, and do not write the word "unchanged".

Return JSON: { "rows": [ { "id": string, "title": string, "summary": string } ] }`;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Capitalized tokens in output that never appear in the grounded source.
 * Skips sentence-initial position: an ordinary word capitalized because it starts
 * the title or a sentence is not a claim about a new entity.
 */
function novelProperNouns(
  candidate: string,
  sourceBlob: string,
  allowed: string[]
): string[] {
  const source = sourceBlob.toLowerCase();
  const allowSet = new Set(allowed.map((a) => a.toLowerCase()));
  return [...candidate.matchAll(/([.!?—–-]\s*|^)?\b([A-Z][A-Za-z]{2,})\b/g)]
    .filter((m) => m[1] === undefined)
    .map((m) => m[2]!)
    .filter((token, index, all) => all.indexOf(token) === index)
    .filter(
      (token) =>
        !source.includes(token.toLowerCase()) && !allowSet.has(token.toLowerCase())
    );
}

function validateRow(
  original: CardEvidenceRow,
  next: { title: string; summary: string },
  businessName: string
): string | null {
  const grounded = [
    original.detail,
    original.summary,
    original.title,
    businessName,
    ...original.supportingPoints,
  ].join(" ");
  const candidate = `${next.title} ${next.summary}`;

  if (/\bUNCHANGED\b/.test(candidate)) return "model_declined_unusable_input";
  if (JUNK_RE.test(candidate)) return "junk_leak";
  if (FORBIDDEN_SOCIAL_RE.test(candidate)) return "forbidden_social_phrasing";
  if (hasMedicalOrStudyClaim(candidate)) return "medical_or_study_claim";
  if (hasNewNumbers(candidate, grounded)) return "new_number";

  const novel = novelProperNouns(candidate, grounded, [businessName]);
  if (novel.length > 0) return `novel_entity:${novel.join(",")}`;

  const titleWords = wordCount(next.title);
  if (titleWords < TITLE_MIN_WORDS || titleWords > TITLE_MAX_WORDS) {
    return `title_length:${titleWords}w`;
  }
  if (wordCount(next.summary) > SUMMARY_MAX_WORDS) {
    return `summary_length:${wordCount(next.summary)}w`;
  }
  return null;
}

export async function polishCardRows(
  rows: CardEvidenceRow[],
  context: { businessName: string; model: string }
): Promise<PolishOutcome> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      rows,
      rejections: [],
      model: context.model,
      polishedCount: 0,
      error: "missing OPENAI_API_KEY",
    };
  }

  const payload = {
    businessName: context.businessName,
    rows: rows.map((r) => ({
      id: r.id,
      currentTitle: r.title,
      currentSummary: r.summary,
      detail: r.detail,
      supportingPoints: r.supportingPoints,
      classification: r.kind,
    })),
  };

  let parsed: unknown;
  try {
    const client = new OpenAI({ apiKey });
    // nano / reasoning models reject custom temperature — omit for default.
    const completion = await client.chat.completions.create({
      model: context.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      return {
        rows,
        rejections: [],
        model: context.model,
        polishedCount: 0,
        error: "empty model content",
      };
    }
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      rows,
      rejections: [],
      model: context.model,
      polishedCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const result = polishOutputSchema.safeParse(parsed);
  if (!result.success) {
    return {
      rows,
      rejections: [],
      model: context.model,
      polishedCount: 0,
      error: `schema mismatch: ${result.error.issues[0]?.message ?? "unknown"}`,
    };
  }

  const byId = new Map(result.data.rows.map((r) => [r.id, r]));
  const rejections: PolishRejection[] = [];
  const seenTitles = new Set<string>();
  let polishedCount = 0;

  const out = rows.map((row) => {
    const next = byId.get(row.id);
    if (!next) {
      rejections.push({ id: row.id, reason: "missing_from_output", attempted: "" });
      return row;
    }
    const failure = validateRow(row, next, context.businessName);
    if (failure) {
      rejections.push({
        id: row.id,
        reason: failure,
        attempted: `${next.title} — ${next.summary}`,
      });
      return row;
    }
    const titleKey = next.title.trim().toLowerCase();
    if (seenTitles.has(titleKey)) {
      rejections.push({
        id: row.id,
        reason: "duplicate_title",
        attempted: next.title,
      });
      return row;
    }
    seenTitles.add(titleKey);
    polishedCount += 1;
    return { ...row, title: next.title.trim(), summary: next.summary.trim() };
  });

  return {
    rows: out,
    rejections,
    model: context.model,
    polishedCount,
  };
}
