import { existsSync, readFileSync } from "node:fs";

import type {
  AnalyzeProfileSnapshot,
  BuildReconciliationInput,
} from "./constants";

export function loadAnalyzeProfile(input: BuildReconciliationInput): {
  profile: AnalyzeProfileSnapshot | null;
  path: string | null;
  diagnostics: string[];
} {
  if (input.analyzeProfile) {
    return { profile: input.analyzeProfile, path: null, diagnostics: [] };
  }
  const p = input.analyzeProfilePath;
  if (!p) {
    return {
      profile: null,
      path: null,
      diagnostics: [
        "No analyze profile provided — catalog compare uses frozen-corpus simulation (crawl without ingredient-explorer).",
      ],
    };
  }
  if (!existsSync(p)) {
    return {
      profile: null,
      path: p,
      diagnostics: [`Analyze profile file missing: ${p}`],
    };
  }
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as AnalyzeProfileSnapshot;
    return { profile: raw, path: p, diagnostics: [] };
  } catch (err) {
    return {
      profile: null,
      path: p,
      diagnostics: [
        `Analyze profile unreadable: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
}
