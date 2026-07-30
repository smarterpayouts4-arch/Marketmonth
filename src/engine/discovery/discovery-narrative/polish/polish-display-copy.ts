/**
 * Display-only copy polish for the Discovery card's evidence rows.
 *
 * Scope is deliberately narrow and sanctioned by
 * `project-knowledge/FEATURES/discovery-engine.md`: it may rewrite a row's
 * `title` and `summary` only. It never touches bullet text, classification,
 * evidence refs, cadence copy, pillars, platform guidance, insights, or
 * takeaways, and it never changes what the card claims — only how a claim reads.
 *
 * Runs as an awaited post-step after `buildDiscoveryNarrative`, which stays pure
 * and synchronous so the deterministic goldens remain reproducible.
 *
 * Fail-closed everywhere: no API key, a transport error, a schema mismatch, or a
 * single failed validator all leave the deterministic copy in place.
 */
import OpenAI from "openai";
import { z } from "zod";

import { buildCraftClause } from "@/brain/craft";
import {
  hasMedicalOrStudyClaim,
  hasNewNumbers,
} from "@/brain/evaluation/creative-safety";
import { resolveModel } from "@/brain/policy/model-registry";
import { tokenBudget } from "@/brain/policy/token-budgets";
import {
  MAX_CARD_ROWS,
  deterministicRowCopy,
} from "@/lib/discovery/card-copy";
import type {
  DiscoveryBullet,
  SocialDiscoveryProfile,
} from "@/lib/discovery/discovery-narrative.schema";

/** Same phrasing ban the narrative goldens assert. */
const FORBIDDEN_SOCIAL_RE =
  /\b(no account|not active|unused|missing account|inactive)\b/i;

const JUNK_RE =
  /@context|schema\.org|application\/ld\+json|<script|neon[_-]?record|candidate[_-]?id/i;

const TITLE_MIN_WORDS = 2;
const TITLE_MAX_WORDS = 6;
const SUMMARY_MAX_WORDS = 30;
const REQUEST_TIMEOUT_MS = 20_000;

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

export type PolishReport = {
  enabled: boolean;
  model: string;
  candidateCount: number;
  polishedCount: number;
  rejections: PolishRejection[];
  error?: string;
};

export type PolishResult = {
  profile: SocialDiscoveryProfile;
  report: PolishReport;
};

const SYSTEM = `You improve the DISPLAY WORDING of evidence rows on a marketing discovery card.

Each row has a deterministic title, a summary line, and the source detail it came from.

You may improve: clarity, specificity, and readability of the title and summary.
You must NOT: introduce any fact, number, product, platform, metric, or claim that is not present in the row's detail or supporting points. You must not add social-media performance claims. You must not say an account is missing, unused, or inactive.

Rules:
- title: ${TITLE_MIN_WORDS}-${TITLE_MAX_WORDS} words, plain sentence case, describes what the evidence shows. Titles must be DISTINCT from each other.
- summary: one sentence, at most ${SUMMARY_MAX_WORDS} words, grounded strictly in the detail.
- Write direct statements. Never hedge with "is described as", "appears to", or "seems to" — the detail is already the source of truth.
- If a row's detail is garbled, truncated, or unusable, echo the currentTitle and currentSummary back verbatim. Do not invent readable copy to cover for bad input, and do not write the word "unchanged".

${buildCraftClause("discovery_copy")}

Return JSON: { "rows": [ { "id": string, "title": string, "summary": string } ] }`;

