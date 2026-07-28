import fs from "node:fs";

import type { FindingStatus } from "../contracts/research-finding";
import { MEMORY_FILES, SEO_DATA_DIR } from "./paths";

export type DecisionRecord = {
  recommendationId: string;
  findingFingerprint: string;
  status: FindingStatus;
  decidedAt: string;
  note?: string;
};

function ensureDir() {
  fs.mkdirSync(SEO_DATA_DIR, { recursive: true });
}

export function readDecisionHistory(): DecisionRecord[] {
  try {
    const raw = fs.readFileSync(MEMORY_FILES.decisionHistory, "utf8");
    const parsed = JSON.parse(raw) as DecisionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDecision(record: DecisionRecord): void {
  ensureDir();
  const history = readDecisionHistory().filter(
    (d) => d.recommendationId !== record.recommendationId
  );
  history.unshift(record);
  fs.writeFileSync(
    MEMORY_FILES.decisionHistory,
    JSON.stringify(history.slice(0, 200), null, 2),
    "utf8"
  );
}

export function priorDecisionForFingerprint(
  fingerprint: string
): DecisionRecord | undefined {
  return readDecisionHistory().find((d) => d.findingFingerprint === fingerprint);
}
