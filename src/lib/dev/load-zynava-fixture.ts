import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  brandProfileSchema,
  competitorSchema,
  socialProfileSchema,
  type BrandProfile,
  type StrategyPreview,
} from "@/engine/discovery/brand-profile";
import { groundedOnlineMarketingStrategySchema } from "@/lib/discovery/strategy.schema";
import { csvRowsToObjects, parseCsv } from "@/lib/dev/parse-csv";
import { ZYNAVA_NAME, ZYNAVA_WEBSITE } from "@/lib/dev/zynava-constants";
import { z } from "zod";

export type ZynavaFixtureRow = {
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

export type LoadedZynavaFixture = {
  brandProfile: BrandProfile;
  strategyPreview: StrategyPreview | null;
  rows: ZynavaFixtureRow[];
};

const EVIDENCE_TYPES = new Set([
  "observed",
  "inferred",
  "user_confirmed",
  "recommended",
]);

const socialProfilesSchema = z.array(socialProfileSchema);
const competitorsSchema = z.array(competitorSchema);

function fixturePath(): string {
  return join(process.cwd(), "data", "fixtures", "zynava-discovery.csv");
}

function fieldMap(rows: ZynavaFixtureRow[], recordType: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.record_type === recordType && row.field) {
      map.set(row.field, row.value);
    }
  }
  return map;
}

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // fall through — treat as pipe-separated
  }
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCatalogProductsField(
  raw: string | undefined
): BrandProfile["catalogProducts"] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { name?: unknown }).name === "string" &&
        (item as { name: string }).name.trim()
      ) {
        const row = item as {
          name: string;
          price?: string;
          sourceUrl?: string;
        };
        return [
          {
            name: row.name.trim(),
            price: typeof row.price === "string" ? row.price : undefined,
            sourceUrl:
              typeof row.sourceUrl === "string" && row.sourceUrl.trim()
                ? row.sourceUrl
                : "https://unknown.invalid",
          },
        ];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function parseSocialProfiles(raw: string | undefined): BrandProfile["socialProfiles"] {
  if (!raw?.trim()) return [];
  try {
    const parsed = socialProfilesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function parseCompetitors(raw: string | undefined): BrandProfile["competitors"] {
  if (!raw?.trim()) return [];
  try {
    const parsed = competitorsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function buildBrandProfile(rows: ZynavaFixtureRow[]): BrandProfile {
  const f = fieldMap(rows, "brand_profile");
  const completeness = f.get("seo.metadataCompleteness");
  const metadataCompleteness =
    completeness === "strong" ||
    completeness === "partial" ||
    completeness === "weak"
      ? completeness
      : ("partial" as const);

  const candidate = {
    businessName: f.get("businessName") || ZYNAVA_NAME,
    website: f.get("website") || ZYNAVA_WEBSITE,
    description: f.get("description") || `${ZYNAVA_NAME} (fixture).`,
    audience: f.get("audience") || "Primary audience",
    products: parseJsonArray(f.get("products")),
    services: parseJsonArray(f.get("services")),
    catalogProducts: parseCatalogProductsField(f.get("catalogProducts")),
    valueProposition: f.get("valueProposition") || "Value proposition",
    brandVoice: f.get("brandVoice") || "Clear and helpful",
    marketingOpportunity:
      f.get("marketingOpportunity") || "Grow awareness online",
    colors: parseJsonArray(f.get("colors")),
    socialProfiles: parseSocialProfiles(f.get("socialProfiles")),
    seoSummary: {
      metadataCompleteness,
      pageSpeedNote: f.get("seo.pageSpeedNote") || "Not measured in fixture",
      technicalObservations: parseJsonArray(f.get("seo.technicalObservations")),
      contentOpportunities: parseJsonArray(f.get("seo.contentOpportunities")),
    },
    competitors: parseCompetitors(f.get("competitors")),
  };

  return brandProfileSchema.parse(candidate);
}

function buildStrategyPreview(
  rows: ZynavaFixtureRow[]
): StrategyPreview | null {
  const f = fieldMap(rows, "strategy_preview");
  const raw = f.get("json");
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return groundedOnlineMarketingStrategySchema.parse(parsed);
  } catch {
    return null;
  }
}

/** Server-only: read and validate the checked-in Zynava CSV fixture. */
export function loadZynavaFixture(): LoadedZynavaFixture {
  const text = readFileSync(fixturePath(), "utf8");
  const objects = csvRowsToObjects(parseCsv(text));
  const rows: ZynavaFixtureRow[] = objects.map((o) => {
    const evidence = (o.evidence_type || "inferred").trim();
    if (evidence && !EVIDENCE_TYPES.has(evidence)) {
      throw new Error(`Invalid evidence_type in fixture: ${evidence}`);
    }
    return {
      record_type: (o.record_type || "").trim(),
      field: (o.field || "").trim(),
      value: o.value ?? "",
      source_url: o.source_url ?? "",
      evidence_type: evidence || "inferred",
      confidence: o.confidence ?? "",
      source_snippet: o.source_snippet ?? "",
      notes: o.notes ?? "",
      retrieved_at: o.retrieved_at ?? "",
    };
  });

  if (rows.length === 0) {
    throw new Error("Zynava fixture CSV is empty.");
  }

  return {
    brandProfile: buildBrandProfile(rows),
    strategyPreview: buildStrategyPreview(rows),
    rows,
  };
}

export function tryLoadZynavaFixture(): LoadedZynavaFixture | null {
  try {
    return loadZynavaFixture();
  } catch {
    return null;
  }
}
