import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  retrieveProjectKnowledge,
  SEED_DOCS,
} from "@/lib/project-knowledge/retrieve";

describe("project-knowledge retrieve", () => {
  it("seeds include CONTENT_BRAIN doctrine", () => {
    assert.ok(
      SEED_DOCS.some((p) => p.endsWith("CONTENT_BRAIN.md")),
      "CONTENT_BRAIN.md must be in SEED_DOCS"
    );
  });

  it("six content directions query retrieves CONTENT_BRAIN.md", () => {
    const chunks = retrieveProjectKnowledge(
      "How do six content directions and Brand Core work in Content Brain?"
    );
    assert.ok(chunks.length > 0, "expected retrieval hits");
    assert.ok(
      chunks.some((c) => c.path.replace(/\\/g, "/").includes("CONTENT_BRAIN.md")),
      `expected CONTENT_BRAIN.md in sources, got: ${chunks.map((c) => c.path).join(", ")}`
    );
  });

  it("never retrieves Refrence folder or reference-library paths", () => {
    const chunks = retrieveProjectKnowledge("architecture reference folder");
    for (const c of chunks) {
      const p = c.path.replace(/\\/g, "/");
      assert.doesNotMatch(p, /Refrence folder/);
      assert.doesNotMatch(p, /reference-library/);
    }
  });
});
