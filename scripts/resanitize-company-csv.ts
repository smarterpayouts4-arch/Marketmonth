/**
 * Safe re-sanitize of stored company CSV value cells (camel-glue repair).
 *
 * Recovery path:
 *   dry-run → diff → backup+checksum → rewrite → schema checks →
 *   row-count compare → evidence-ID stability → abort+restore on mismatch
 *
 * Usage:
 *   npx tsx scripts/resanitize-company-csv.ts zynava.com --dry-run
 *   npx tsx scripts/resanitize-company-csv.ts zynava.com --apply
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { sanitizeEvidenceValue } from "../src/brain/evaluation/evidence/sanitize";
import {
  assertCsvRectangular,
  parseCsv,
  stringifyCsv,
} from "../src/lib/dev/parse-csv";

type Cli = {
  companyId: string;
  apply: boolean;
  files: string[];
};

function parseCli(argv: string[]): Cli {
  const args = argv.slice(2);
  let companyId = "zynava.com";
  let apply = false;
  for (const a of args) {
    if (a === "--apply") apply = true;
    else if (a === "--dry-run") apply = false;
    else if (!a.startsWith("-")) companyId = a;
  }
  const base = path.join(process.cwd(), "data", "companies", companyId);
  const files = ["approved.csv", "draft.csv"]
    .map((f) => path.join(base, f))
    .filter((f) => existsSync(f));
  return { companyId, apply, files };
}

function checksum(buf: string): string {
  return createHash("sha256").update(buf).digest("hex");
}

const TEXT_COL_HINTS = /value|snippet|text|summary|content/i;
const LOCKED_COL_HINTS =
  /^(id|evidence_id|proof_id|url|source_url|classification|confidence|field|type|record_type|company)/i;

function resanitizeFile(
  filePath: string,
  apply: boolean
): {
  changedCells: number;
  rowCountBefore: number;
  rowCountAfter: number;
  idsBefore: string[];
  idsAfter: string[];
  diffs: Array<{ row: number; col: string; before: string; after: string }>;
  aborted?: string;
} {
  const original = readFileSync(filePath, "utf8");
  let grid: string[][];
  try {
    grid = parseCsv(original);
    assertCsvRectangular(grid);
  } catch (err) {
    return {
      changedCells: 0,
      rowCountBefore: 0,
      rowCountAfter: 0,
      idsBefore: [],
      idsAfter: [],
      diffs: [],
      aborted: `parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (grid.length === 0) {
    return {
      changedCells: 0,
      rowCountBefore: 0,
      rowCountAfter: 0,
      idsBefore: [],
      idsAfter: [],
      diffs: [],
    };
  }

  const header = grid[0] ?? [];
  const idCol = header.findIndex((h) => /^id$/i.test(h.trim()));
  const textCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => TEXT_COL_HINTS.test(h) && !LOCKED_COL_HINTS.test(h.trim()));

  const diffs: Array<{
    row: number;
    col: string;
    before: string;
    after: string;
  }> = [];
  const nextGrid = grid.map((row) => [...row]);
  const idsBefore: string[] = [];
  const idsAfter: string[] = [];

  for (let r = 1; r < nextGrid.length; r++) {
    const fields = nextGrid[r]!;
    if (idCol >= 0 && fields[idCol]) idsBefore.push(fields[idCol]!);
    for (const { h, i } of textCols) {
      const before = fields[i] ?? "";
      if (!before || before.length < 8) continue;
      if (!/[a-z][A-Z]|[A-Z]\d*[A-Z][a-z]|[A-Z]{2,}[A-Z][a-z]/.test(before)) {
        continue;
      }
      const cleaned = sanitizeEvidenceValue(before);
      if (!cleaned || cleaned === before) continue;
      if (cleaned.length < before.length * 0.7) continue;
      fields[i] = cleaned;
      diffs.push({
        row: r + 1,
        col: h,
        before: before.slice(0, 120),
        after: cleaned.slice(0, 120),
      });
    }
    if (idCol >= 0 && fields[idCol]) idsAfter.push(fields[idCol]!);
    // Locked columns unchanged vs original grid
    for (let i = 0; i < header.length; i++) {
      if (textCols.some((t) => t.i === i)) continue;
      if ((grid[r]?.[i] ?? "") !== (fields[i] ?? "")) {
        return {
          changedCells: diffs.length,
          rowCountBefore: grid.length,
          rowCountAfter: 0,
          idsBefore,
          idsAfter,
          diffs,
          aborted: `row ${r + 1} locked column ${header[i]} mutated`,
        };
      }
    }
  }

  const rowCountBefore = grid.length;
  const rowCountAfter = nextGrid.length;
  if (rowCountBefore !== rowCountAfter) {
    return {
      changedCells: diffs.length,
      rowCountBefore,
      rowCountAfter,
      idsBefore,
      idsAfter,
      diffs,
      aborted: "row count mismatch",
    };
  }
  if (idsBefore.join("|") !== idsAfter.join("|")) {
    return {
      changedCells: diffs.length,
      rowCountBefore,
      rowCountAfter,
      idsBefore,
      idsAfter,
      diffs,
      aborted: "evidence/id column instability",
    };
  }

  try {
    assertCsvRectangular(nextGrid);
  } catch (err) {
    return {
      changedCells: diffs.length,
      rowCountBefore,
      rowCountAfter,
      idsBefore,
      idsAfter,
      diffs,
      aborted: `rectangular check failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (apply && diffs.length > 0) {
    const backupDir = path.join(path.dirname(filePath), ".backup");
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      backupDir,
      `${path.basename(filePath)}.${stamp}.bak`
    );
    copyFileSync(filePath, backupPath);
    writeFileSync(`${backupPath}.sha256`, checksum(original));
    try {
      const serialized = stringifyCsv(nextGrid);
      writeFileSync(filePath, serialized.endsWith("\n") ? serialized : `${serialized}\n`);
      const afterGrid = parseCsv(readFileSync(filePath, "utf8"));
      assertCsvRectangular(afterGrid);
      if (afterGrid.length !== rowCountBefore) {
        copyFileSync(backupPath, filePath);
        return {
          changedCells: diffs.length,
          rowCountBefore,
          rowCountAfter: afterGrid.length,
          idsBefore,
          idsAfter,
          diffs,
          aborted: "post-write row count failed; restored backup",
        };
      }
    } catch (err) {
      copyFileSync(backupPath, filePath);
      return {
        changedCells: diffs.length,
        rowCountBefore,
        rowCountAfter,
        idsBefore,
        idsAfter,
        diffs,
        aborted: `write failed, restored: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return {
    changedCells: diffs.length,
    rowCountBefore,
    rowCountAfter,
    idsBefore,
    idsAfter,
    diffs,
  };
}

function main() {
  const cli = parseCli(process.argv);
  if (!cli.files.length) {
    console.error(`No CSV files found for ${cli.companyId}`);
    process.exit(1);
  }
  console.log(
    `resanitize ${cli.companyId} mode=${cli.apply ? "APPLY" : "DRY-RUN"}`
  );
  let failed = false;
  for (const file of cli.files) {
    console.log(`\n--- ${file} ---`);
    const result = resanitizeFile(file, cli.apply);
    console.log(`changed cells: ${result.changedCells}`);
    console.log(`rows: ${result.rowCountBefore} → ${result.rowCountAfter}`);
    if (result.aborted) {
      console.error(`ABORTED: ${result.aborted}`);
      failed = true;
      continue;
    }
    for (const d of result.diffs.slice(0, 20)) {
      console.log(`  row ${d.row} ${d.col}:`);
      console.log(`    before: ${d.before}`);
      console.log(`    after:  ${d.after}`);
    }
    if (result.diffs.length > 20) {
      console.log(`  … +${result.diffs.length - 20} more`);
    }
  }
  if (failed) process.exit(1);
  if (!cli.apply) {
    console.log("\nDry-run only. Re-run with --apply to write after review.");
  }
}

main();
