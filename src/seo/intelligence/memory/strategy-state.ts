import fs from "node:fs";

import type { SeoChangeBrief } from "../contracts/recommendation";
import { MEMORY_FILES, SEO_DATA_DIR } from "./paths";

export type SeoStrategyState = {
  lastRefreshedAt: string | null;
  lastBriefId: string | null;
  staleAfterDays: number;
  newFindings: number;
  highPriority: number;
  changesSincePrevious: number;
};

const DEFAULT_STATE: SeoStrategyState = {
  lastRefreshedAt: null,
  lastBriefId: null,
  staleAfterDays: 7,
  newFindings: 0,
  highPriority: 0,
  changesSincePrevious: 0,
};

function ensureDir() {
  fs.mkdirSync(SEO_DATA_DIR, { recursive: true });
}

export function readStrategyState(): SeoStrategyState {
  try {
    const raw = fs.readFileSync(MEMORY_FILES.strategyState, "utf8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeStrategyState(state: SeoStrategyState): void {
  ensureDir();
  fs.writeFileSync(
    MEMORY_FILES.strategyState,
    JSON.stringify(state, null, 2),
    "utf8"
  );
}

export function applyBriefToStrategyState(brief: SeoChangeBrief): SeoStrategyState {
  const next: SeoStrategyState = {
    lastRefreshedAt: brief.generatedAt,
    lastBriefId: brief.id,
    staleAfterDays: brief.staleAfterDays,
    newFindings: brief.newCount,
    highPriority: brief.highPriorityCount,
    changesSincePrevious: brief.changesSincePrevious,
  };
  writeStrategyState(next);
  return next;
}

export function isStrategyStale(state = readStrategyState()): boolean {
  if (!state.lastRefreshedAt) return true;
  const ageMs = Date.now() - new Date(state.lastRefreshedAt).getTime();
  return ageMs > state.staleAfterDays * 24 * 60 * 60 * 1000;
}
