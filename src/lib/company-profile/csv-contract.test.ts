import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BrandProfile } from "@/engine/discovery/brand-profile";
import { parseCsv } from "@/lib/dev/parse-csv";

import {
  assertDiscoveryCsvContract,
  assertDiscoveryCsvHeader,
  buildDiscoveryCsvDocument,
  parseCompanyCsv,
  DISCOVERY_CSV_HEADERS,
  DISCOVERY_CSV_SCHEMA_VERSION,
  type DiscoveryCsvRow,
} from "./csv-contract";

const profile: BrandProfile = {
  businessName: "Zynava",
  website: "https://zynava.com",
  description: "AI supplement search",
  audience: "Supplement shoppers",
  products: ["Supplement search"],
  services: ["Price comparison"],
  indexedProducts: [],
  valueProposition: "Compare with clarity",
  brandVoice: "Clear",
  marketingOpportunity: "Help shoppers compare",
  colors: ["#31695A"],
  socialProfiles: [
    {
      platform: "facebook",
      status: "present",
      url: "https://www.facebook.com/zynava",
    },
  ],
  seoSummary: {
    metadataCompleteness: "strong",
    pageSpeedNote: "ok",
    technicalObservations: [],
    contentOpportunities: ["How to compare labels"],
  },
  competitors: [
    {
      name: "category peers",
      reason: "On-site language",
    },
  ],
};

function rowsFromCsv(csv: string): {
  header: string[];
  rows: DiscoveryCsvRow[];
} {
  const grid = parseCsv(csv);
  const header = grid[0];
  const rows: DiscoveryCsvRow[] = grid.slice(1).map((line) => ({
    record_type: line[0] ?? "",
    field: line[1] ?? "",
    value: line[2] ?? "",
    source_url: line[3] ?? "",
    evidence_type: line[4] ?? "",
    confidence: line[5] ?? "",
    source_snippet: line[6] ?? "",
    notes: line[7] ?? "",
    retrieved_at: line[8] ?? "",
  }));
  return { header, rows };
}

describe("buildDiscoveryCsvDocument", () => {
  it("exports social, competitors, and evidence rows", () => {
    const csv = buildDiscoveryCsvDocument({
      profile,
      evidence: [
        {
          id: "e1",
          field: "contactEmail",
          kind: "observed",
          value: "support@zynava.com",
          sourceUrl: "https://zynava.com",
          confidence: "high",
        },
      ],
      crawlMeta: {
        pageCount: 1,
        kinds: ["home"],
        detectedLocations: [
          {
            city: "Tampa",
            region: "FL",
            country: "US",
            sourceUrl: "https://zynava.com",
            confidence: "high",
          },
        ],
      },
      sourceUrl: "https://zynava.com",
      retrievedAt: "2026-07-27T00:00:00.000Z",
    });
    assert.match(csv, /socialProfiles/);
    assert.match(csv, /competitors/);
    assert.match(csv, /indexedProducts/);
    assert.match(csv, /record_type,field,value/);
    assert.match(csv, /"evidence","contactEmail"/);
    assert.match(csv, /"crawl_meta","detectedLocation"/);
    assert.match(csv, /facebook\.com\/zynava/);
  });

  it("emits a CSV that satisfies the discovery column contract", () => {
    const csv = buildDiscoveryCsvDocument({
      profile,
      sourceUrl: "https://zynava.com",
      retrievedAt: "1970-01-01T00:00:00.000Z",
    });
    const { header, rows } = rowsFromCsv(csv);
    assert.deepEqual(assertDiscoveryCsvHeader(header), []);
    const issues = assertDiscoveryCsvContract({ headerCells: header, rows });
    assert.deepEqual(issues, []);
    assert.equal(header.join(","), DISCOVERY_CSV_HEADERS.join(","));
    assert.ok(
      rows.some(
        (r) =>
          r.record_type === "brand_profile" &&
          r.field === "schemaVersion" &&
          r.value === DISCOVERY_CSV_SCHEMA_VERSION
      )
    );
  });

  it("emits detected locations only as crawl_meta, never as a location record", () => {
    const csv = buildDiscoveryCsvDocument({
      profile,
      crawlMeta: {
        pageCount: 1,
        detectedLocations: [
          {
            city: "Tampa",
            region: "FL",
            country: "US",
            sourceUrl: "https://zynava.com",
            confidence: "high",
          },
        ],
      },
      sourceUrl: "https://zynava.com",
      retrievedAt: "1970-01-01T00:00:00.000Z",
    });
    const { rows } = rowsFromCsv(csv);
    const located = rows.filter((r) => r.field === "detectedLocation");
    assert.equal(located.length, 1, "location must not be emitted twice");
    assert.equal(located[0].record_type, "crawl_meta");
  });
});

describe("parseCompanyCsv", () => {
  it("round-trips a serialized document and rejects v1", () => {
    const csv = buildDiscoveryCsvDocument({
      profile,
      evidence: [
        {
          id: "e1",
          field: "contactEmail",
          kind: "observed",
          value: "support@zynava.com",
          sourceUrl: "https://zynava.com",
          confidence: "high",
        },
      ],
      sourceUrl: "https://zynava.com",
      retrievedAt: "1970-01-01T00:00:00.000Z",
    });

    const projection = parseCompanyCsv(csv);
    assert.equal(projection.businessName, "Zynava");
    assert.ok(projection.evidence.some((e) => e.field === "contactEmail"));

    const v1 = csv.replace(
      `"schemaVersion","${DISCOVERY_CSV_SCHEMA_VERSION}"`,
      '"schemaVersion","1.1"'
    );
    assert.throws(() => parseCompanyCsv(v1), /schemaVersion/i);
  });

  it("does not promote brand_profile rows into citable evidence", () => {
    const csv = buildDiscoveryCsvDocument({
      profile,
      sourceUrl: "https://zynava.com",
      retrievedAt: "1970-01-01T00:00:00.000Z",
    });
    const projection = parseCompanyCsv(csv);
    for (const ev of projection.evidence) {
      assert.ok(
        ev.recordType === "evidence" || ev.recordType === "faq",
        `unexpected citable record type: ${ev.recordType}`
      );
    }
  });
});
