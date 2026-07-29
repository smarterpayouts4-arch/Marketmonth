import { parseCompanyCsv } from "@/lib/company-profile/csv-contract";
import { projectionToBrainContext } from "@/lib/company-profile/to-brain-context";

import type { ContentBrainContext } from "../types";

/**
 * Pure CSV → context (no FS). Safe for tests and server loaders.
 *
 * Delegates to the shared CSV v2 contract so Branch B and Branch A cannot
 * drift: there is exactly one CSV parser and one projection→context mapping.
 * Returns null on anything the contract rejects, including v1 documents.
 */
export function parseFixtureCsv(text: string): ContentBrainContext | null {
  try {
    const projection = parseCompanyCsv(text);
    return projectionToBrainContext(projection, text);
  } catch {
    return null;
  }
}
