import { readFileSync } from "node:fs";
import path from "node:path";

import type { BrandCoreIdentity } from "@/brain/core/brand-core-identity";
import { resolveBrandCoreIdentity } from "@/brain/core/brand-core-identity";
import type { BrandCore } from "@/brain/core/brand-core.schema";
import { compileBrandCore } from "@/brain/core/compile-brand-core";
import { parseCompanyCsv } from "@/lib/company-profile/csv-contract";
import { projectionToBrainContext } from "@/lib/company-profile/to-brain-context";
import { recordProvenance } from "@/lib/provenance";

import type { ContentBrainContext } from "../types";

/**
 * Single artifact → context → Brand Core compile path for Branch B.
 * Uses the shared CSV v2 contract, so topics see exactly the projection
 * the discovery card sees. Callers must pass a path — no silent default brand.
 */
export type FixtureBrandCoreLoad = {
  text: string;
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  fixturePath: string;
};

/** True when the path is a managed company artifact rather than an ad-hoc file. */
function isArtifactPath(absolutePath: string): boolean {
  const normalized = absolutePath.replace(/\\/g, "/");
  return /\/data\/companies\/[^/]+\/(draft|approved)\.csv$/.test(normalized);
}

export function loadFixtureBrandCore(options: {
  fixturePath?: string;
  absolutePath?: string;
}): FixtureBrandCoreLoad {
  if (!options.absolutePath && !options.fixturePath) {
    throw new Error(
      "loadFixtureBrandCore: fixturePath or absolutePath is required (no silent default brand)"
    );
  }

  const absolutePath =
    options.absolutePath ??
    (path.isAbsolute(options.fixturePath!)
      ? options.fixturePath!
      : path.join(process.cwd(), options.fixturePath!));

  const text = readFileSync(absolutePath, "utf8");
  const projection = parseCompanyCsv(text);
  const context = projectionToBrainContext(projection, text);
  const brandCore = compileBrandCore(context);
  const identity = resolveBrandCoreIdentity(brandCore);

  recordProvenance({
    branch: "branch-b",
    step: "loadFixtureBrandCore",
    companyId: projection.companyId || context.domain || "unknown",
    source: isArtifactPath(absolutePath)
      ? absolutePath.endsWith("draft.csv")
        ? "artifact:draft"
        : "artifact:approved"
      : "disk:direct",
    artifactHash: projection.artifactHash,
    detail: {
      absolutePath,
      evidenceCount: Object.keys(context.evidenceById ?? {}).length,
    },
  });

  return {
    text,
    context,
    brandCore,
    identity,
    fixturePath: options.fixturePath ?? absolutePath,
  };
}
