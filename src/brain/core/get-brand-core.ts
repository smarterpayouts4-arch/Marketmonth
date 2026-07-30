import { existsSync } from "node:fs";
import path from "node:path";

import type { ContentBrainContext } from "@/brain/content/types";
import { loadFixtureBrandCore } from "@/brain/content/repository/load-fixture-brand-core";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { artifactRelativePath } from "@/lib/company-profile/artifact-store";
import {
  readCompanyProfileAsBrainContext,
  readCompanyProfileAsync,
} from "@/lib/company-profile/read-company-profile";
import { projectionToBrainContext } from "@/lib/company-profile/to-brain-context";

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
  source: "fixture" | "context" | "artifact";
  fixturePath?: string;
};

/**
 * Fixture aliases for ClearFlow (always available — fixture company id).
 * Zynava short aliases are DEV/test only so production never remaps arbitrary
 * "zynava" strings to the fixture brand. Disable with ALLOW_DEV_COMPANY_ALIASES=false.
 */
const CLEARFLOW_COMPANY_ID_ALIASES: Record<string, string> = {
  "clearflow-plumbing": "clearflow-plumbing",
  "clearflowplumbing.example": "clearflow-plumbing",
  "www.clearflowplumbing.example": "clearflow-plumbing",
};

const ZYNAVA_DEV_COMPANY_ID_ALIASES: Record<string, string> = {
  zynava: "zynava.com",
  "www.zynava.com": "zynava.com",
};

/** Zynava short aliases: DEV/test by default; opt-in for prod; kill-switch false. */
function allowZynavaDevAliases(): boolean {
  if (process.env.ALLOW_DEV_COMPANY_ALIASES === "false") return false;
  if (process.env.ALLOW_DEV_COMPANY_ALIASES === "true") return true;
  return process.env.NODE_ENV !== "production";
}

function companyIdAliases(): Record<string, string> {
  return {
    ...CLEARFLOW_COMPANY_ID_ALIASES,
    ...(allowZynavaDevAliases() ? ZYNAVA_DEV_COMPANY_ID_ALIASES : {}),
  };
}

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
  return companyIdAliases()[id] ?? id;
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

/**
 * Compiled Brand Core cache keyed by companyId:artifactHash — tenant-scoped
 * so identical artifact hashes across companies cannot collide.
 */
const compiledByArtifactHash = new Map<
  string,
  { brandCore: BrandCore; identity: BrandCoreIdentity }
>();
const COMPILED_CACHE_MAX = 64;

/** Cache key for compiled Brand Core (exported for isolation tests). */
export function brandCoreCacheKey(
  companyId: string,
  artifactHash: string
): string {
  return `${normalizeCompanyId(companyId)}:${artifactHash}`;
}

function compileCached(
  companyId: string,
  artifactHash: string | undefined,
  context: ContentBrainContext
): { brandCore: BrandCore; identity: BrandCoreIdentity } {
  const cacheKey =
    artifactHash && companyId
      ? brandCoreCacheKey(companyId, artifactHash)
      : undefined;
  if (cacheKey) {
    const hit = compiledByArtifactHash.get(cacheKey);
    if (hit) return hit;
  }
  const brandCore = compileBrandCore(context);
  const identity = resolveBrandCoreIdentity(brandCore);
  const entry = { brandCore, identity };
  if (cacheKey) {
    if (compiledByArtifactHash.size >= COMPILED_CACHE_MAX) {
      const oldest = compiledByArtifactHash.keys().next().value;
      if (oldest !== undefined) compiledByArtifactHash.delete(oldest);
    }
    compiledByArtifactHash.set(cacheKey, entry);
  }
  return entry;
}

/** Test seam: clear the hash-keyed compile cache. */
export function clearBrandCoreCacheForTests(): void {
  compiledByArtifactHash.clear();
}

/**
 * Async Brand Core load: disk first, then the DB artifact mirror
 * (company_profile_artifacts) — use this from anything that runs deployed,
 * where the filesystem may be read-only or empty.
 */
export async function getBrandCoreAsync(
  companyId: string,
  options?: { context?: ContentBrainContext }
): Promise<GetBrandCoreResult> {
  if (options?.context) {
    return getBrandCore(companyId, { context: options.context });
  }

  const normalized = resolveCompanyId(companyId);
  if (!normalized) {
    throw new Error(
      "getBrandCoreAsync: companyId is required (no silent default brand)"
    );
  }

  const readOptions = {
    state: "approved" as const,
    branch: "branch-b" as const,
    step: "getBrandCoreAsync",
  };

  let projection;
  try {
    projection = await readCompanyProfileAsync(normalized, readOptions);
  } catch (err) {
    // Slug variant (dots → hyphens) mirrors the sync path's folder fallback.
    const slug = normalized.replace(/\./g, "-");
    if (slug === normalized) throw err;
    projection = await readCompanyProfileAsync(slug, readOptions);
  }

  const context = projectionToBrainContext(projection);
  const { brandCore, identity } = compileCached(
    normalized,
    projection.artifactHash,
    context
  );

  return {
    companyId: identity.company_id || normalized,
    context,
    brandCore,
    identity,
    source: "artifact",
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
