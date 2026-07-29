/**
 * Derives the Discovery card's compact evidence rows from section bullets.
 *
 * Lives in `lib` so both the Discovery UI and the engine's display-copy polish
 * step use one implementation — the polish step needs the deterministic copy as
 * its starting point, and Discovery UI may not import from `src/engine/`.
 *
 * Formats grounded data only; never invents strategic facts.
 */
import type {
  DiscoveryClassification,
  SocialDiscoveryProfile,
} from "./discovery-narrative.schema";
import {
  endAtReadableBoundary,
  readableUrlLabel,
  stripLeadingHeadingRun,
} from "./text-display";

type Bullet = SocialDiscoveryProfile["sections"][number]["bullets"][number];
type Section = SocialDiscoveryProfile["sections"][number];

/** One compact accordion row on the Discovery card. */
export type CardRowCopy = {
  id: string;
  title: string;
  summary: string;
  /** Omitted when it would only repeat the summary. */
  detail?: string;
  supportingPoints: string[];
  sourceLabel: string;
  sourceUrl?: string;
  tag?: string;
  kind: DiscoveryClassification;
};

export const MAX_CARD_ROWS = 3;
const MAX_SUMMARY_WORDS = 28;
const MAX_SUPPORTING = 2;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function firstCompleteSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const m = t.match(/^(.+?[.!?])(?:\s|$)/);
  if (m?.[1] && wordCount(m[1]) >= 4) return m[1].trim();
  return t;
}

/** Prefer a complete sentence; never mid-word clip with ellipsis. */
export function conciseSummary(text: string, maxWords = MAX_SUMMARY_WORDS): string {
  const sentence = firstCompleteSentence(text);
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return sentence;
  // Take as many full words as fit without fabricating an ellipsis cut.
  const cut = words.slice(0, maxWords).join(" ");
  if (/[.!?]$/.test(cut)) return cut;
  // Fall back to a shorter complete sentence if the long one won't fit.
  const shorter = firstCompleteSentence(text);
  if (wordCount(shorter) <= maxWords) return shorter;
  return endAtReadableBoundary(
    words.slice(0, Math.min(18, words.length)).join(" ")
  );
}

export function sourceLabelFromUrl(sourceUrl?: string): string {
  if (!sourceUrl?.trim()) return "Website";
  try {
    const u = new URL(sourceUrl);
    const path = u.pathname.toLowerCase();
    if (!path || path === "/") return "Home page";
    if (path.includes("/faq")) return "FAQ";
    if (path.includes("/about")) return "About page";
    if (
      path.includes("/catalog") ||
      path.includes("/supplement") ||
      path.includes("/product")
    ) {
      return "Product catalog";
    }
    if (path.includes("/service")) return "Services page";
    if (path.includes("/blog") || path.includes("/article")) return "Blog";
    const host = u.hostname.replace(/^www\./, "");
    return host ? `${host} page` : "Website page";
  } catch {
    return "Website";
  }
}

/**
 * Patterns are word-anchored: an unanchored /form/ matched "formats" and
 * mislabelled a publishing bullet as product matching.
 */
const TITLE_RULES: Array<{
  re: RegExp;
  title: (kind: DiscoveryClassification) => string;
}> = [
  {
    re: /\blinks? (?:was|were)\b|\bfacebook\b|\blinkedin\b|\byoutube\b|\binstagram\b|\btiktok\b|\bsocial (?:channels?|links?|footprint)\b/i,
    title: (kind) =>
      kind === "recommended"
        ? "Channel expansion options"
        : "Detected social channels",
  },
  {
    re: /\bpillars?\b|\bpublishing\b|\bcadence\b|\brhythm\b|\bmonthly idea\b|\bconnected content\b/i,
    title: () => "A connected publishing system",
  },
  {
    re: /\bpositioned to own\b|\brecognition\b|\bbecome known\b|\boverwhelm\w*\b/i,
    title: () => "A position worth owning",
  },
  {
    re: /\bclear offer\b|\bvalue proposition\b|\bpositioning\b/i,
    title: () => "Clear offer positioning",
  },
  {
    re: /\bingredients?\b|\bdietary\b|\bbudget\b|\bmatching\b|\bcatalog\b|\bproducts?\b|\bofferings?\b/i,
    title: () => "Preference and product matching",
  },
  {
    re: /\bcustomers? face\b|\bpressure\b|\buncertainty\b|\bquestions?\b/i,
    title: () => "Customer decision pressure",
  },
  {
    re: /\bplatform\b|\badapt\w*\b/i,
    title: () => "Adapted for each platform",
  },
  // Broadest bucket last so a more specific match always wins.
  {
    re: /\btrust\b|\btrusted\b|\bindependence\b|\btransparenc\w*\b|\bevidence-minded\b|\bcredible\b/i,
    title: () => "Evidence-minded guidance",
  },
];

const TITLE_FALLBACKS = ["Key strength", "Useful signal", "Strategic cue"];

