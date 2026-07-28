import type { ContentBrainContext } from "../types";

export type BrandContextSource = "fixture" | "live";

export type BrandContextRepository = {
  source: BrandContextSource;
  loadByDomain(domain: string): Promise<ContentBrainContext | null>;
};

export type CreateBrandContextRepositoryOptions = {
  source: BrandContextSource;
  /** Relative to process.cwd() when source is fixture */
  fixturePath?: string;
};