type RowContext = {
  id: string;
  sectionIndex: number;
  bulletIndex: number;
  title: string;
  summary: string;
  detail: string;
  supportingPoints: string[];
  classification: DiscoveryBullet["classification"];
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** True when the word ends a clause, making the next word phrase-initial. */
const CLAUSE_END_RE = /[.!?:;]$/;

/**
 * Ordinary English words are never invented entities, even when they are absent
 * from a short grounded blob. "The tools and offerings support…" was rejected
 * because that row's source text happened to contain no "the".
 */
const COMMON_WORDS = new Set(
  [
    "the", "and", "but", "for", "not", "you", "your", "yours", "our", "ours",
    "its", "his", "her", "their", "they", "them", "this", "that", "these",
    "those", "with", "from", "into", "onto", "over", "under", "about", "after",
    "before", "between", "during", "through", "across", "around", "because",
    "when", "where", "while", "which", "what", "who", "whom", "whose", "how",
    "why", "each", "every", "both", "some", "any", "all", "more", "most",
    "less", "least", "many", "much", "few", "several", "one", "two", "three",
    "first", "second", "third", "next", "then", "also", "only", "just", "even",
    "still", "already", "always", "never", "often", "sometimes", "here",
    "there", "now", "today", "customers", "customer", "people", "shoppers",
    "trust", "trusted", "clear", "clarity", "build", "builds", "building",
    "built", "make", "makes", "made", "show", "shows", "shown", "give",
    "gives", "given", "help", "helps", "helping", "support", "supports",
    "supported", "answer", "answers", "answered", "own", "owns", "owned",
    "adapt", "adapts", "adapted", "compare", "compares", "choose", "chooses",
    "start", "starts", "turn", "turns", "become", "becomes", "recurring",
    "consistent", "monthly", "weekly", "daily", "content", "contents",
    "evidence", "website", "site", "sites", "page", "pages", "post", "posts",
    "posting", "platform", "platforms", "channel", "channels", "offer",
    "offers", "offering", "offerings", "product", "products", "service",
    "services", "tool", "tools", "plan", "plans", "idea", "ideas", "topic",
    "topics", "question", "questions", "decision", "decisions", "options",
    "option", "price", "prices", "pricing", "market", "brand", "business",
    "audience", "strategy", "system", "story", "focus", "value", "values",
    "guidance", "recognition", "confidence", "confident", "independence",
    "transparency", "credible", "readable", "specific", "grounded", "based",
  ].map((w) => w.toLowerCase())
);

/**
 * Capitalized tokens in the output that never appear in the grounded source —
 * the signal that a model invented a brand, product, or platform.
 *
 * Phrase-initial words are skipped. "Supports specific supplement types" opens a
 * title with an ordinary verb, which is not a claim about a new entity, and
 * flagging it rejected otherwise-valid rows.
 */
function novelProperNouns(
  candidate: string,
  sourceBlob: string,
  allowed: string[]
): string[] {
  const source = sourceBlob.toLowerCase();
  const allowSet = new Set(allowed.map((a) => a.toLowerCase()));
  const flagged: string[] = [];

  // Dashes are separators here even when unspaced ("signals—independence").
  const words = candidate.replace(/[—–]/g, " — ").split(/\s+/).filter(Boolean);
  let phraseInitial = true;

  for (const raw of words) {
    if (raw === "—") {
      phraseInitial = true;
      continue;
    }
    const token = raw.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z]+$/, "");
    const isEntityShaped = /^[A-Z][A-Za-z]{2,}$/.test(token);

    const lower = token.toLowerCase();
    if (
      isEntityShaped &&
      !phraseInitial &&
      !COMMON_WORDS.has(lower) &&
      !source.includes(lower) &&
      !allowSet.has(lower)
    ) {
      flagged.push(token);
    }
    phraseInitial = CLAUSE_END_RE.test(raw);
  }

  return [...new Set(flagged)];
}

