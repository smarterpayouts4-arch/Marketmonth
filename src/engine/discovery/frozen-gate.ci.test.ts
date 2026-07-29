/**
 * R10 — Frozen Zynava Layer-1 → gate Strong in CI when corpus is present.
 * Skips cleanly when frozen snapshots are absent (fresh clone).
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";

import { companyArtifactPaths } from "@/lib/company-profile/company-paths";

import { evaluateDiscoveryAcceptance } from "./acceptance-gate";
import { buildDiscoveryProfileFromCorpus } from "./build-profile-from-corpus";
import {
  corpusFromFrozenPages,
  loadFrozenCorpus,
} from "./reconcile/frozen-corpus";

describe("frozen Zynava CI gate", () => {
  it("builds profile from frozen Layer-1 and reaches approval_ready", async () => {
    const paths = companyArtifactPaths("zynava.com");
    if (!existsSync(paths.frozenCorpusDir)) {
      return;
    }
    const frozen = loadFrozenCorpus(paths.frozenCorpusDir);
    if (!("pages" in frozen) || frozen.pages.length < 3) {
      return;
    }

    const corpus = corpusFromFrozenPages(frozen.pages);
    const build = await buildDiscoveryProfileFromCorpus({
      corpus,
      website: "https://zynava.com",
      derivedSource: "rules",
    });
    const gate = evaluateDiscoveryAcceptance({
      profile: build.profile,
      evidence: build.evidence,
      corpus,
    });

    assert.match(build.profile.businessName.toLowerCase(), /zynava/);
    assert.ok(
      !gate.failures.includes("identity"),
      `identity failure: ${gate.failures.join(", ")}`
    );
    assert.ok(
      (build.profile.indexedProducts?.length ?? 0) >= 3,
      "frozen catalog must include multiple SKUs"
    );
    assert.ok(
      build.evidence.some((e) => e.field === "faq"),
      "frozen evidence must include structured FAQ rows"
    );
    assert.equal(
      gate.approvalReady,
      true,
      `expected approval_ready; status=${gate.status}; failures=${gate.failures.join(", ")}; diagnostics=${gate.diagnostics.slice(0, 8).join(" | ")}`
    );
  });
});
