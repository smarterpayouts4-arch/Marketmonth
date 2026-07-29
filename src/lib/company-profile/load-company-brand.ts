/**
 * BrandProfile (+ optional strategy) from a company artifact.
 * Dev bootstrap / onboarding — not the Idea Lab Brand Core path.
 */
import { readFileSync } from "node:fs";

import type { BrandProfile, StrategyPreview } from "@/engine/discovery/brand-profile";
import { groundedOnlineMarketingStrategySchema } from "@/lib/discovery/strategy.schema";
import { csvRowsToObjects, parseCsv } from "@/lib/dev/parse-csv";

import { readArtifact, type ArtifactState } from "./artifact-store";
import { parseCompanyCsv } from "./csv-contract";
import {
  readCompanyProfile,
  tryReadCompanyProfile,
  type ReadCompanyProfileOptions,
} from "./read-company-profile";
import { projectionToActivationInput } from "./to-activation-input";
import type { CompanyProfileProjection } from "./projection.schema";

export type LoadedCompanyBrand = {
  brandProfile: BrandProfile;
  strategyPreview: StrategyPreview | null;
  projection: CompanyProfileProjection;
};

function strategyFromCsvText(text: string): StrategyPreview | null {
  const objects = csvRowsToObjects(parseCsv(text));
  for (const o of objects) {
    if ((o.record_type || "").trim() !== "strategy_preview") continue;
    if ((o.field || "").trim() !== "json") continue;
    const raw = (o.value || "").trim();
    if (!raw) continue;
    try {
      return groundedOnlineMarketingStrategySchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return null;
}

export function loadCompanyBrand(
  companyId: string,
  options: ReadCompanyProfileOptions & { absolutePath?: string } = {}
): LoadedCompanyBrand {
  const state: ArtifactState = options.state ?? "approved";

  if (options.absolutePath) {
    const text = readFileSync(options.absolutePath, "utf8");
    const projection = parseCompanyCsv(text);
    const { brandProfile } = projectionToActivationInput(projection);
    return {
      brandProfile,
      strategyPreview: strategyFromCsvText(text),
      projection,
    };
  }

  const projection = readCompanyProfile(companyId, {
    state,
    branch: options.branch,
    step: options.step ?? "loadCompanyBrand",
  });
  const { brandProfile } = projectionToActivationInput(projection);
  const text = readArtifact(companyId, state);
  return {
    brandProfile,
    strategyPreview: text ? strategyFromCsvText(text) : null,
    projection,
  };
}

export function tryLoadCompanyBrand(
  companyId: string,
  options: ReadCompanyProfileOptions = {}
): LoadedCompanyBrand | null {
  const projection = tryReadCompanyProfile(companyId, options);
  if (!projection) return null;
  try {
    return loadCompanyBrand(companyId, options);
  } catch {
    return null;
  }
}
