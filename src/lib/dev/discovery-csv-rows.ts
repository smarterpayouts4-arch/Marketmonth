/**
 * Pure builders for company discovery CSV rows (fixture export + tests).
 * Keeps scripts thin — one column contract for brand + evidence + locations.
 */
import type { BrandProfile } from "@/engine/discovery/brand-profile";
import type {
  CrawlMeta,
  DiscoveryEvidence,
} from "@/lib/discovery/evidence.schema";
import type { GroundedOnlineMarketingStrategy } from "@/lib/discovery/strategy.schema";

/** Bump when column contract or lineage semantics change. */
export const DISCOVERY_CSV_SCHEMA_VERSION = "1";

export const DISCOVERY_CSV_HEADERS = [
  "record_type",
  "field",
  "value",
  "source_url",
  "evidence_type",
  "confidence",
  "source_snippet",
  "notes",
  "retrieved_at",
] as const;

export type DiscoveryCsvRow = {
  record_type: string;
  field: string;
  value: string;
  source_url: string;
  evidence_type: string;
  confidence: string;
  source_snippet: string;
  notes: string;
  retrieved_at: string;
};

function clip(value: string, max = 220): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

export function buildBrandProfileCsvRows(input: {
  profile: BrandProfile;
  sourceUrl: string;
  retrievedAt: string;
  notes?: string;
}): DiscoveryCsvRow[] {
  const notes = input.notes ?? "Exported from discovery analysis";
  const { profile, sourceUrl, retrievedAt } = input;

  const fields: [string, string, string, string][] = [
    ["schemaVersion", DISCOVERY_CSV_SCHEMA_VERSION, "observed", "high"],
    ["businessName", profile.businessName, "observed", "high"],
    ["website", profile.website, "observed", "high"],
    ["description", profile.description, "inferred", "medium"],
    ["audience", profile.audience, "inferred", "medium"],
    ["products", JSON.stringify(profile.products), "inferred", "medium"],
    ["services", JSON.stringify(profile.services), "inferred", "medium"],
    [
      "catalogProducts",
      JSON.stringify(profile.catalogProducts ?? []),
      "observed",
      "high",
    ],
    ["valueProposition", profile.valueProposition, "inferred", "medium"],
    ["brandVoice", profile.brandVoice, "inferred", "medium"],
    [
      "marketingOpportunity",
      profile.marketingOpportunity,
      "recommended",
      "medium",
    ],
    ["colors", JSON.stringify(profile.colors), "inferred", "low"],
    [
      "socialProfiles",
      JSON.stringify(profile.socialProfiles),
      "observed",
      "high",
    ],
    [
      "competitors",
      JSON.stringify(profile.competitors),
      "inferred",
      "low",
    ],
    [
      "seo.metadataCompleteness",
      profile.seoSummary.metadataCompleteness,
      "inferred",
      "medium",
    ],
    [
      "seo.pageSpeedNote",
      profile.seoSummary.pageSpeedNote,
      "inferred",
      "low",
    ],
    [
      "seo.technicalObservations",
      JSON.stringify(profile.seoSummary.technicalObservations),
      "inferred",
      "low",
    ],
    [
      "seo.contentOpportunities",
      JSON.stringify(profile.seoSummary.contentOpportunities),
      "recommended",
      "medium",
    ],
  ];

  return fields.map(([field, value, evidence_type, confidence]) => ({
    record_type: "brand_profile",
    field,
    value,
    source_url: sourceUrl,
    evidence_type,
    confidence,
    source_snippet: "",
    notes,
    retrieved_at: retrievedAt,
  }));
}

export function buildEvidenceCsvRows(input: {
  evidence: DiscoveryEvidence[];
  fallbackSourceUrl: string;
  retrievedAt: string;
  notes?: string;
}): DiscoveryCsvRow[] {
  const notes = input.notes ?? "Website evidence from discovery crawl";
  return input.evidence.map((ev) => ({
    record_type: "evidence",
    field: ev.field,
    value: ev.value,
    source_url: ev.sourceUrl || input.fallbackSourceUrl,
    evidence_type: ev.kind,
    confidence: ev.confidence,
    source_snippet: clip(ev.value, 180),
    notes,
    retrieved_at: input.retrievedAt,
  }));
}

export function buildLocationCsvRows(input: {
  crawlMeta?: CrawlMeta | Record<string, unknown> | null;
  fallbackSourceUrl: string;
  retrievedAt: string;
  notes?: string;
}): DiscoveryCsvRow[] {
  const notes = input.notes ?? "Detected location from website";
  const meta = input.crawlMeta as CrawlMeta | null | undefined;
  const locs = meta?.detectedLocations ?? [];
  return locs.map((loc) => {
    const parts = [
      loc.formattedAddress,
      [loc.city, loc.region, loc.country].filter(Boolean).join(", "),
    ].filter(Boolean);
    const value = parts[0] || parts[1] || "unknown";
    return {
      record_type: "location",
      field: "detectedLocation",
      value,
      source_url: loc.sourceUrl || input.fallbackSourceUrl,
      evidence_type: "observed",
      confidence: loc.confidence,
      source_snippet: value,
      notes,
      retrieved_at: input.retrievedAt,
    };
  });
}

export function buildStrategyCsvRow(input: {
  preview: GroundedOnlineMarketingStrategy;
  sourceUrl: string;
  retrievedAt: string;
  notes?: string;
}): DiscoveryCsvRow {
  return {
    record_type: "strategy_preview",
    field: "json",
    value: JSON.stringify(input.preview),
    source_url: input.sourceUrl,
    evidence_type: "inferred",
    confidence: "medium",
    source_snippet: "",
    notes: input.notes ?? "Strategy preview from discovery",
    retrieved_at: input.retrievedAt,
  };
}

export function serializeDiscoveryCsv(rows: DiscoveryCsvRow[]): string {
  const q = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [DISCOVERY_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.record_type,
        row.field,
        row.value,
        row.source_url,
        row.evidence_type,
        row.confidence,
        row.source_snippet,
        row.notes,
        row.retrieved_at,
      ]
        .map(q)
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Full company CSV from a persisted (or in-memory) discovery analysis. */
export function buildDiscoveryCsvDocument(input: {
  profile: BrandProfile;
  evidence?: DiscoveryEvidence[];
  crawlMeta?: CrawlMeta | Record<string, unknown> | null;
  strategyPreview?: GroundedOnlineMarketingStrategy | null;
  sourceUrl: string;
  retrievedAt?: string;
  notes?: string;
}): string {
  const retrievedAt = input.retrievedAt ?? new Date().toISOString();
  const notes = input.notes;
  const rows: DiscoveryCsvRow[] = [
    ...buildBrandProfileCsvRows({
      profile: input.profile,
      sourceUrl: input.sourceUrl,
      retrievedAt,
      notes,
    }),
    ...buildEvidenceCsvRows({
      evidence: input.evidence ?? [],
      fallbackSourceUrl: input.sourceUrl,
      retrievedAt,
      notes,
    }),
    ...buildLocationCsvRows({
      crawlMeta: input.crawlMeta,
      fallbackSourceUrl: input.sourceUrl,
      retrievedAt,
      notes,
    }),
  ];
  if (input.strategyPreview) {
    rows.push(
      buildStrategyCsvRow({
        preview: input.strategyPreview,
        sourceUrl: input.sourceUrl,
        retrievedAt,
        notes,
      })
    );
  }
  return serializeDiscoveryCsv(rows);
}
