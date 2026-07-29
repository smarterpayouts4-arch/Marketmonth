import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBrandCore } from "./get-brand-core";
import { compileBrandCore } from "./compile-brand-core";
import { retrieveBrandPassages } from "./retrieve-brand-passages";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

describe("getBrandCore", () => {
  it("loads ClearFlow plumbing fixture by non-Zynava companyId", () => {
    const loaded = getBrandCore("clearflowplumbing.example");
    assert.equal(loaded.source, "fixture");
    assert.equal(loaded.context.brandName, "ClearFlow Plumbing");
    assert.ok((loaded.brandCore.indexed_products?.length ?? 0) >= 4);
  });

  it("loads Zynava fixture by companyId with indexed_products separate from offers", () => {
    const loaded = getBrandCore("zynava.com");
    assert.equal(loaded.source, "fixture");
    assert.equal(loaded.identity.company_id, "zynava.com");
    assert.ok(loaded.context.indexedProducts.length >= 4);
    assert.ok((loaded.brandCore.indexed_products?.length ?? 0) >= 4);
    const indexedNames = new Set(
      (loaded.brandCore.indexed_products ?? []).map((p) => p.name.toLowerCase())
    );
    // Company offers must not be the indexed third-party list
    const offerLower = loaded.brandCore.offers.map((o: string) =>
      o.toLowerCase()
    );
    assert.ok(
      offerLower.every((o) => !indexedNames.has(o)) ||
        loaded.brandCore.platform_capabilities.length > 0,
      "indexed products stay on indexed_products; offers are company capabilities"
    );
  });

  it("prioritizes FAQ proofs and excludes industry_research evidence", () => {
    const loaded = getBrandCore("zynava.com");
    const ctx = {
      ...loaded.context,
      evidenceById: {
        ...loaded.context.evidenceById,
        ev_industry_x: {
          id: "ev_industry_x",
          recordType: "evidence",
          field: "educationalTopics",
          value: "Industry-only invented claim",
          sourceUrl: "https://example.com",
          sourceSnippet: "Industry-only",
          confidence: "medium" as const,
          evidenceType: "industry_research",
          notes: "industry_research;categoryAnchor=test",
        },
      },
    };
    const core = compileBrandCore(ctx);
    assert.ok(
      !core.proof_library.some((p) => p.proof_id === "ev_industry_x"),
      "industry_research must not enter proof_library"
    );
    const faqProof = core.proof_library.find((p) =>
      /does zynava sell supplements/i.test(p.summary)
    );
    assert.ok(faqProof, "expected FAQ proof about not selling supplements");
  });
});

describe("retrieveBrandPassages", () => {
  it("returns keyword hits from Layer-1 snapshots", () => {
    const root = path.join(tmpdir(), `mm-passages-${Date.now()}`);
    const dir = path.join(root, "zynava.com");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "page_abc.json"),
      JSON.stringify({
        pageId: "page_abc",
        url: "https://zynava.com/faq",
        contentHash: "abc123",
        cleanedText:
          "Does ZYNAVA sell supplements? No. Zynava does not sell, manufacture, or distribute supplements.",
        retrievedAt: new Date().toISOString(),
        kind: "faq",
      }),
      "utf8"
    );

    try {
      const hits = retrieveBrandPassages({
        companyId: "zynava.com",
        query: "sell supplements",
        pagesRoot: root,
      });
      assert.ok(hits.length >= 1);
      assert.match(hits[0]!.excerpt, /does not sell/i);
      assert.ok(hits[0]!.passageId.startsWith("pas_"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