function validateRow(
  row: RowContext,
  next: { title: string; summary: string },
  businessName: string
): string | null {
  const grounded = [
    row.detail,
    row.summary,
    row.title,
    businessName,
    ...row.supportingPoints,
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

/** Deterministic rows the model is asked to improve, in card order. */
function collectRows(profile: SocialDiscoveryProfile): RowContext[] {
  const rows: RowContext[] = [];

  profile.sections.forEach((section, sectionIndex) => {
    const usedTitles = new Set<string>();
    section.bullets.slice(0, MAX_CARD_ROWS).forEach((bullet, bulletIndex) => {
      const derived = deterministicRowCopy(bullet, bulletIndex, usedTitles);
      usedTitles.add(derived.title);
      rows.push({
        id: `${section.id}-${bulletIndex}`,
        sectionIndex,
        bulletIndex,
        title: derived.title,
        summary: derived.summary,
        detail: derived.detail,
        supportingPoints: bullet.evidence
          .map((e) => (e.excerpt ?? "").trim())
          .filter(Boolean),
        classification: bullet.classification,
      });
    });
  });

  return rows;
}

function applyDisplayCopy(
  profile: SocialDiscoveryProfile,
  accepted: Map<string, { title: string; summary: string }>
): SocialDiscoveryProfile {
  if (accepted.size === 0) return profile;
  return {
    ...profile,
    sections: profile.sections.map((section) => ({
      ...section,
      bullets: section.bullets.map((bullet, bulletIndex) => {
        const display = accepted.get(`${section.id}-${bulletIndex}`);
        return display ? { ...bullet, display } : bullet;
      }),
    })) as SocialDiscoveryProfile["sections"],
  };
}

/**
 * Polish is on whenever an OpenAI key is present, matching how brand profile and
 * strategy already behave. Set DISCOVERY_COPY_POLISH_PROVIDER=deterministic-only
 * to force the deterministic path.
 */
/** Exposed for validator unit tests only. */
export const __testables = { novelProperNouns };

export function isCopyPolishEnabled(): boolean {
  const provider = process.env.DISCOVERY_COPY_POLISH_PROVIDER?.trim().toLowerCase();
  if (provider === "deterministic-only" || provider === "off") return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function polishDiscoveryDisplayCopy(
  profile: SocialDiscoveryProfile
): Promise<PolishResult> {
  const model = resolveModel("discoveryCopyPolish");
  const rows = collectRows(profile);

  const disabled = (error?: string): PolishResult => ({
    profile,
    report: {
      enabled: false,
      model,
      candidateCount: rows.length,
      polishedCount: 0,
      rejections: [],
      ...(error ? { error } : {}),
    },
  });

  if (!isCopyPolishEnabled()) return disabled();
  if (rows.length === 0) return disabled("no rows to polish");

  const payload = {
    businessName: profile.businessName,
    rows: rows.map((r) => ({
      id: r.id,
      currentTitle: r.title,
      currentSummary: r.summary,
      detail: r.detail,
      supportingPoints: r.supportingPoints,
      classification: r.classification,
    })),
  };

  let parsed: unknown;
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      timeout: REQUEST_TIMEOUT_MS,
    });
    // nano / reasoning models reject a custom temperature — omit for default.
    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: tokenBudget("discoveryCopyPolish"),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    if (!raw.trim()) return disabled("empty model content");
    parsed = JSON.parse(raw);
  } catch (err) {
    return disabled(err instanceof Error ? err.message : String(err));
  }

  const result = polishOutputSchema.safeParse(parsed);
  if (!result.success) {
    return disabled(
      `schema mismatch: ${result.error.issues[0]?.message ?? "unknown"}`
    );
  }

  const byId = new Map(result.data.rows.map((r) => [r.id, r]));
  const rejections: PolishRejection[] = [];
  const accepted = new Map<string, { title: string; summary: string }>();
  const seenTitles = new Set<string>();

  for (const row of rows) {
    const next = byId.get(row.id);
    if (!next) {
      rejections.push({ id: row.id, reason: "missing_from_output", attempted: "" });
      continue;
    }
    const failure = validateRow(row, next, profile.businessName);
    if (failure) {
      rejections.push({
        id: row.id,
        reason: failure,
        attempted: `${next.title} — ${next.summary}`,
      });
      continue;
    }
    const titleKey = next.title.trim().toLowerCase();
    if (seenTitles.has(titleKey)) {
      rejections.push({
        id: row.id,
        reason: "duplicate_title",
        attempted: next.title,
      });
      continue;
    }
    seenTitles.add(titleKey);
    accepted.set(row.id, {
      title: next.title.trim(),
      summary: next.summary.trim(),
    });
  }

  return {
    profile: applyDisplayCopy(profile, accepted),
    report: {
      enabled: true,
      model,
      candidateCount: rows.length,
      polishedCount: accepted.size,
      rejections,
    },
  };
}
