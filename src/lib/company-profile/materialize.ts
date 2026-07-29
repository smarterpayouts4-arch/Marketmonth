import type { BrandProfile } from "@/engine/discovery/brand-profile";
import type { OfferHint } from "@/engine/discovery/extract-offers";
import type { BrandSignals, FaqEntry } from "@/engine/discovery/types";
import type { CrawlMeta } from "@/lib/discovery/evidence.schema";
import type { GroundedOnlineMarketingStrategy } from "@/lib/discovery/strategy.schema";
import { recordProvenance } from "@/lib/provenance";

import { writeArtifact, type ArtifactState } from "./artifact-store";
import { buildDiscoveryCsvDocument } from "./csv-contract";

export type MaterializeCompanyProfileInput = {
  companyId: string;
  state: ArtifactState;
  profile: BrandProfile;
  evidence?: Parameters<typeof buildDiscoveryCsvDocument>[0]["evidence"];
  crawlMeta?: CrawlMeta | Record<string, unknown> | null;
  strategyPreview?: GroundedOnlineMarketingStrategy | null;
  signals?: BrandSignals | null;
  faqs?: FaqEntry[];
  offers?: OfferHint[];
  sourceUrl: string;
  retrievedAt?: string;
  notes?: string;
};

/**
 * Sole writer for company profile artifacts.
 *
 * Analyze materializes `draft`; the publish gate materializes `approved`.
 * Nothing else should serialize a company CSV, so that both branches can
 * only ever read something this function produced.
 */
export function materializeCompanyProfile(
  input: MaterializeCompanyProfileInput
): { csv: string; artifactHash: string; path: string } {
  const csv = buildDiscoveryCsvDocument({
    profile: input.profile,
    evidence: input.evidence,
    crawlMeta: input.crawlMeta,
    strategyPreview: input.strategyPreview,
    signals: input.signals,
    faqs: input.faqs,
    offers: input.offers,
    sourceUrl: input.sourceUrl,
    retrievedAt: input.retrievedAt,
    notes: input.notes,
  });

  const { path: filePath, artifactHash, wroteDisk } = writeArtifact(
    input.companyId,
    input.state,
    csv
  );

  recordProvenance({
    branch: input.state === "approved" ? "publish" : "write",
    step: `materialize:${input.state}`,
    companyId: input.companyId,
    source: "crawl",
    artifactHash,
    detail: {
      path: filePath,
      wroteDisk,
      bytes: csv.length,
      evidenceRows: input.evidence?.length ?? 0,
      faqRows: input.faqs?.length ?? input.signals?.faqs?.length ?? 0,
      offerRows: input.offers?.length ?? 0,
      hasSignals: Boolean(input.signals),
    },
  });

  return { csv, artifactHash, path: filePath };
}
