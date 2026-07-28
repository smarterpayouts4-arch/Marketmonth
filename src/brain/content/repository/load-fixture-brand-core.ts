import { readFileSync } from "node:fs";
import path from "node:path";

import type { BrandCoreIdentity } from "@/brain/core/brand-core-identity";
import { resolveBrandCoreIdentity } from "@/brain/core/brand-core-identity";
import type { BrandCore } from "@/brain/core/brand-core.schema";
import { compileBrandCore } from "@/brain/core/compile-brand-core";

import type { ContentBrainContext } from "../types";
import {
  DEFAULT_FIXTURE_RELATIVE,
  defaultFixtureAbsolute,
} from "./default-fixture";
import { parseFixtureCsv } from "./parse-fixture-csv";

/**
 * Single fixture → context → Brand Core compile path.
 * Product and Idea Lab should prefer this over ad-hoc read/parse/compile.
 */
export type FixtureBrandCoreLoad = {
  text: string;
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  fixturePath: string;
};

export function loadFixtureBrandCore(options?: {
  fixturePath?: string;
  absolutePath?: string;
}): FixtureBrandCoreLoad {
  const absolutePath =
    options?.absolutePath ??
    (options?.fixturePath
      ? path.isAbsolute(options.fixturePath)
        ? options.fixturePath
        : path.join(process.cwd(), options.fixturePath)
      : defaultFixtureAbsolute());

  const text = readFileSync(absolutePath, "utf8");
  const context = parseFixtureCsv(text);
  if (!context) {
    throw new Error(`Failed to parse brand fixture at ${absolutePath}`);
  }
  const brandCore = compileBrandCore(context);
  const identity = resolveBrandCoreIdentity(brandCore);
  return {
    text,
    context,
    brandCore,
    identity,
    fixturePath: options?.fixturePath ?? DEFAULT_FIXTURE_RELATIVE,
  };
}
