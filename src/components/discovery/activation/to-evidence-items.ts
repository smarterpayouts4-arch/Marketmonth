/**
 * Presentation formatter: section bullets → compact accordion evidence rows.
 * Formats grounded data only — never invents strategic facts.
 */
import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";

import type {
  DiscoveryEvidenceItem,
  DiscoveryEvidenceKind,
} from "./types";

const MAX_ITEMS = 3;
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
  return words.slice(0, Math.min(18, words.length)).join(" ");
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

function titleFromBullet(
  text: string,
  kind: DiscoveryEvidenceKind,
  index: number
): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (/clear offer|value proposition|positioning/i.test(t)) {
    return "Clear offer positioning";
  }
  if (/trust|independence|transparenc|evidence-minded|credible/i.test(t)) {
    return "Evidence-minded guidance";
  }
  if (
    /ingredient|form|budget|matching|tools and offerings|catalog|product/i.test(
      t
    )
  ) {
    return "Preference and product matching";
  }
  if (/link.*(detected|not detected)|facebook|linkedin|youtube|instagram|social/i.test(t)) {
    return kind === "recommended"
      ? "Channel expansion options"
      : "Detected social channels";
  }
  if (/become known|positioned to own|recognition|overwhelm/i.test(t)) {
    return "A position worth owning";
  }
  if (/pillar|publish|cadence|rhythm|monthly idea|connected/i.test(t)) {
    return "A connected publishing system";
  }
  if (/customer|pressure|uncertainty|question/i.test(t)) {
    return "Customer decision pressure";
  }
  // Title-case a short lead phrase (before colon when present).
  const lead = (t.includes(":") ? t.split(":")[0]! : t)
    .replace(/^[A-Z0-9][A-Z0-9\s&.-]{2,}\s+helps customers with\s+/i, "")
    .trim();
  const words = lead.split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length >= 2) {
    const phrase = words.join(" ");
    return phrase.charAt(0).toUpperCase() + phrase.slice(1);
  }
  const fallbacks = ["Key strength", "Useful signal", "Strategic cue"];
  return fallbacks[index] ?? "Key strength";
}

function optionalTag(
  kind: DiscoveryEvidenceKind,
  text: string
): string | undefined {
  if (/offer|value proposition|positioning/i.test(text)) return "Offer clarity";
  if (/product|ingredient|catalog|matching/i.test(text)) return "Product relevance";
  if (/trust|independence|transparenc/i.test(text)) return "Trust";
  if (kind === "recommended") return "Recommendation";
  if (kind === "inferred") return "Interpretation";
  return undefined;
}

function supportingPoints(
  bullet: SocialDiscoveryProfile["sections"][number]["bullets"][number]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ref of bullet.evidence) {
    const excerpt = (ref.excerpt ?? "").replace(/\s+/g, " ").trim();
    if (!excerpt || excerpt.length < 12) continue;
    const key = excerpt.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(conciseSummary(excerpt, 22));
    if (out.length >= MAX_SUPPORTING) break;
  }
  return out;
}

export function toEvidenceItems(
  section: SocialDiscoveryProfile["sections"][number]
): DiscoveryEvidenceItem[] {
  return section.bullets.slice(0, MAX_ITEMS).map((bullet, index) => {
    const detail = bullet.text.replace(/\s+/g, " ").trim();
    const afterColon = detail.includes(":")
      ? detail.slice(detail.indexOf(":") + 1).trim()
      : detail;
    const summary = conciseSummary(afterColon || detail);
    const sourceUrl = bullet.evidence[0]?.sourceUrl;
    return {
      id: `${section.id}-${index}`,
      title: titleFromBullet(detail, bullet.classification, index),
      summary,
      detail,
      supportingPoints: supportingPoints(bullet),
      sourceLabel: sourceLabelFromUrl(sourceUrl),
      sourceUrl,
      tag: optionalTag(bullet.classification, detail),
      kind: bullet.classification,
    };
  });
}
