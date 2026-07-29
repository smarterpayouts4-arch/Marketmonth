import { existsSync, readFileSync } from "node:fs";

import type { BrandProfile, SocialProfile } from "../brand-profile";
import { makeEvidence } from "@/lib/discovery/evidence";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

export type OverrideEntry = {
  field: string;
  value: unknown;
  reason?: string;
  approvalStatus?: "approved" | "pending" | "rejected";
  approvedAt?: string;
};

export type ApprovedOverridesFile = {
  schemaVersion?: string;
  notes?: string;
  /** Provenance-rich entries (preferred). */
  entries?: OverrideEntry[];
  /** Legacy flat fields — still applied for backward compatibility. */
  fields?: Partial<{
    audience: string;
    description: string;
    valueProposition: string;
    brandVoice: string;
    marketingOpportunity: string;
    products: string[];
    services: string[];
    legalName: string;
    socialProfiles: SocialProfile[];
    competitors: BrandProfile["competitors"];
  }>;
};

export type AppliedOverrideLog = {
  field: string;
  reason?: string;
  approvalStatus?: string;
  source: "entries" | "fields";
};

function fieldsFromEntries(
  entries: OverrideEntry[] | undefined
): NonNullable<ApprovedOverridesFile["fields"]> {
  const out: NonNullable<ApprovedOverridesFile["fields"]> = {};
  if (!entries?.length) return out;
  for (const e of entries) {
    if (e.approvalStatus === "rejected" || e.approvalStatus === "pending") {
      continue;
    }
    const f = e.field as keyof NonNullable<ApprovedOverridesFile["fields"]>;
    (out as Record<string, unknown>)[f] = e.value;
  }
  return out;
}

export function loadApprovedOverrides(path: string): ApprovedOverridesFile {
  if (!existsSync(path)) return { fields: {} };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ApprovedOverridesFile;
  } catch {
    return { fields: {} };
  }
}

function mergedFields(
  overrides: ApprovedOverridesFile
): NonNullable<ApprovedOverridesFile["fields"]> {
  return {
    ...fieldsFromEntries(overrides.entries),
    ...(overrides.fields ?? {}),
  };
}

/** Apply only explicitly listed override fields (never silent inheritance). */
export function applyApprovedOverrides(
  profile: BrandProfile,
  overrides: ApprovedOverridesFile
): BrandProfile {
  const f = mergedFields(overrides);
  return {
    ...profile,
    ...(typeof f.audience === "string" ? { audience: f.audience } : {}),
    ...(typeof f.description === "string"
      ? { description: f.description }
      : {}),
    ...(typeof f.valueProposition === "string"
      ? { valueProposition: f.valueProposition }
      : {}),
    ...(typeof f.brandVoice === "string" ? { brandVoice: f.brandVoice } : {}),
    ...(typeof f.marketingOpportunity === "string"
      ? { marketingOpportunity: f.marketingOpportunity }
      : {}),
    ...(Array.isArray(f.products) ? { products: f.products } : {}),
    ...(Array.isArray(f.services) ? { services: f.services } : {}),
    ...(Array.isArray(f.socialProfiles)
      ? { socialProfiles: f.socialProfiles }
      : {}),
    ...(Array.isArray(f.competitors) ? { competitors: f.competitors } : {}),
  };
}

/** Log which overrides were applied (for approval meta / reconcile). */
export function listAppliedOverrides(
  overrides: ApprovedOverridesFile
): AppliedOverrideLog[] {
  const logs: AppliedOverrideLog[] = [];
  for (const e of overrides.entries ?? []) {
    if (e.approvalStatus === "rejected" || e.approvalStatus === "pending") {
      continue;
    }
    logs.push({
      field: e.field,
      reason: e.reason,
      approvalStatus: e.approvalStatus ?? "approved",
      source: "entries",
    });
  }
  for (const key of Object.keys(overrides.fields ?? {})) {
    if (logs.some((l) => l.field === key)) continue;
    logs.push({ field: key, source: "fields" });
  }
  return logs;
}

/**
 * Superseding evidence rows for every approved override field.
 * Profile patches alone leave stale crawl evidence (e.g. competitors) — emit
 * explicit override-provenance rows so CSV consumers see one canonical view.
 */
export function evidenceFromOverrides(
  overrides: ApprovedOverridesFile,
  sourceUrl: string
): DiscoveryEvidence[] {
  const f = mergedFields(overrides);
  const out: DiscoveryEvidence[] = [];
  const pageType = "approved_override";

  if (typeof f.legalName === "string" && f.legalName.trim()) {
    out.push(
      makeEvidence({
        field: "legalName",
        kind: "observed",
        value: f.legalName.trim(),
        sourceUrl,
        sourcePageType: pageType,
        confidence: "high",
      })
    );
  }
  if (Array.isArray(f.products) && f.products.length > 0) {
    out.push(
      makeEvidence({
        field: "products",
        kind: "observed",
        value: JSON.stringify(f.products),
        sourceUrl,
        sourcePageType: pageType,
        confidence: "high",
      })
    );
  }
  if (Array.isArray(f.services) && f.services.length > 0) {
    out.push(
      makeEvidence({
        field: "services",
        kind: "observed",
        value: JSON.stringify(f.services),
        sourceUrl,
        sourcePageType: pageType,
        confidence: "high",
      })
    );
  }
  if (Array.isArray(f.socialProfiles) && f.socialProfiles.length > 0) {
    out.push(
      makeEvidence({
        field: "socialProfiles",
        kind: "observed",
        value: JSON.stringify(f.socialProfiles),
        sourceUrl,
        sourcePageType: pageType,
        confidence: "high",
      })
    );
  }
  if (Array.isArray(f.competitors) && f.competitors.length > 0) {
    out.push(
      makeEvidence({
        field: "competitors",
        kind: "observed",
        value: JSON.stringify(f.competitors),
        sourceUrl,
        sourcePageType: pageType,
        confidence: "high",
      })
    );
  }
  for (const scalar of [
    "audience",
    "description",
    "valueProposition",
    "brandVoice",
    "marketingOpportunity",
  ] as const) {
    const v = f[scalar];
    if (typeof v === "string" && v.trim()) {
      out.push(
        makeEvidence({
          field: scalar,
          kind: "observed",
          value: v.trim(),
          sourceUrl,
          sourcePageType: pageType,
          confidence: "high",
        })
      );
    }
  }
  return out;
}
