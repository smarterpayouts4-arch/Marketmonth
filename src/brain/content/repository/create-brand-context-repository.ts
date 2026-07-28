import { DEFAULT_FIXTURE_RELATIVE } from "./default-fixture";
import { createFixtureBrandContextRepository } from "./fixture-repository";
import type {
  BrandContextRepository,
  CreateBrandContextRepositoryOptions,
} from "./types";

/**
 * Composition helper for API routes.
 * Live source is a stub until Neon-backed context is wired.
 * Fixture CSV is an ingest helper into Brand Core — not doctrine.
 */
export function createBrandContextRepository(
  options: CreateBrandContextRepositoryOptions
): BrandContextRepository {
  if (options.source === "fixture") {
    return createFixtureBrandContextRepository(
      options.fixturePath ?? DEFAULT_FIXTURE_RELATIVE
    );
  }

  // Live path deferred — return empty loader rather than inventing data.
  return {
    source: "live",
    async loadByDomain() {
      return null;
    },
  };
}
