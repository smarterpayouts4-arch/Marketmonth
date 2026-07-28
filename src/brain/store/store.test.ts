import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";

describe("brain JSON runtime store", () => {
  let prevCwd: string;
  let tempRoot: string;

  before(() => {
    prevCwd = process.cwd();
    tempRoot = mkdtempSync(path.join(tmpdir(), "mm-store-"));
    process.chdir(tempRoot);
  });

  after(() => {
    process.chdir(prevCwd);
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("round-trips a handoff record under data/runtime", async () => {
    const { saveHandoffRecord, loadHandoffRecord } = await import(
      "./handoff-store"
    );

    const variation = (i: number) => ({
      id: `v${i}`,
      angle: "faq" as const,
      punchline: `P${i}`,
      subheading: "S",
      brief: "B",
      strategicPurpose: "SP",
      evidenceIds: [] as string[],
      assumptionIds: [] as string[],
      confidence: "medium" as const,
      safety: { status: "safe" as const, reasons: [] as string[] },
    });
    const handoff: ContentDirectionsHandoffV1 = {
      version: 1,
      generationId: "tgen_test_store",
      contextVersion: "ctx_1",
      brand: { name: "Zynava", domain: "zynava.com" },
      mode: "automatic",
      masterTopic: {
        id: "m1",
        source: "automatic",
        punchline: "Master",
        subheading: "Sub",
        rationale: "Why",
        evidenceIds: [],
        confidence: "high",
        safety: { status: "safe", reasons: [] },
      },
      variations: [
        variation(0),
        variation(1),
        variation(2),
        variation(3),
        variation(4),
        variation(5),
      ],
      selectedVariationId: "v0",
      selectedAt: new Date().toISOString(),
    };

    await saveHandoffRecord(handoff);
    const loaded = loadHandoffRecord("tgen_test_store");
    assert.ok(loaded);
    assert.equal(loaded.selectedVariationId, "v0");
    assert.equal(loaded.brand.domain, "zynava.com");
  });
});
