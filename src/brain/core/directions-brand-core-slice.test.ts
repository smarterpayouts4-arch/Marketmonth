import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";

import { resolveBrandCoreIdentity } from "./brand-core-identity";
import { compileBrandCore } from "./compile-brand-core";
import {
  stableSliceId,
  toDirectionsBrandCoreSlice,
} from "./directions-brand-core-slice";

describe("toDirectionsBrandCoreSlice", () => {
  it("builds stable hash IDs from Zynava Brand Core (not positional)", () => {
    const text = readFileSync(
      path.join(process.cwd(), "data/fixtures/zynava-discovery.csv"),
      "utf8"
    );
    const context = parseFixtureCsv(text);
    assert.ok(context);
    const core = compileBrandCore(context);
    const identity = resolveBrandCoreIdentity(core);
    const slice = toDirectionsBrandCoreSlice(core, identity);

    assert.equal(slice.company.name, "Zynava");
    assert.equal(slice.company.id, identity.company_id);
    assert.equal(slice.brand_core_hash, identity.brand_core_hash);

    assert.equal(slice.claims.length, 1);
    assert.equal(slice.claims[0].wording, core.positioning);
    assert.equal(
      slice.claims[0].claim_id,
      stableSliceId("claim", core.positioning)
    );
    assert.deepEqual(slice.claims[0].allowed_evidence_ids, []);

    assert.ok(slice.offers.length >= 1);
    for (const offer of slice.offers) {
      assert.ok(offer.offer_id.startsWith("offer_"));
      assert.equal(offer.offer_id, stableSliceId("offer", offer.name));
    }

    assert.ok(slice.audiences[0].problems.length >= 1);
    for (const p of slice.audiences[0].problems) {
      assert.ok(p.problem_id.startsWith("problem_"));
    }

    // Proofs are evidence, not auto-claims
    assert.equal(slice.evidence.length, core.proof_library.length);
    assert.ok(
      slice.evidence.every((e) =>
        core.proof_library.some((p) => p.proof_id === e.evidence_id)
      )
    );

    // Recompile → same IDs
    const again = toDirectionsBrandCoreSlice(core, identity);
    assert.equal(again.claims[0].claim_id, slice.claims[0].claim_id);
    assert.deepEqual(
      again.offers.map((o) => o.offer_id),
      slice.offers.map((o) => o.offer_id)
    );
  });

  it("does not invent claim_1 style positional ids", () => {
    const id = stableSliceId("claim", "Clearer marketing decisions");
    assert.notEqual(id, "claim_1");
    assert.match(id, /^claim_[a-f0-9]{12}$/);
  });
});
