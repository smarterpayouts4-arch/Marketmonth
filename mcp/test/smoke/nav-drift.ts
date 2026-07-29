import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { SEED_DOCS } from "../../../src/lib/project-knowledge/retrieve.js";
import { PROJECT_DOCS } from "../../src/security/docs-registry.js";
import { repoRoot } from "./helpers.js";

/**
 * Single nav contract: MCP allowlist paths exist; PK non-generated MCP paths
 * appear in docs-index; FEATURES + accepted ADRs are MCP-registered; SEED paths exist.
 */
export async function testNavDrift(): Promise<void> {
  const indexPath = path.join(
    repoRoot,
    "project-knowledge/generated/indexes/docs-index.json"
  );
  assert.ok(fs.existsSync(indexPath), "docs-index.json missing — run knowledge:update");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
    documents?: { path?: string }[];
  };
  const indexedPaths = new Set(
    (index.documents ?? [])
      .map((d) => d.path?.replace(/\\/g, "/"))
      .filter((p): p is string => Boolean(p))
  );

  const mcpPaths = [...new Set(Object.values(PROJECT_DOCS).map((p) => p.replace(/\\/g, "/")))];

  for (const rel of mcpPaths) {
    const abs = path.join(repoRoot, rel);
    assert.ok(fs.existsSync(abs), `MCP path missing on disk: ${rel}`);
  }

  for (const rel of mcpPaths) {
    if (!rel.startsWith("project-knowledge/")) continue;
    if (rel.includes("/generated/")) continue;
    // docs-index scans markdown only; JSON ownership/config stay MCP-reachable without index rows
    if (!rel.endsWith(".md")) continue;
    assert.ok(
      indexedPaths.has(rel),
      `MCP path not in docs-index (orphan allowlist entry): ${rel}`
    );
  }

  for (const rel of SEED_DOCS) {
    const norm = rel.replace(/\\/g, "/");
    const abs = path.join(repoRoot, norm);
    assert.ok(fs.existsSync(abs), `SEED_DOCS path missing: ${norm}`);
  }

  const featuresDir = path.join(repoRoot, "project-knowledge/FEATURES");
  const decisionsDir = path.join(repoRoot, "project-knowledge/DECISIONS");
  const mcpPathSet = new Set(mcpPaths);

  for (const name of fs.readdirSync(featuresDir)) {
    if (!name.endsWith(".md")) continue;
    const rel = `project-knowledge/FEATURES/${name}`;
    assert.ok(
      mcpPathSet.has(rel),
      `FEATURES brief not MCP-registered: ${rel}`
    );
  }

  for (const name of fs.readdirSync(decisionsDir)) {
    if (!/^0\d{3}-.+\.md$/.test(name)) continue;
    const rel = `project-knowledge/DECISIONS/${name}`;
    assert.ok(
      mcpPathSet.has(rel),
      `Accepted ADR not MCP-registered: ${rel}`
    );
  }
}
