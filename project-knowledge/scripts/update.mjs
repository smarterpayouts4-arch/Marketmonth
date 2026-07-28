#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildGeneratedContents, normalizeText, repoRoot } from "./lib/scan.mjs";

const root = repoRoot();
const { files, bundle } = buildGeneratedContents(root);

for (const [rel, content] of Object.entries(files)) {
  const full = path.join(root, "project-knowledge", "generated", rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, normalizeText(content), "utf8");
}

// Clear legacy flat generated files if present (pre-layout migration)
const legacy = [
  "ROUTE_MAP.md",
  "API_MAP.md",
  "ENV_MAP.md",
  "FILE_OWNERSHIP.md",
  "manifest.json",
  "docs-index.json",
  "STRUCTURE_WARNINGS.md",
];
const genRoot = path.join(root, "project-knowledge", "generated");
for (const name of legacy) {
  const p = path.join(genRoot, name);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    fs.unlinkSync(p);
  }
}

console.error(
  `knowledge:update OK — routes=${bundle.routes.length} apis=${bundle.apis.length} env=${bundle.envRows.length} unowned=${bundle.ownership.unowned.length}`
);
