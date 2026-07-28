import path from "node:path";

export const SEO_DATA_DIR = path.join(process.cwd(), "data", "seo");

export const MEMORY_FILES = {
  strategyState: path.join(SEO_DATA_DIR, "strategy-state.json"),
  researchHistory: path.join(SEO_DATA_DIR, "research-history.json"),
  decisionHistory: path.join(SEO_DATA_DIR, "decision-history.json"),
  latestBrief: path.join(SEO_DATA_DIR, "latest-brief.json"),
} as const;
