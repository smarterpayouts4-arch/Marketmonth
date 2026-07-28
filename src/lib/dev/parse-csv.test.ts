import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertCsvRectangular,
  CsvShapeError,
  csvRowsToObjects,
  parseCsv,
} from "./parse-csv";

describe("parseCsv", () => {
  it("parses quoted commas and escaped quotes", () => {
    const rows = parseCsv('a,b\n"hello, world","say ""hi"""\n');
    assert.deepEqual(rows[0], ["a", "b"]);
    assert.deepEqual(rows[1], ["hello, world", 'say "hi"']);
  });

  it("maps rows to objects when rectangular", () => {
    const objects = csvRowsToObjects(
      parseCsv("record_type,field,value\nbrand_profile,businessName,Zynava\n")
    );
    assert.equal(objects[0].field, "businessName");
    assert.equal(objects[0].value, "Zynava");
  });

  it("accepts valid nine-column discovery rows", () => {
    const header =
      "record_type,field,value,source_url,evidence_type,confidence,source_snippet,notes,retrieved_at";
    const row =
      "brand_profile,businessName,Zynava,https://zynava.com,observed,high,,Development fixture,2026-07-25T00:00:00.000Z";
    const objects = csvRowsToObjects(parseCsv(`${header}\n${row}\n`));
    assert.equal(objects[0].notes, "Development fixture");
    assert.equal(objects[0].retrieved_at, "2026-07-25T00:00:00.000Z");
    assert.equal(objects[0].value, "Zynava");
    assert.equal(objects[0].source_snippet, "");
  });

  it("rejects historical ten-cell rows under nine headers (no silent truncate)", () => {
    const header =
      "record_type,field,value,source_url,evidence_type,confidence,source_snippet,notes,retrieved_at";
    // Original malformed shape: empty snippet + empty notes + note text + date = 10 cells
    const malformed =
      "brand_profile,businessName,Zynava,https://zynava.com,observed,high,,,Development fixture — refresh with npm run export:zynava-fixture,2026-07-25T00:00:00.000Z";
    const grid = parseCsv(`${header}\n${malformed}\n`);
    assert.equal(grid[0].length, 9);
    assert.equal(grid[1].length, 10);
    assert.throws(() => assertCsvRectangular(grid), (err: unknown) => {
      assert.ok(err instanceof CsvShapeError);
      assert.equal(err.rowNumber, 2);
      assert.equal(err.expected, 9);
      assert.equal(err.actual, 10);
      assert.match(err.message, /row 2/);
      assert.match(err.message, /expected 9/);
      assert.match(err.message, /got 10/);
      return true;
    });
    assert.throws(() => csvRowsToObjects(grid), CsvShapeError);
  });
});
