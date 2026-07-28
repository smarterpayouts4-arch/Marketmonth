import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { CrawlCorpus, CrawledPage } from "./types";

export type PageSnapshotRecord = {
  pageId: string;
  url: string;
  finalUrl: string;
  kind: string;
  contentHash: string;
  cleanedText: string;
  title: string;
  collectionMethod: string;
  retrievedAt: string;
};

export type DiscoveryPagesManifest = {
  companyId: string;
  retrievedAt: string;
  pageCount: number;
  discoveryConfig: {
    maxSuccessfulPages: number;
    maxFetchAttempts: number;
    maxCatalogPages: number;
  };
  modelName: string | null;
  extractorNote: string;
  pages: Array<{
    pageId: string;
    url: string;
    contentHash: string;
    kind: string;
  }>;
};

function companySlug(companyId: string): string {
  return companyId
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9._-]+/g, "_");
}

function cleanedTextFromPage(page: CrawledPage): string {
  // Prefer visible text fields if present on extended pages; else strip tags lightly
  const anyPage = page as CrawledPage & { text?: string; visibleText?: string };
  const raw =
    anyPage.visibleText?.trim() ||
    anyPage.text?.trim() ||
    page.html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return raw.slice(0, 120_000);
}

export function hashPageContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function buildPageSnapshot(
  page: CrawledPage,
  retrievedAt: string
): PageSnapshotRecord {
  const cleanedText = cleanedTextFromPage(page);
  const contentHash = hashPageContent(cleanedText);
  const pageId = `page_${contentHash.slice(0, 12)}`;
  return {
    pageId,
    url: page.url,
    finalUrl: page.url,
    kind: page.kind,
    contentHash,
    cleanedText,
    title: page.title ?? "",
    collectionMethod: page.collectionMethod ?? "fetch",
    retrievedAt,
  };
}

/**
 * Persist Layer-1 cleaned page snapshots + manifest under data/runtime.
 * Returns the directory written.
 */
export function persistCrawlPageSnapshots(input: {
  companyId: string;
  corpus: CrawlCorpus;
  retrievedAt?: string;
  modelName?: string | null;
  rootDir?: string;
}): { dir: string; manifest: DiscoveryPagesManifest } {
  const retrievedAt = input.retrievedAt ?? new Date().toISOString();
  const root =
    input.rootDir ??
    path.join(process.cwd(), "data", "runtime", "discovery-pages");
  const dir = path.join(root, companySlug(input.companyId));
  mkdirSync(dir, { recursive: true });

  const pages: DiscoveryPagesManifest["pages"] = [];
  for (const page of input.corpus.pages) {
    const snap = buildPageSnapshot(page, retrievedAt);
    writeFileSync(
      path.join(dir, `${snap.pageId}.json`),
      JSON.stringify(snap, null, 2),
      "utf8"
    );
    pages.push({
      pageId: snap.pageId,
      url: snap.url,
      contentHash: snap.contentHash,
      kind: snap.kind,
    });
  }

  const manifest: DiscoveryPagesManifest = {
    companyId: companySlug(input.companyId),
    retrievedAt,
    pageCount: pages.length,
    discoveryConfig: {
      maxSuccessfulPages: 10,
      maxFetchAttempts: 24,
      maxCatalogPages: 3,
    },
    modelName: input.modelName ?? process.env.OPENAI_DISCOVERY_MODEL ?? null,
    extractorNote:
      "deterministic extractors + optional llm-profile; see src/engine/discovery",
    pages,
  };
  writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
  return { dir, manifest };
}
