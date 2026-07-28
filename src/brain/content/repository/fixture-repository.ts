import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BrandContextRepository } from "./types";
import { parseFixtureCsv } from "./parse-fixture-csv";

export { parseFixtureCsv } from "./parse-fixture-csv";

/**
 * Server-only fixture loader. Dashboard must never import this module.
 */
export function createFixtureBrandContextRepository(
  fixturePath: string
): BrandContextRepository {
  return {
    source: "fixture",
    async loadByDomain(domain: string) {
      const absolute = path.isAbsolute(fixturePath)
        ? fixturePath
        : path.join(process.cwd(), fixturePath);
      const text = await readFile(absolute, "utf8");
      const context = parseFixtureCsv(text);
      if (!context) return null;
      const normalized = normalizeDomain(domain);
      if (
        normalized &&
        normalizeDomain(context.domain) !== normalized &&
        !context.website.toLowerCase().includes(normalized)
      ) {
        return null;
      }
      return context;
    },
  };
}

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}
