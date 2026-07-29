/**
 * CSV v2 contract — sole serializer/parser for company profile artifacts.
 * Columns unchanged; new record_types: signal, faq, offer, crawl_meta.
 */
import { createHash } from "node:crypto";

import { z } from "zod";

import type { BrandProfile } from "@/engine/discovery/brand-profile";
import type { OfferHint } from "@/engine/discovery/extract-offers";
import type { BrandSignals, FaqEntry } from "@/engine/discovery/types";
import type {
  CrawlMeta,
  DiscoveryEvidence,
} from "@/lib/discovery/evidence.schema";
import type { GroundedOnlineMarketingStrategy } from "@/lib/discovery/strategy.schema";
import { assertCsvRectangular, parseCsv } from "@/lib/dev/parse-csv";

import type {
  CompanyProfileProjection,
  ProjectionEvidence,
} from "./projection.schema";
import { companyProfileProjectionSchema } from "./projection.schema";

export const DISCOVERY_CSV_SCHEMA_VERSION = "2.0";

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

export type DiscoveryCsvContractIssue = {
  code: string;
  message: string;
};

function clip(value: string, max = 220): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function q(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function row(
  partial: Omit<DiscoveryCsvRow, "retrieved_at"> & { retrieved_at?: string },
  retrievedAt: string
): DiscoveryCsvRow {
  return { ...partial, retrieved_at: partial.retrieved_at ?? retrievedAt };
}

export function serializeDiscoveryCsv(rows: DiscoveryCsvRow[]): string {
  const lines = [DISCOVERY_CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.record_type,
        r.field,
        r.value,
        r.source_url,
        r.evidence_type,
        r.confidence,
        r.source_snippet,
        r.notes,
        r.retrieved_at,
      ]
        .map(q)
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export function artifactHashOfCsv(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function assertDiscoveryCsvHeader(
  headerCells: string[]
): DiscoveryCsvContractIssue[] {
  const normalized = headerCells.map((h) => h.trim().toLowerCase());
  const expected = [...DISCOVERY_CSV_HEADERS];
  if (normalized.length !== expected.length) {
    return [
      {
        code: "HEADER_WIDTH",
        message: `Expected ${expected.length} columns, got ${normalized.length}`,
      },
    ];
  }
  const issues: DiscoveryCsvContractIssue[] = [];
  for (let i = 0; i < expected.length; i++) {
    if (normalized[i] !== expected[i]) {
      issues.push({
        code: "HEADER_NAME",
        message: `Column ${i} expected "${expected[i]}", got "${normalized[i] ?? ""}"`,
      });
    }
  }
  return issues;
}

export function assertDiscoveryCsvSchemaVersion(
  rows: DiscoveryCsvRow[]
): DiscoveryCsvContractIssue[] {
  const versionRow = rows.find(
    (r) => r.record_type === "brand_profile" && r.field === "schemaVersion"
  );
  if (!versionRow) {
    return [
      {
        code: "SCHEMA_VERSION_MISSING",
        message: "brand_profile.schemaVersion row is required",
      },
    ];
  }
  if (versionRow.value !== DISCOVERY_CSV_SCHEMA_VERSION) {
    return [
      {
        code: "SCHEMA_VERSION_MISMATCH",
        message: `Expected schemaVersion ${DISCOVERY_CSV_SCHEMA_VERSION}, got ${versionRow.value} (v1 not accepted)`,
      },
    ];
  }
  return [];
}

export const discoveryCsvEvidenceTypeSchema = z.enum([
  "observed",
  "inferred",
  "recommended",
  "industry_research",
]);

export const discoveryCsvConfidenceSchema = z.enum(["high", "medium", "low"]);

export const discoveryCsvRowSchema = z.object({
  record_type: z.string().min(1),
  field: z.string().min(1),
  value: z.string(),
  source_url: z.string(),
  evidence_type: z.string().min(1),
  confidence: z.string().min(1),
  source_snippet: z.string(),
  notes: z.string(),
  retrieved_at: z.string().min(1),
});

/** Validate row shape (soft on evidence_type/confidence enums for forward compat). */
export function validateDiscoveryCsvRows(
  rows: DiscoveryCsvRow[]
): DiscoveryCsvContractIssue[] {
  const issues: DiscoveryCsvContractIssue[] = [];
  for (let i = 0; i < rows.length; i++) {
    const parsed = discoveryCsvRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      issues.push({
        code: "ROW_SHAPE",
        message: `Row ${i + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      });
    }
  }
  return issues;
}

function indexedProductNamesFromRows(rows: DiscoveryCsvRow[]): Set<string> {
  const names = new Set<string>();
  for (const r of rows) {
    if (
      r.record_type === "evidence" &&
      (r.field === "indexedProduct" || r.field === "catalogProduct")
    ) {
      const name = r.value.trim();
      if (name) names.add(name.toLowerCase());
    }
    if (r.record_type === "brand_profile" && r.field === "indexedProducts") {
      try {
        const parsed = JSON.parse(r.value) as Array<{ name?: string }>;
        for (const p of parsed) {
          const name = p.name?.trim();
          if (name) names.add(name.toLowerCase());
        }
      } catch {
        // malformed JSON handled elsewhere
      }
    }
  }
  return names;
}

/**
 * Published-artifact guard: offer rows must never duplicate catalog SKUs.
 * Unit tests on extract-offers catch generation-time leaks; this catches CSV drift.
 */
export function assertOfferRowsDisjointFromCatalog(
  rows: DiscoveryCsvRow[]
): DiscoveryCsvContractIssue[] {
  const catalog = indexedProductNamesFromRows(rows);
  const issues: DiscoveryCsvContractIssue[] = [];
  for (const r of rows) {
    if (r.record_type !== "offer") continue;
    const value = r.value.trim();
    if (!value) continue;
    if (catalog.has(value.toLowerCase())) {
      issues.push({
        code: "OFFER_EQUALS_CATALOG_PRODUCT",
        message: `Offer row "${value}" matches an indexed catalog product for this company`,
      });
    }
  }
  return issues;
}

export function assertDiscoveryCsvContract(input: {
  headerCells: string[];
  rows: DiscoveryCsvRow[];
}): DiscoveryCsvContractIssue[] {
  return [
    ...assertDiscoveryCsvHeader(input.headerCells),
    ...validateDiscoveryCsvRows(input.rows),
    ...assertDiscoveryCsvSchemaVersion(input.rows),
    ...assertOfferRowsDisjointFromCatalog(input.rows),
  ];
}

export function buildBrandProfileCsvRows(input: {
  profile: BrandProfile;
  sourceUrl: string;
  retrievedAt: string;
  notes?: string;
}): DiscoveryCsvRow[] {
  const notes = input.notes ?? "Exported from discovery analysis";
  const { profile, sourceUrl, retrievedAt } = input;
  const derived = new Set(profile.derivedFieldNames ?? []);
  const prov = (field: string, fallback: string) =>
    derived.has(field) ? "inferred" : fallback;

  const fields: [string, string, string, string][] = [
    ["schemaVersion", DISCOVERY_CSV_SCHEMA_VERSION, "observed", "high"],
    ["businessName", profile.businessName, "observed", "high"],
    ["website", profile.website, "observed", "high"],
    ["description", profile.description, prov("description", "inferred"), "medium"],
    ["audience", profile.audience, prov("audience", "inferred"), "medium"],
    ["products", JSON.stringify(profile.products), prov("products", "inferred"), "medium"],
    ["services", JSON.stringify(profile.services), prov("services", "inferred"), "medium"],
    [
      "indexedProducts",
      JSON.stringify(profile.indexedProducts ?? []),
      "observed",
      "high",
    ],
    [
      "valueProposition",
      profile.valueProposition,
      prov("valueProposition", "inferred"),
      "medium",
    ],
    ["brandVoice", profile.brandVoice, prov("brandVoice", "inferred"), "medium"],
    [
      "marketingOpportunity",
      profile.marketingOpportunity,
      prov("marketingOpportunity", "recommended"),
      "medium",
    ],
    ["colors", JSON.stringify(profile.colors), "inferred", "low"],
    ["socialProfiles", JSON.stringify(profile.socialProfiles), "observed", "high"],
    ["competitors", JSON.stringify(profile.competitors), "inferred", "low"],
    [
      "seo.metadataCompleteness",
      profile.seoSummary.metadataCompleteness,
      "inferred",
      "medium",
    ],
    ["seo.pageSpeedNote", profile.seoSummary.pageSpeedNote, "inferred", "low"],
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
    [
      "derivedFieldNames",
      JSON.stringify(profile.derivedFieldNames ?? []),
      "observed",
      "high",
    ],
  ];

  return fields.map(([field, value, evidence_type, confidence]) =>
    row(
      {
        record_type: "brand_profile",
        field,
        value,
        source_url: sourceUrl,
        evidence_type,
        confidence,
        source_snippet: "",
        notes,
      },
      retrievedAt
    )
  );
}

export function buildEvidenceCsvRows(input: {
  evidence: DiscoveryEvidence[];
  fallbackSourceUrl: string;
  retrievedAt: string;
  notes?: string;
}): DiscoveryCsvRow[] {
  const notes = input.notes ?? "Website evidence from discovery crawl";
  return input.evidence.map((ev) =>
    row(
      {
        record_type: "evidence",
        field: ev.field,
        value: ev.value,
        source_url: ev.sourceUrl || input.fallbackSourceUrl,
        evidence_type: ev.kind,
        confidence: ev.confidence,
        source_snippet: clip(ev.value, 180),
        notes: JSON.stringify({
          id: ev.id,
          sourcePageType: ev.sourcePageType ?? null,
          base: notes,
        }),
      },
      input.retrievedAt
    )
  );
}

export function buildSignalCsvRows(input: {
  signals: BrandSignals;
  sourceUrl: string;
  retrievedAt: string;
}): DiscoveryCsvRow[] {
  const { signals, sourceUrl, retrievedAt } = input;
  const out: DiscoveryCsvRow[] = [];
  const push = (field: string, value: string, url = sourceUrl) => {
    if (!value?.trim()) return;
    out.push(
      row(
        {
          record_type: "signal",
          field,
          value: value.trim(),
          source_url: url,
          evidence_type: "observed",
          confidence: "high",
          source_snippet: clip(value, 120),
          notes: "crawl signal",
        },
        retrievedAt
      )
    );
  };

  push("title", signals.title);
  push("meta_description", signals.metaDescription);
  push("about_text", signals.aboutText);
  push("product_text", signals.productText);
  push("body_sample", signals.bodySample);
  push("testimonial_text", signals.testimonialText);
  if (signals.logoUrl) push("logo_url", signals.logoUrl);
  for (const h of signals.headings) push("heading", h);
  for (const c of signals.ctaTexts) push("cta", c);
  for (const c of signals.colors) push("color", c);
  for (const e of signals.contactEmails) push("contact_email", e);
  for (const p of signals.contactPhones) push("contact_phone", p);
  for (const l of signals.locationHints) push("location_hint", l);
  if (signals.organization?.name) {
    push("organization_name", signals.organization.name, signals.organization.sourceUrl);
  }
  if (signals.organization?.sameAs?.length) {
    push(
      "organization_same_as",
      JSON.stringify(signals.organization.sameAs),
      signals.organization.sourceUrl
    );
  }
  return out;
}

export function buildFaqCsvRows(input: {
  faqs: FaqEntry[];
  fallbackSourceUrl: string;
  retrievedAt: string;
}): DiscoveryCsvRow[] {
  return input.faqs.map((faq) =>
    row(
      {
        record_type: "faq",
        field: "entry",
        value: JSON.stringify({
          question: faq.question,
          answer: faq.answer,
        }),
        source_url: faq.sourceUrl || input.fallbackSourceUrl,
        evidence_type: "observed",
        confidence: "high",
        source_snippet: clip(`Q: ${faq.question}`, 160),
        notes: "structured faq",
      },
      input.retrievedAt
    )
  );
}

export function buildOfferCsvRows(input: {
  offers: OfferHint[];
  fallbackSourceUrl: string;
  retrievedAt: string;
}): DiscoveryCsvRow[] {
  return input.offers.map((o) =>
    row(
      {
        record_type: "offer",
        field: "hint",
        value: o.label,
        source_url: o.sourceUrl || "",
        evidence_type: "observed",
        confidence: o.sourceUrl ? "high" : "low",
        source_snippet: clip(o.label, 120),
        notes: "precomputed offer hint",
      },
      input.retrievedAt
    )
  );
}

export function buildCrawlMetaCsvRows(input: {
  crawlMeta?: CrawlMeta | Record<string, unknown> | null;
  fallbackSourceUrl: string;
  retrievedAt: string;
}): DiscoveryCsvRow[] {
  const meta = input.crawlMeta as CrawlMeta | null | undefined;
  if (!meta) return [];
  const retrievedAt = input.retrievedAt;
  const out: DiscoveryCsvRow[] = [];
  const push = (field: string, value: string, url = input.fallbackSourceUrl) => {
    out.push(
      row(
        {
          record_type: "crawl_meta",
          field,
          value,
          source_url: url,
          evidence_type: "observed",
          confidence: "high",
          source_snippet: "",
          notes: "crawl telemetry",
        },
        retrievedAt
      )
    );
  };
  if (typeof meta.pageCount === "number") push("pageCount", String(meta.pageCount));
  if (typeof meta.fetchAttempts === "number") {
    push("fetchAttempts", String(meta.fetchAttempts));
  }
  for (const u of meta.failedUrls ?? []) push("failedUrl", u);
  for (const k of meta.kinds ?? []) push("pageKind", k);
  for (const m of meta.collectionMethods ?? []) push("collectionMethod", m);
  if (meta.acceptanceGate) {
    push("acceptanceGate", JSON.stringify(meta.acceptanceGate));
  }
  for (const loc of meta.detectedLocations ?? []) {
    const parts = [
      loc.formattedAddress,
      [loc.city, loc.region, loc.country].filter(Boolean).join(", "),
    ].filter(Boolean);
    push("detectedLocation", parts[0] || parts[1] || "unknown", loc.sourceUrl);
  }
  return out;
}

export function buildStrategyCsvRow(input: {
  preview: GroundedOnlineMarketingStrategy;
  sourceUrl: string;
  retrievedAt: string;
  notes?: string;
}): DiscoveryCsvRow {
  return row(
    {
      record_type: "strategy_preview",
      field: "json",
      value: JSON.stringify(input.preview),
      source_url: input.sourceUrl,
      evidence_type: "inferred",
      confidence: "medium",
      source_snippet: "",
      notes: input.notes ?? "Strategy preview from discovery",
    },
    input.retrievedAt
  );
}

/** Full company CSV v2 from analysis inputs. */
export function buildDiscoveryCsvDocument(input: {
  profile: BrandProfile;
  evidence?: DiscoveryEvidence[];
  crawlMeta?: CrawlMeta | Record<string, unknown> | null;
  strategyPreview?: GroundedOnlineMarketingStrategy | null;
  signals?: BrandSignals | null;
  faqs?: FaqEntry[];
  offers?: OfferHint[];
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
  ];
  if (input.signals) {
    rows.push(
      ...buildSignalCsvRows({
        signals: input.signals,
        sourceUrl: input.sourceUrl,
        retrievedAt,
      })
    );
  }
  const faqs = input.faqs ?? input.signals?.faqs ?? [];
  if (faqs.length) {
    rows.push(
      ...buildFaqCsvRows({
        faqs,
        fallbackSourceUrl: input.sourceUrl,
        retrievedAt,
      })
    );
  }
  if (input.offers?.length) {
    rows.push(
      ...buildOfferCsvRows({
        offers: input.offers,
        fallbackSourceUrl: input.sourceUrl,
        retrievedAt,
      })
    );
  }
  rows.push(
    ...buildCrawlMetaCsvRows({
      crawlMeta: input.crawlMeta,
      fallbackSourceUrl: input.sourceUrl,
      retrievedAt,
    })
  );
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

function parseJsonArray(raw?: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function parseNotesMeta(notes: string): { id?: string; sourcePageType?: string } {
  try {
    const parsed = JSON.parse(notes) as { id?: string; sourcePageType?: string | null };
    if (parsed && typeof parsed === "object") {
      return {
        id: typeof parsed.id === "string" ? parsed.id : undefined,
        sourcePageType:
          typeof parsed.sourcePageType === "string"
            ? parsed.sourcePageType
            : undefined,
      };
    }
  } catch {
    /* plain notes */
  }
  return {};
}

function toConfidence(raw: string, fallback: "high" | "medium" | "low") {
  const v = raw.trim().toLowerCase();
  return v === "high" || v === "medium" || v === "low" ? v : fallback;
}

/** Parse CSV v2 text into a typed projection. Fails closed on v1. */
export function parseCompanyCsv(text: string): CompanyProfileProjection {
  const grid = parseCsv(text);
  if (grid.length < 2) {
    throw new Error("Company CSV is empty");
  }
  assertCsvRectangular(grid);
  const header = grid[0].map((h) => h.trim().toLowerCase());
  const headerIssues = assertDiscoveryCsvHeader(header);
  if (headerIssues.length) {
    throw new Error(
      `Discovery CSV header contract failed: ${headerIssues.map((i) => i.message).join("; ")}`
    );
  }
  const idx = (name: string) => header.indexOf(name);
  const rows: DiscoveryCsvRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const line = grid[r];
    if (!line || line.every((c) => !c?.trim())) continue;
    rows.push({
      record_type: (line[idx("record_type")] ?? "").trim(),
      field: (line[idx("field")] ?? "").trim(),
      value: (line[idx("value")] ?? "").trim(),
      source_url: (line[idx("source_url")] ?? "").trim(),
      evidence_type: (line[idx("evidence_type")] ?? "").trim(),
      confidence: (line[idx("confidence")] ?? "").trim(),
      source_snippet: (line[idx("source_snippet")] ?? "").trim(),
      notes: (line[idx("notes")] ?? "").trim(),
      retrieved_at: (line[idx("retrieved_at")] ?? "").trim(),
    });
  }

  const versionIssues = assertDiscoveryCsvSchemaVersion(rows);
  if (versionIssues.length) {
    throw new Error(versionIssues.map((i) => i.message).join("; "));
  }

  const profile = new Map<string, { value: string; evidence_type: string; source_url: string }>();
  const headings: string[] = [];
  const ctaTexts: string[] = [];
  const colors: string[] = [];
  const contactEmails: string[] = [];
  const contactPhones: string[] = [];
  const locationHints: string[] = [];
  let title = "";
  let metaDescription = "";
  let aboutText = "";
  let productText = "";
  let bodySample = "";
  let testimonialText = "";
  let logoUrl: string | undefined;
  let orgName: string | undefined;
  let orgSameAs: string[] = [];
  let orgSourceUrl: string | undefined;
  const faqs: CompanyProfileProjection["faqs"] = [];
  const offers: CompanyProfileProjection["offers"] = [];
  const evidence: ProjectionEvidence[] = [];
  const failedUrls: string[] = [];
  const pageKinds: string[] = [];
  const collectionMethods: string[] = [];
  const detectedLocations: CompanyProfileProjection["crawlMeta"]["detectedLocations"] =
    [];
  let pageCount: number | undefined;
  let fetchAttempts: number | undefined;
  let acceptanceGate: string | undefined;

  for (const r of rows) {
    if (r.record_type === "brand_profile") {
      profile.set(r.field, {
        value: r.value,
        evidence_type: r.evidence_type,
        source_url: r.source_url,
      });
      continue;
    }
    if (r.record_type === "signal") {
      switch (r.field) {
        case "title":
          title = r.value;
          break;
        case "meta_description":
          metaDescription = r.value;
          break;
        case "about_text":
          aboutText = r.value;
          break;
        case "product_text":
          productText = r.value;
          break;
        case "body_sample":
          bodySample = r.value;
          break;
        case "testimonial_text":
          testimonialText = r.value;
          break;
        case "logo_url":
          logoUrl = r.value;
          break;
        case "heading":
          headings.push(r.value);
          break;
        case "cta":
          ctaTexts.push(r.value);
          break;
        case "color":
          colors.push(r.value);
          break;
        case "contact_email":
          contactEmails.push(r.value);
          break;
        case "contact_phone":
          contactPhones.push(r.value);
          break;
        case "location_hint":
          locationHints.push(r.value);
          break;
        case "organization_name":
          orgName = r.value;
          orgSourceUrl = r.source_url || undefined;
          break;
        case "organization_same_as":
          orgSameAs = parseJsonArray(r.value);
          orgSourceUrl = r.source_url || orgSourceUrl;
          break;
        default:
          break;
      }
      continue;
    }
    if (r.record_type === "faq" && r.field === "entry") {
      try {
        const parsed = JSON.parse(r.value) as {
          question?: string;
          answer?: string;
        };
        if (parsed.question && parsed.answer) {
          faqs.push({
            question: parsed.question,
            answer: parsed.answer,
            sourceUrl: r.source_url || undefined,
          });
          const meta = parseNotesMeta(r.notes);
          evidence.push({
            id: meta.id ?? `faq_${createHash("sha256").update(r.value).digest("hex").slice(0, 12)}`,
            field: "faq",
            value: `Q: ${parsed.question} A: ${parsed.answer}`,
            kind: r.evidence_type || "observed",
            confidence: toConfidence(r.confidence, "high"),
            sourceUrl: r.source_url || undefined,
            recordType: "faq",
          });
        }
      } catch {
        /* skip malformed */
      }
      continue;
    }
    if (r.record_type === "offer" && r.field === "hint") {
      offers.push({
        label: r.value,
        sourceUrl: r.source_url || undefined,
      });
      continue;
    }
    if (r.record_type === "crawl_meta") {
      if (r.field === "pageCount") pageCount = Number(r.value) || undefined;
      else if (r.field === "fetchAttempts") {
        fetchAttempts = Number(r.value) || undefined;
      } else if (r.field === "failedUrl") failedUrls.push(r.value);
      else if (r.field === "pageKind") pageKinds.push(r.value);
      else if (r.field === "collectionMethod") collectionMethods.push(r.value);
      else if (r.field === "acceptanceGate") acceptanceGate = r.value;
      else if (r.field === "detectedLocation") {
        detectedLocations.push({
          value: r.value,
          sourceUrl: r.source_url || undefined,
          confidence: r.confidence,
        });
      }
      continue;
    }
    if (r.record_type === "evidence") {
      const meta = parseNotesMeta(r.notes);
      evidence.push({
        id:
          meta.id ??
          `ev_${createHash("sha256").update(`${r.field}|${r.value}|${r.source_url}`).digest("hex").slice(0, 12)}`,
        field: r.field,
        value: r.value,
        kind: r.evidence_type || "observed",
        confidence: toConfidence(r.confidence, "medium"),
        sourceUrl: r.source_url || undefined,
        sourcePageType: meta.sourcePageType,
        recordType: "evidence",
      });
    }
  }

  const businessName = profile.get("businessName")?.value?.trim();
  const website = profile.get("website")?.value?.trim();
  if (!businessName || !website) {
    throw new Error("Company CSV missing businessName or website");
  }

  let companyId = "";
  try {
    companyId = new URL(website).hostname.replace(/^www\./, "");
  } catch {
    companyId = website.replace(/^https?:\/\//, "").split("/")[0] ?? website;
  }

  const normalizeEvidenceType = (
    raw: string
  ): "observed" | "inferred" | "recommended" => {
    const t = raw.trim().toLowerCase();
    if (t === "observed") return "observed";
    if (t === "recommended") return "recommended";
    // CSV may still use legacy "derived"; treat as inferred.
    return "inferred";
  };

  const fieldOf = (name: string) => {
    const p = profile.get(name);
    if (!p?.value?.trim()) return undefined;
    const evidenceType = normalizeEvidenceType(p.evidence_type);
    return {
      value: p.value,
      evidenceType,
      provenance: evidenceType,
      sourceUrl: p.source_url || undefined,
    };
  };

  const projection = companyProfileProjectionSchema.parse({
    companyId,
    schemaVersion: "2.0",
    artifactHash: artifactHashOfCsv(text),
    website,
    businessName,
    description: fieldOf("description"),
    audience: fieldOf("audience"),
    valueProposition: fieldOf("valueProposition"),
    brandVoice: fieldOf("brandVoice"),
    marketingOpportunity: fieldOf("marketingOpportunity"),
    products: parseJsonArray(profile.get("products")?.value),
    services: parseJsonArray(profile.get("services")?.value),
    indexedProducts: (() => {
      try {
        const raw = profile.get("indexedProducts")?.value;
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
          (p): p is { name: string; price?: string; sourceUrl?: string } =>
            !!p && typeof p === "object" && typeof (p as { name?: unknown }).name === "string"
        );
      } catch {
        return [];
      }
    })(),
    colors: parseJsonArray(profile.get("colors")?.value).length
      ? parseJsonArray(profile.get("colors")?.value)
      : colors,
    socialProfiles: (() => {
      try {
        return JSON.parse(profile.get("socialProfiles")?.value || "[]") as unknown[];
      } catch {
        return [];
      }
    })(),
    competitors: (() => {
      try {
        return JSON.parse(profile.get("competitors")?.value || "[]") as unknown[];
      } catch {
        return [];
      }
    })(),
    contentOpportunities: parseJsonArray(
      profile.get("seo.contentOpportunities")?.value
    ),
    seo: {
      metadataCompleteness: profile.get("seo.metadataCompleteness")?.value,
      pageSpeedNote: profile.get("seo.pageSpeedNote")?.value,
      technicalObservations: parseJsonArray(
        profile.get("seo.technicalObservations")?.value
      ),
    },
    signals: {
      title,
      metaDescription,
      headings,
      ctaTexts,
      productText,
      aboutText,
      bodySample,
      testimonialText,
      colors,
      contactEmails,
      contactPhones,
      logoUrl,
      locationHints,
      organization: orgName
        ? { name: orgName, sameAs: orgSameAs, sourceUrl: orgSourceUrl }
        : null,
    },
    faqs,
    offers,
    crawlMeta: {
      pageCount,
      fetchAttempts,
      failedUrls,
      pageKinds,
      collectionMethods,
      acceptanceGate,
      detectedLocations,
    },
    evidence,
    derivedFieldNames: parseJsonArray(profile.get("derivedFieldNames")?.value),
  });

  return projection;
}
