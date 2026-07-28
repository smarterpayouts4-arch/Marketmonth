import fs from "node:fs";

import type { SeoChangeBrief } from "../contracts/recommendation";
import { MEMORY_FILES, SEO_DATA_DIR } from "./paths";

export type ResearchHistoryEntry = {
  briefId: string;
  generatedAt: string;
  kind: SeoChangeBrief["kind"];
  findingFingerprints: string[];
};

function ensureDir() {
  fs.mkdirSync(SEO_DATA_DIR, { recursive: true });
}

export function readResearchHistory(): ResearchHistoryEntry[] {
  try {
    const raw = fs.readFileSync(MEMORY_FILES.researchHistory, "utf8");
    const parsed = JSON.parse(raw) as ResearchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendResearchHistory(entry: ResearchHistoryEntry): void {
  ensureDir();
  const history = readResearchHistory();
  history.unshift(entry);
  fs.writeFileSync(
    MEMORY_FILES.researchHistory,
    JSON.stringify(history.slice(0, 50), null, 2),
    "utf8"
  );
}

export function writeLatestBrief(brief: SeoChangeBrief): void {
  ensureDir();
  fs.writeFileSync(
    MEMORY_FILES.latestBrief,
    JSON.stringify(brief, null, 2),
    "utf8"
  );
}

export function readLatestBrief(): SeoChangeBrief | null {
  try {
    return JSON.parse(
      fs.readFileSync(MEMORY_FILES.latestBrief, "utf8")
    ) as SeoChangeBrief;
  } catch {
    return null;
  }
}

export function fingerprintFinding(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 160);
}
