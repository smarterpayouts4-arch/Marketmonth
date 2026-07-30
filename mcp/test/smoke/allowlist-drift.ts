import assert from "node:assert/strict";

import { PROJECT_DOCS } from "../../src/security/docs-registry.js";

/**
 * Allowlist integrity: unique ids, no path traversal, required Content Brain docs.
 * Zod enum is derived from PROJECT_DOCS keys in reg-context — keep single source.
 */
export async function testAllowlistDrift(): Promise<void> {
  const registryIds = Object.keys(PROJECT_DOCS);
  const unique = new Set(registryIds);
  assert.equal(
    unique.size,
    registryIds.length,
    "duplicate MCP document ids in PROJECT_DOCS"
  );

  assert.ok(
    "contentBrain" in PROJECT_DOCS,
    "contentBrain must be allowlisted"
  );
  assert.ok(
    "domainGlossary" in PROJECT_DOCS,
    "domainGlossary must be allowlisted"
  );
  assert.ok(
    "ideaLabTopicStrategy" in PROJECT_DOCS,
    "ideaLabTopicStrategy must be allowlisted"
  );
  assert.ok(
    "discoveryCsvQuality" in PROJECT_DOCS,
    "discoveryCsvQuality must be allowlisted"
  );
  assert.ok("adr0001" in PROJECT_DOCS, "adr0001 must be allowlisted");
  assert.ok("adr0002" in PROJECT_DOCS, "adr0002 must be allowlisted");
  assert.ok("adr0003" in PROJECT_DOCS, "adr0003 must be allowlisted");
  assert.ok("adr0004" in PROJECT_DOCS, "adr0004 must be allowlisted");
  assert.ok("adr0005" in PROJECT_DOCS, "adr0005 must be allowlisted");
  assert.ok(
    "agentBootstrap" in PROJECT_DOCS,
    "agentBootstrap must be allowlisted"
  );

  for (const [id, rel] of Object.entries(PROJECT_DOCS)) {
    assert.ok(!rel.includes(".."), `${id} path traversal`);
    assert.ok(!rel.includes("Refrence folder"), `${id} must not be Refrence`);
    assert.ok(
      !rel.includes("reference-library"),
      `${id} must not be reference-library`
    );
    assert.ok(!rel.includes(".env"), `${id} must not be env`);
  }
}