function leadPhraseTitle(text: string): string | null {
  const lead = (text.includes(":") ? text.split(":")[0]! : text)
    .replace(/^[A-Z0-9][A-Z0-9\s&.-]{2,}\s+helps customers with\s+/i, "")
    .trim();
  const words = lead.split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length < 2) return null;
  const phrase = words.join(" ").replace(/[,;:]$/, "");
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** Titles must be unique within a section; reused buckets fall through. */
function titleFromBullet(
  text: string,
  kind: DiscoveryClassification,
  index: number,
  used: Set<string>
): string {
  const t = text.replace(/\s+/g, " ").trim();

  const matches = TITLE_RULES.filter((r) => r.re.test(t)).map((r) =>
    r.title(kind)
  );

  // The first match is the most specific. When it is already taken, the
  // bullet's own lead phrase describes it better than a weaker bucket would.
  if (matches[0] && !used.has(matches[0])) return matches[0];

  const lead = leadPhraseTitle(t);
  if (lead && !used.has(lead)) return lead;

  const remaining = matches.find((m) => !used.has(m));
  if (remaining) return remaining;

  const fallback = TITLE_FALLBACKS.find((f) => !used.has(f));
  return fallback ?? `${TITLE_FALLBACKS[0]} ${index + 1}`;
}

function optionalTag(
  kind: DiscoveryClassification,
  text: string
): string | undefined {
  if (/offer|value proposition|positioning/i.test(text)) return "Offer clarity";
  if (/product|ingredient|catalog|matching/i.test(text)) return "Product relevance";
  if (/trust|independence|transparenc/i.test(text)) return "Trust";
  if (kind === "recommended") return "Recommendation";
  if (kind === "inferred") return "Interpretation";
  return undefined;
}

function normalizeCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const FAQ_RE = /^Q:\s*([\s\S]+?)\s*(?:A:|Answer:)\s*([\s\S]+)$/i;

/**
 * FAQ evidence is stored as "Q: … A: …". The answer is the claim worth showing,
 * so a leading bare Yes/No is dropped to leave a standalone statement.
 */
function preferFaqAnswer(text: string): string {
  const match = text.match(FAQ_RE);
  const answer = match?.[2]?.trim();
  if (!answer) return text.replace(/^Q:\s*/i, "");
  const statement = answer.replace(/^(?:yes|no)[.,!]\s*/i, "").trim();
  return statement.length >= 12 ? statement : answer;
}

/** Supporting points restate the evidence; they must not echo the summary. */
function supportingPoints(bullet: Bullet, exclude: string[]): string[] {
  const taken = exclude.map(normalizeCompare).filter(Boolean);
  const out: string[] = [];

  const isRedundant = (key: string): boolean =>
    taken.some(
      (t) => t === key || (key.length > 20 && (t.includes(key) || key.includes(t)))
    );

  for (const ref of bullet.evidence) {
    const excerpt = (ref.excerpt ?? "").replace(/\s+/g, " ").trim();
    if (!excerpt || excerpt.length < 12) continue;
    const asLink = readableUrlLabel(excerpt);
    const point = asLink
      ? asLink
      : endAtReadableBoundary(
          conciseSummary(stripLeadingHeadingRun(preferFaqAnswer(excerpt)), 22)
        );
    const key = normalizeCompare(point);
    if (!key || isRedundant(key)) continue;
    taken.push(key);
    out.push(point);
    if (out.length >= MAX_SUPPORTING) break;
  }
  return out;
}

/**
 * The expanded panel repeats the summary verbatim when the bullet has no extra
 * context beyond it, which read as duplicated copy. Omit it in that case.
 */
function detailBeyondSummary(
  detail: string,
  summary: string
): string | undefined {
  const d = normalizeCompare(detail);
  const s = normalizeCompare(summary);
  if (!d || d === s) return undefined;
  const extraWords = wordCount(d) - wordCount(s);
  if (d.includes(s) && extraWords < 4) return undefined;
  return detail;
}

/** Deterministic title and summary for one bullet, ignoring any polish. */
export function deterministicRowCopy(
  bullet: Bullet,
  index: number,
  usedTitles: Set<string>
): { title: string; summary: string; detail: string } {
  const detail = bullet.text.replace(/\s+/g, " ").trim();
  const afterColon = detail.includes(":")
    ? detail.slice(detail.indexOf(":") + 1).trim()
    : detail;
  return {
    title: titleFromBullet(detail, bullet.classification, index, usedTitles),
    summary: conciseSummary(afterColon || detail),
    detail,
  };
}

/**
 * Builds the card rows for a section. A bullet's optional `display` copy is
 * preferred when present; otherwise the deterministic derivation is used, so an
 * absent or rejected polish always renders a valid card.
 */
export function toCardRows(section: Section): CardRowCopy[] {
  const bullets = section.bullets.slice(0, MAX_CARD_ROWS);
  const usedTitles = new Set<string>();
  // Reserve polished titles first so a deterministic title cannot collide.
  for (const bullet of bullets) {
    if (bullet.display) usedTitles.add(bullet.display.title);
  }

  return bullets.map((bullet, index) => {
    const derived = deterministicRowCopy(bullet, index, usedTitles);
    const title = bullet.display?.title ?? derived.title;
    const summary = bullet.display?.summary ?? derived.summary;
    usedTitles.add(title);

    const resolvedDetail = detailBeyondSummary(derived.detail, summary);
    const sourceUrl = bullet.evidence[0]?.sourceUrl;

    return {
      id: `${section.id}-${index}`,
      title,
      summary,
      detail: resolvedDetail,
      supportingPoints: supportingPoints(bullet, [
        summary,
        title,
        ...(resolvedDetail ? [resolvedDetail] : []),
      ]),
      sourceLabel: sourceLabelFromUrl(sourceUrl),
      sourceUrl,
      tag: optionalTag(bullet.classification, derived.detail),
      kind: bullet.classification,
    };
  });
}
