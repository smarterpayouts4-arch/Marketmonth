import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Keyword passage retrieve over Layer-1 page snapshots (pre-RAG).
 * Reads `data/runtime/discovery-pages/<companySlug>/*.json` written by refresh.
 */

export type BrandPassageHit = {
  pageId: string;
  passageId: string;
  url: string;
  contentHash: string;
  excerpt: string;
  score: number;
};

export type RetrieveBrandPassagesInput = {
  companyId: string;
  query: string;
  limit?: number;
  /** Override root; default data/runtime/discovery-pages */
  pagesRoot?: string;
};

type PageSnapshot = {
  pageId: string;
  url: string;
  contentHash: string;
  cleanedText: string;
  retrievedAt?: string;
  kind?: string;
};

function companySlug(companyId: string): string {
  return companyId
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9._-]+/g, "_");
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function loadSnapshots(dir: string): PageSnapshot[] {
  if (!existsSync(dir)) return [];
  const out: PageSnapshot[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json") || name === "manifest.json") continue;
    try {
      const raw = JSON.parse(
        readFileSync(path.join(dir, name), "utf8")
      ) as PageSnapshot;
      if (raw.url && raw.cleanedText && raw.contentHash) {
        out.push({
          pageId: raw.pageId || name.replace(/\.json$/, ""),
          url: raw.url,
          contentHash: raw.contentHash,
          cleanedText: raw.cleanedText,
          retrievedAt: raw.retrievedAt,
          kind: raw.kind,
        });
      }
    } catch {
      // skip malformed snapshot
    }
  }
  return out;
}

function excerptAround(text: string, token: string, radius = 180): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(token.toLowerCase());
  if (idx < 0) {
    return text.slice(0, radius * 2).trim();
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + token.length + radius);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

/**
 * Rank Layer-1 snapshots by simple keyword overlap. Returns empty if no corpus.
 */
export function retrieveBrandPassages(
  input: RetrieveBrandPassagesInput
): BrandPassageHit[] {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);
  const tokens = tokenize(input.query);
  if (tokens.length === 0) return [];

  const root =
    input.pagesRoot ??
    path.join(process.cwd(), "data", "runtime", "discovery-pages");
  const dir = path.join(root, companySlug(input.companyId));
  const pages = loadSnapshots(dir);
  if (pages.length === 0) return [];

  const hits: BrandPassageHit[] = [];
  for (const page of pages) {
    const lower = page.cleanedText.toLowerCase();
    let score = 0;
    let bestToken = tokens[0]!;
    for (const t of tokens) {
      if (!lower.includes(t)) continue;
      const occurrences = lower.split(t).length - 1;
      score += occurrences;
      if (t.length > bestToken.length) bestToken = t;
    }
    if (score <= 0) continue;
    const excerpt = excerptAround(page.cleanedText, bestToken);
    const passageId = `pas_${createHash("sha256")
      .update(`${page.contentHash}|${excerpt.slice(0, 80)}`)
      .digest("hex")
      .slice(0, 12)}`;
    hits.push({
      pageId: page.pageId,
      passageId,
      url: page.url,
      contentHash: page.contentHash,
      excerpt: excerpt.slice(0, 480),
      score,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
