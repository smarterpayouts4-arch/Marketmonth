import { createFixtureBrandContextRepository } from "./fixture-repository";
import type {
  BrandContextRepository,
  CreateBrandContextRepositoryOptions,
} from "./types";

/**
 * Composition helper for API routes.
 * Live source is a stub until Neon-backed context is wired.
 * Fixture CSV is an ingest helper into Brand Core — not doctrine.
 * Callers must pass fixturePath; there is no silent default brand.
 */
export function createBrandContextRepository(
  options: CreateBrandContextRepositoryOptions
): BrandContextRepository {
  if (options.source === "fixture") {
    if (!options.fixturePath?.trim()) {
      throw new Error(
        "createBrandContextRepository: fixturePath is required (no silent default brand)"
      );
    }
    return createFixtureBrandContextRepository(options.fixturePath);
  }

  // Live path deferred — return empty loader rather than inventing data.
  return {
    source: "live",
    async loadByDomain() {
      return null;
    },
  };
}
