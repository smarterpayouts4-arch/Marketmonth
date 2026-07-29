/**
 * Reconcile fixture view over the sole CSV contract (parseCompanyCsv).
 * Replaces the accidental second reader formerly in load-csv-slice.ts.
 */
import { readFileSync } from "node:fs";

import { parseCompanyCsv } from "@/lib/company-profile/csv-contract";
import type { CompanyProfileProjection } from "@/lib/company-profile/projection.schema";

export type CsvKnowledgeSlice = {
  businessName: string;
  website: string;
  description: string;
  audience: string;
  products: string[];
  services: string[];
  indexedProducts: Array<{ name: string; sourceUrl?: string }>;
  valueProposition: string;
  brandVoice: string;
  marketingOpportunity: string;
  schemaVersion: string | null;
  catalogEvidenceNames: string[];
  retrievedAt: string | null;
  evidenceTypesByField: Record<string, string>;
};

function evidenceTypeForField(
  projection: CompanyProfileProjection,
  field: string
): string | undefined {
  const scalar = (
    {
      description: projection.description,
      audience: projection.audience,
      valueProposition: projection.valueProposition,
      brandVoice: projection.brandVoice,
      marketingOpportunity: projection.marketingOpportunity,
    } as Record<string, { evidenceType?: string } | undefined>
  )[field];
  return scalar?.evidenceType;
}

/** Map the canonical projection into the reconcile report fixture shape. */
export function projectionToCsvKnowledgeSlice(
  projection: CompanyProfileProjection
): CsvKnowledgeSlice {
  const evidenceTypesByField: Record<string, string> = {};
  for (const field of [
    "description",
    "audience",
    "valueProposition",
    "brandVoice",
    "marketingOpportunity",
    "businessName",
    "website",
    "products",
    "services",
  ]) {
    const et = evidenceTypeForField(projection, field);
    if (et) evidenceTypesByField[field] = et;
  }
  // Identity fields are observed when present
  if (projection.businessName) evidenceTypesByField.businessName = "observed";
  if (projection.website) evidenceTypesByField.website = "observed";
  if (projection.products.length) {
    evidenceTypesByField.products =
      evidenceTypesByField.products ?? "observed";
  }
  if (projection.services.length) {
    evidenceTypesByField.services =
      evidenceTypesByField.services ?? "observed";
  }

  const catalogEvidenceNames = projection.evidence
    .filter((e) => e.field === "indexedProduct" && e.value.trim())
    .map((e) => e.value.trim());

  return {
    businessName: projection.businessName,
    website: projection.website,
    description: projection.description?.value ?? "",
    audience: projection.audience?.value ?? "",
    products: projection.products,
    services: projection.services,
    indexedProducts: projection.indexedProducts.map((p) => ({
      name: p.name,
      sourceUrl: p.sourceUrl,
    })),
    valueProposition: projection.valueProposition?.value ?? "",
    brandVoice: projection.brandVoice?.value ?? "",
    marketingOpportunity: projection.marketingOpportunity?.value ?? "",
    schemaVersion: projection.schemaVersion,
    catalogEvidenceNames,
    retrievedAt: null,
    evidenceTypesByField,
  };
}

/** Load approved/draft CSV via the sole parser, then project to reconcile shape. */
export function loadFixtureFromCsv(absolutePath: string): CsvKnowledgeSlice {
  const text = readFileSync(absolutePath, "utf8");
  return projectionToCsvKnowledgeSlice(parseCompanyCsv(text));
}
