import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { CrawlCorpus, CrawledPage, PageKind } from "../types";

export type FrozenPage = {
  pageId: string;
  url: string;
  kind: string;
  contentHash: string;
  cleanedText: string;
  title: string;
};

export type FrozenCorpusBundle = {
  dir: string;
  manifest: {
    companyId: string;
    retrievedAt: string;
    pageCount: number;
    modelName: string | null;
    discoveryConfig?: Record<string, unknown>;
    pages: Array<{
      pageId: string;
      url: string;
      contentHash: string;
      kind: string;
    }>;
  };
  pages: FrozenPage[];
  diagnostics: string[];
};

function asPageKind(kind: string): PageKind {
  const allowed: PageKind[] = [
    "home",
    "products",
    "how_it_works",
    "about",
    "faq",
    "testimonials",
    "blog",
    "contact",
    "other",
  ];
  return (allowed.includes(kind as PageKind) ? kind : "other") as PageKind;
}

/** Load Layer-1 snapshots; missing dir/files → diagnostics (no throw). */
export function loadFrozenCorpus(
  dir: string
): FrozenCorpusBundle | { diagnostics: string[] } {
  const diagnostics: string[] = [];
  if (!existsSync(dir)) {
    return {
      diagnostics: [`Frozen corpus directory missing: ${dir}`],
    };
  }

  const manifestPath = path.join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return {
      diagnostics: [`Frozen corpus manifest missing: ${manifestPath}`],
    };
  }

  let manifest: FrozenCorpusBundle["manifest"];
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as FrozenCorpusBundle["manifest"];
  } catch (err) {
    return {
      diagnostics: [
        `Failed to parse manifest: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  const pages: FrozenPage[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.startsWith("page_") || !name.endsWith(".json")) continue;
    const full = path.join(dir, name);
    try {
      const raw = JSON.parse(readFileSync(full, "utf8")) as Partial<FrozenPage>;
      if (!raw.url || !raw.cleanedText || !raw.contentHash || !raw.pageId) {
        diagnostics.push(`Snapshot incomplete: ${name}`);
        continue;
      }
      pages.push({
        pageId: raw.pageId,
        url: raw.url,
        kind: raw.kind || "other",
        contentHash: raw.contentHash,
        cleanedText: raw.cleanedText,
        title: raw.title || "",
      });
    } catch (err) {
      diagnostics.push(
        `Snapshot unreadable ${name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (pages.length === 0) {
    diagnostics.push("No usable page_*.json snapshots found");
  }

  return { dir, manifest, pages, diagnostics };
}

/** Rebuild a CrawlCorpus from cleanedText wrappers for catalog mining. */
export function corpusFromFrozenPages(pages: FrozenPage[]): CrawlCorpus {
  const origin = "https://zynava.com";
  const crawled: CrawledPage[] = pages.map((p) => ({
    url: p.url,
    status: 200,
    // Emit heading chips so cheerio catalog miners can see ingredient nouns
    // that live only in cleanedText (snapshots do not retain raw HTML).
    html: syntheticHtmlFromCleanedText(p),
    title: p.title,
    kind: asPageKind(p.kind),
    text: p.cleanedText,
    collectionMethod: "fetch" as const,
  }));
  return {
    normalizedUrl: origin,
    origin,
    pages: crawled,
  };
}

function faqDetailsFromCleanedText(cleanedText: string): string {
  // Glued FAQ pages: "What is ZYNAVA?Zynava is a free…Does ZYNAVA sell…No."
  // Allow zero whitespace after `?` before the answer.
  const re =
    /((?:What|Why|How|When|Where|Who|Do|Does|Is|Are|Can)\b[^?]{2,140}\?)([\s\S]*?)(?=(?:What|Why|How|When|Where|Who|Do|Does|Is|Are|Can)\b[^?]{2,140}\?|$)/gi;
  const chunks: string[] = [];
  for (const m of cleanedText.matchAll(re)) {
    const q = m[1]?.replace(/\s+/g, " ").trim();
    let a = m[2]?.replace(/\s+/g, " ").trim() ?? "";
    if (!q || !q.endsWith("?") || a.length < 8) continue;
    // Reject Q that embeds another question
    if (
      /(?:What|Why|How|When|Where|Who|Do|Does|Is|Are|Can)\b/i.test(
        q.slice(0, -1)
      ) &&
      (q.match(/\?/g) ?? []).length > 1
    ) {
      continue;
    }
    // Truncate answer before a glued next question if splitter missed
    const nextQ = a.search(
      /(?:What|Why|How|When|Where|Who|Do|Does|Is|Are|Can)\b[^?]{2,140}\?/i
    );
    if (nextQ > 12) a = a.slice(0, nextQ).trim();
    if (a.length < 8) continue;
    chunks.push(
      `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a.slice(0, 400))}</p></details>`
    );
    if (chunks.length >= 12) break;
  }
  return chunks.join("");
}

function syntheticHtmlFromCleanedText(page: FrozenPage): string {
  const title = escapeHtml(page.title || page.url);
  const chipRe =
    /\b(Magnesium glycinate|Vitamin D3|Vitamin C|Vitamin D|Vitamin B12|Omega-?3|Ashwagandha|Probiotics|Creatine|Collagen|Magnesium|Zinc|Calcium|Iron)\b/gi;
  const chips = new Set<string>();
  for (const m of page.cleanedText.match(chipRe) ?? []) {
    chips.add(m);
  }
  const chipHtml = [...chips]
    .map((c) => `<h3>${escapeHtml(c)}</h3>`)
    .join("");
  const isFaq = page.kind === "faq" || /\/faq/i.test(page.url);
  const faqHtml = isFaq ? faqDetailsFromCleanedText(page.cleanedText) : "";
  // Prefer structured FAQ details; avoid dumping glued cleanedText when split succeeded
  const bodyHtml =
    isFaq && faqHtml
      ? faqHtml
      : `<p>${escapeHtml(page.cleanedText.slice(0, 8000))}</p>`;
  return `<!doctype html><html><head><title>${title}</title></head><body><main>${faqHtml && !isFaq ? faqHtml : ""}${chipHtml}${bodyHtml}</main></body></html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function findPassagesForTerm(
  pages: FrozenPage[],
  term: string,
  radius = 160
): Array<{ pageId: string; url: string; excerpt: string }> {
  const needle = term.toLowerCase();
  const out: Array<{ pageId: string; url: string; excerpt: string }> = [];
  for (const page of pages) {
    const lower = page.cleanedText.toLowerCase();
    const idx = lower.indexOf(needle);
    if (idx < 0) continue;
    const start = Math.max(0, idx - radius);
    const end = Math.min(page.cleanedText.length, idx + term.length + radius);
    const excerpt = page.cleanedText
      .slice(start, end)
      .replace(/\s+/g, " ")
      .trim();
    out.push({
      pageId: page.pageId,
      url: page.url,
      excerpt: `${start > 0 ? "…" : ""}${excerpt}${end < page.cleanedText.length ? "…" : ""}`,
    });
  }
  return out;
}
