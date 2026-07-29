import { existsSync } from "node:fs";
import path from "node:path";

import type { ContentBrainContext } from "@/brain/content/types";
import { loadFixtureBrandCore } from "@/brain/content/repository/load-fixture-brand-core";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { artifactRelativePath } from "@/lib/company-profile/artifact-store";
import { readCompanyProfileAsBrainContext } from "@/lib/company-profile/read-company-profile";

import type { BrandCore } from "./brand-core.schema";
import { compileBrandCore } from "./compile-brand-core";
import {
  resolveBrandCoreIdentity,
  type BrandCoreIdentity,
} from "./brand-core-identity";

/**
 * Sole preferred runtime entry for company Brand Core.
 * Default path: readCompanyProfile → compileBrandCore (shared artifact reader).
 * A missing companyId is an error — never a silent fallback to another brand.
 */
export type GetBrandCoreResult = {
  companyId: string;
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  source: "fixture" | "context";
  fixturePath?: string;
};

/** Short aliases → canonical companyId (not path shortcuts to someone else's data). */
const COMPANY_ID_ALIASES: Record<string, string> = {
  zynava: "zynava.com",
  "www.zynava.com": "zynava.com",
  "clearflow-plumbing": "clearflow-plumbing",
  "clearflowplumbing.example": "clearflow-plumbing",
  "www.clearflowplumbing.example": "clearflow-plumbing",
};

export function normalizeCompanyId(companyId: string): string {
  return companyId
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "");
}

function resolveCompanyId(companyId: string): string {
  const id = normalizeCompanyId(companyId);
  return COMPANY_ID_ALIASES[id] ?? id;
}

function fixtureExists(relativePath: string): boolean {
  return existsSync(path.join(process.cwd(), relativePath));
}

/**
 * Resolve approved discovery CSV for a company id.
 * Convention only: data/companies/<id>/approved.csv
 */
export function fixturePathForCompany(companyId: string): string | null {
  const id = resolveCompanyId(companyId);
  if (!id) return null;

  const candidates = [
    artifactRelativePath(id, "approved"),
    // slug variants (dots → hyphens) for non-domain company folders
    artifactRelativePath(id.replace(/\./g, "-"), "approved"),
  ];
  for (const candidate of candidates) {
    if (fixtureExists(candidate)) return candidate;
  }
  return null;
}

/**
 * Load + compile Brand Core for a company id (domain preferred).
 * Pass `context` when the caller already merged research / live expansions —
 * still goes through `compileBrandCore` (catalog/FAQ-aware).
 * Pass `absolutePath` / `fixturePath` only for publish temp CSV and tests.
 */
export function getBrandCore(
  companyId: string,
  options?: {
    context?: ContentBrainContext;
    fixturePath?: string;
    absolutePath?: string;
  }
): GetBrandCoreResult {
  const normalized = resolveCompanyId(companyId);
  if (!normalized && !options?.fixturePath && !options?.absolutePath && !options?.context) {
    throw new Error(
      "getBrandCore: companyId is required (no silent default brand)"
    );
  }

  if (options?.context) {
    const brandCore = compileBrandCore(options.context);
    const identity = resolveBrandCoreIdentity(brandCore);
    return {
      companyId: identity.company_id || normalized,
      context: options.context,
      brandCore,
      identity,
      source: "context",
      fixturePath: options.fixturePath,
    };
  }

  // Explicit path override (publish temp / tests) — bypass shared reader.
  if (options?.absolutePath || options?.fixturePath) {
    const loaded = loadFixtureBrandCore({
      fixturePath: options.fixturePath,
      absolutePath: options.absolutePath,
    });
    return {
      companyId: loaded.identity.company_id || normalized,
      context: loaded.context,
      brandCore: loaded.brandCore,
      identity: loaded.identity,
      source: "fixture",
      fixturePath: loaded.fixturePath,
    };
  }

  const fixtureRelative = fixturePathForCompany(normalized);
  if (!fixtureRelative) {
    throw new Error(
      `getBrandCore: no approved artifact for companyId "${companyId}". ` +
        `Expected data/companies/<companyId>/approved.csv or pass fixturePath/absolutePath.`
    );
  }

  const context = readCompanyProfileAsBrainContext(normalized, {
    state: "approved",
    branch: "branch-b",
    step: "getBrandCore",
  });
  const brandCore = compileBrandCore(context);
  const identity = resolveBrandCoreIdentity(brandCore);

  return {
    companyId: identity.company_id || normalized,
    context,
    brandCore,
    identity,
    source: "fixture",
    fixturePath: fixtureRelative,
  };
}

/** Sync helper when only CSV text is known (tests / scripts). */
export function getBrandCoreFromCsvText(
  companyId: string,
  csvText: string
): GetBrandCoreResult {
  const context = parseFixtureCsv(csvText);
  if (!context) {
    throw new Error("getBrandCoreFromCsvText: parseFixtureCsv returned null");
  }
  return getBrandCore(companyId, { context });
}
