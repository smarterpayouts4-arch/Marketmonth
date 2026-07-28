import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadZynavaFixture } from "./load-zynava-fixture";

describe("loadZynavaFixture", () => {
  it("loads Zynava brand profile from checked-in CSV", () => {
    const fixture = loadZynavaFixture();
    assert.equal(fixture.brandProfile.businessName, "Zynava");
    assert.match(fixture.brandProfile.website, /zynava\.com/i);
    assert.ok(fixture.strategyPreview);
    assert.match(
      fixture.strategyPreview!.strategyThesis.headline,
      /Zynava/i
    );
    assert.ok(
      fixture.brandProfile.socialProfiles.some(
        (s) => s.platform === "facebook" && s.status === "present"
      )
    );
    assert.ok(fixture.brandProfile.competitors.length > 0);
    const evidenceRows = fixture.rows.filter((r) => r.record_type === "evidence");
    assert.ok(evidenceRows.length >= 10);
    assert.ok(evidenceRows.some((r) => r.field === "contactEmail"));
    assert.ok(evidenceRows.some((r) => r.field === "legalName"));
    assert.ok(
      (fixture.brandProfile.catalogProducts?.length ?? 0) >= 4,
      "fixture should include first-class catalogProducts"
    );
    assert.ok(
      fixture.brandProfile.catalogProducts.every(
        (p) =>
          !/\b(search|builder|advisor|tool|engine|explorer|quiz)\b/i.test(
            p.name
          )
      ),
      "catalogProducts must not include platform tools"
    );
    assert.deepEqual(fixture.brandProfile.products, [
      "Supplement search",
      "Price comparison",
      "Supplement plan builder",
      "AI supplement advisor",
    ]);
    assert.ok(
      fixture.brandProfile.seoSummary.contentOpportunities.some((t) =>
        /Magnesium|Vitamin|Omega|Zinc/i.test(t)
      )
    );
    assert.ok(evidenceRows.some((r) => r.field === "catalogProduct"));
    assert.ok(evidenceRows.some((r) => r.field === "faq"));
  });
});
