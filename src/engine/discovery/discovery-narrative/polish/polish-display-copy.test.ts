import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { parseCompanyCsv } from "@/lib/company-profile/csv-contract";
import { toCardRows } from "@/lib/discovery/card-copy";
import { socialDiscoveryProfileSchema } from "@/lib/discovery/discovery-narrative.schema";

import { buildDiscoveryNarrative } from "../index";
import {
  __testables,
  isCopyPolishEnabled,
  polishDiscoveryDisplayCopy,
} from "./polish-display-copy";

const PROFILE = buildDiscoveryNarrative({
  projection: parseCompanyCsv(
    readFileSync(
      path.join(process.cwd(), "data/companies/zynava.com/approved.csv"),
      "utf8"
    )
  ),
});

const ORIGINAL_ENV = {
  key: process.env.OPENAI_API_KEY,
  provider: process.env.DISCOVERY_COPY_POLISH_PROVIDER,
};

function restoreEnv(): void {
  if (ORIGINAL_ENV.key === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ORIGINAL_ENV.key;
  if (ORIGINAL_ENV.provider === undefined) {
    delete process.env.DISCOVERY_COPY_POLISH_PROVIDER;
  } else {
    process.env.DISCOVERY_COPY_POLISH_PROVIDER = ORIGINAL_ENV.provider;
  }
}

afterEach(restoreEnv);

describe("isCopyPolishEnabled", () => {
  it("is on when an API key is present", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    delete process.env.DISCOVERY_COPY_POLISH_PROVIDER;
    assert.equal(isCopyPolishEnabled(), true);
  });

  it("is off without an API key", () => {
    delete process.env.OPENAI_API_KEY;
    assert.equal(isCopyPolishEnabled(), false);
  });

  it("is off when forced to the deterministic provider", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.DISCOVERY_COPY_POLISH_PROVIDER = "deterministic-only";
    assert.equal(isCopyPolishEnabled(), false);
  });
});

describe("polishDiscoveryDisplayCopy", () => {
  it("returns the profile untouched when disabled", async () => {
    process.env.DISCOVERY_COPY_POLISH_PROVIDER = "deterministic-only";
    const { profile, report } = await polishDiscoveryDisplayCopy(PROFILE);

    assert.equal(report.enabled, false);
    assert.equal(report.polishedCount, 0);
    assert.deepEqual(profile, PROFILE);
    for (const section of profile.sections) {
      for (const bullet of section.bullets) {
        assert.equal(bullet.display, undefined);
      }
    }
  });

  it("still yields a schema-valid card with readable rows when disabled", async () => {
    process.env.DISCOVERY_COPY_POLISH_PROVIDER = "deterministic-only";
    const { profile } = await polishDiscoveryDisplayCopy(PROFILE);

    assert.doesNotThrow(() => socialDiscoveryProfileSchema.parse(profile));
    for (const section of profile.sections) {
      const rows = toCardRows(section);
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.ok(row.title.trim().length > 0);
        assert.ok(row.summary.trim().length > 0);
      }
    }
  });

  it("reports every card row as a polish candidate", async () => {
    process.env.DISCOVERY_COPY_POLISH_PROVIDER = "deterministic-only";
    const { report } = await polishDiscoveryDisplayCopy(PROFILE);
    const expected = PROFILE.sections.reduce(
      (total, section) => total + Math.min(section.bullets.length, 3),
      0
    );
    assert.equal(report.candidateCount, expected);
  });
});

describe("novelProperNouns", () => {
  const { novelProperNouns } = __testables;
  const source =
    "ZYNAVA tools and offerings support magnesium glycinate, vitamin B12, and vitamin D3.";

  it("does not flag an ordinary word that opens a title or clause", () => {
    for (const candidate of [
      "Supports specific supplement types — ZYNAVA tools support magnesium glycinate.",
      "Answers questions during uncertainty — ZYNAVA answers the questions that appear.",
      "Owns confident decisions. Recognition grows around one idea.",
    ]) {
      assert.deepEqual(novelProperNouns(candidate, source, ["ZYNAVA"]), []);
    }
  });

  it("flags an invented entity used mid-phrase", () => {
    assert.deepEqual(
      novelProperNouns(
        "Verified pricing — ZYNAVA partners with Wellnest for verified pricing.",
        source,
        ["ZYNAVA"]
      ),
      ["Wellnest"]
    );
  });

  it("treats an unspaced dash as a phrase boundary", () => {
    assert.deepEqual(
      novelProperNouns("Trust signals—Independence and transparency.", source, [
        "ZYNAVA",
      ]),
      []
    );
  });

  it("does not flag a common word missing from a short source blob", () => {
    assert.deepEqual(
      novelProperNouns(
        "Supported supplement options — The tools and offerings support magnesium glycinate.",
        "Its tools and offerings support magnesium glycinate, vitamin b12.",
        ["ZYNAVA"]
      ),
      []
    );
  });

  it("allows the business name anywhere", () => {
    assert.deepEqual(
      novelProperNouns("Clear positioning from ZYNAVA today.", source, ["ZYNAVA"]),
      []
    );
  });
});

describe("display copy application", () => {
  it("overrides only the row wording, never the claim or its evidence", () => {
    const section = PROFILE.sections[0];
    const bullet = section.bullets[0]!;
    const display = {
      title: "Preference-based matching",
      summary: "Shoppers choose by ingredient, form, and budget.",
    };
    const polishedSection = {
      ...section,
      bullets: [{ ...bullet, display }, ...section.bullets.slice(1)],
    } as typeof section;

    const rows = toCardRows(polishedSection);
    assert.equal(rows[0]?.title, display.title);
    assert.equal(rows[0]?.summary, display.summary);
    assert.equal(rows[0]?.kind, bullet.classification);
    assert.equal(polishedSection.bullets[0]?.text, bullet.text);
    assert.deepEqual(polishedSection.bullets[0]?.evidence, bullet.evidence);
  });

  it("keeps deterministic titles distinct from a polished title", () => {
    const section = PROFILE.sections[0];
    // Force a collision: polish row 1 with the title row 2 would otherwise take.
    const usurped = toCardRows(section)[1]!.title;
    const polishedSection = {
      ...section,
      bullets: [
        {
          ...section.bullets[0]!,
          display: { title: usurped, summary: "A grounded summary line." },
        },
        ...section.bullets.slice(1),
      ],
    } as typeof section;

    const titles = toCardRows(polishedSection).map((r) => r.title);
    assert.equal(new Set(titles).size, titles.length);
  });
});
