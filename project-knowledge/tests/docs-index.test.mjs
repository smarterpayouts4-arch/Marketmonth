/**
 * Validates sole docs-index schema enrichment (id, description, kind, generated).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildArtifactBundle,
  docIdFromPath,
} from "../scripts/lib/scan/artifacts.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("docIdFromPath normalizes CURRENT_STATE", () => {
  assert.equal(
    docIdFromPath("project-knowledge/CURRENT_STATE.md"),
    "current-state"
  );
});

test("repo docs-index has enriched fields when present", () => {
  const idxPath = path.join(
    repoRoot,
    "project-knowledge",
    "generated",
    "indexes",
    "docs-index.json"
  );
  if (!fs.existsSync(idxPath)) {
    console.log("skip — docs-index missing (run knowledge:update)");
    return;
  }
  const idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
  assert.equal(idx.schemaVersion, 1);
  assert.ok(Array.isArray(idx.documents));
  const sample = idx.documents.find((d) =>
    d.path.endsWith("CURRENT_STATE.md")
  );
  if (sample && sample.id) {
    assert.equal(sample.id, "current-state");
    assert.ok(typeof sample.description === "string");
    assert.ok(["canonical", "supporting"].includes(sample.kind));
    assert.equal(sample.generated, false);
  }
});

test("buildArtifactBundle emits enriched docs-index from fixture", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mm-docs-idx-"));
  try {
    fs.mkdirSync(path.join(tmp, "src", "app"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "project-knowledge"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "project-knowledge", "CURRENT_STATE.md"),
      `---
title: Current State
authority: canonical
status: active
owner: engineering
---

Verified implementation status and known gaps.
`
    );
    fs.writeFileSync(
      path.join(tmp, "project-knowledge", "ownership-rules.json"),
      JSON.stringify({ schemaVersion: 1, owners: {}, qualifyingFeatureRoots: [] })
    );
    fs.writeFileSync(path.join(tmp, ".env.example"), "FOO=\n");
    const bundle = buildArtifactBundle(tmp);
    const doc = bundle.docsIndex.documents.find((d) =>
      d.path.endsWith("CURRENT_STATE.md")
    );
    assert.ok(doc);
    assert.equal(doc.id, "current-state");
    assert.equal(doc.kind, "canonical");
    assert.equal(doc.generated, false);
    assert.match(doc.description, /Verified implementation/i);
    assert.ok(doc.audience.includes("mcp"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
