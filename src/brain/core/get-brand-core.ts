import path from "node:path";

import type { ContentBrainContext } from "@/brain/content/types";
import {
  DEFAULT_FIXTURE_RELATIVE,
  defaultFixtureAbsolute,
} from "@/brain/content/repository/default-fixture";
import { loadFixtureBrandCore } from "@/brain/content/repository/load-fixture-brand-core";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { readFileSync } from "node:fs";

import {
  compileBrandCore,
  type BrandCore,
} from "./compile-brand-core";
import {
  resolveBrandCoreIdentity,
  type BrandCoreIdentity,
} from "./brand-core-identity";

/**
 * Sole preferred runtime entry for company Brand Core.
 * Dev: Zynava CSV fixture adapter. Live DB adapters land later (Neon deferred).
 */
export type GetBrandCoreResult = {
  companyId: string;
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  source: "fixture" | "context";
  fixturePath?: string;
};

const ZYNAVA_COMPANY_IDS = new Set([
  "zynava.com",
  "zynava",
  "www.zynava.com",
]);

function normalizeCompanyId(companyId: string): string {
  return companyId.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function fixturePathForCompany(companyId: string): string | null {
  const id = normalizeCompanyId(companyId);
  if (ZYNAVA_COMPANY_IDS.has(id) || id.endsWith("zynava.com")) {
    return DEFAULT_FIXTURE_RELATIVE;
  }
  return null;
}

/**
 * Load + compile Brand Core for a company id (domain preferred).
 * Pass `context` when the caller already merged research / live expansions —
 * still goes through `compileBrandCore` (catalog/FAQ-aware).
 */
export function getBrandCore(
  companyId: string,
  options?: {
    context?: ContentBrainContext;
    fixturePath?: string;
    absolutePath?: string;
  }
): GetBrandCoreResult {
  const normalized = normalizeCompanyId(companyId);

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

  const fixtureRelative =
    options?.fixturePath ?? fixturePathForCompany(normalized);
  if (!fixtureRelative && !options?.absolutePath) {
    throw new Error(
      `getBrandCore: no fixture adapter for companyId "${companyId}" (Neon live adapter deferred)`
    );
  }

  const loaded = loadFixtureBrandCore({
    fixturePath: fixtureRelative ?? undefined,
    absolutePath: options?.absolutePath,
  });

  return {
    companyId: loaded.identity.company_id,
    context: loaded.context,
    brandCore: loaded.brandCore,
    identity: loaded.identity,
    source: "fixture",
    fixturePath: loaded.fixturePath,
  };
}

/** Sync helper when only absolute CSV path is known (tests / scripts). */
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

export function resolveZynavaFixtureAbsolute(
  fixturePath?: string
): string {
  if (!fixturePath) return defaultFixtureAbsolute();
  return path.isAbsolute(fixturePath)
    ? fixturePath
    : path.join(process.cwd(), fixturePath);
}

export function readFixtureText(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}
