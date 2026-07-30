/**
 * Minimal RFC4180-ish CSV parser (quoted commas/newlines). No new dependency.
 */

export class CsvShapeError extends Error {
  readonly rowNumber: number;
  readonly expected: number;
  readonly actual: number;
  readonly preview: string;

  constructor(args: {
    rowNumber: number;
    expected: number;
    actual: number;
    preview: string;
  }) {
    super(
      `CSV row ${args.rowNumber}: expected ${args.expected} cells, got ${args.actual}. Preview: ${args.preview}`
    );
    this.name = "CsvShapeError";
    this.rowNumber = args.rowNumber;
    this.expected = args.expected;
    this.actual = args.actual;
    this.preview = args.preview;
  }
}

function safePreview(cells: string[], maxLen = 120): string {
  const joined = cells.map((c) => (c.length > 40 ? `${c.slice(0, 37)}…` : c)).join("|");
  return joined.length > maxLen ? `${joined.slice(0, maxLen - 1)}…` : joined;
}

/**
 * Fail closed when any data row cell count ≠ header count.
 * Does not silently truncate or pad.
 */
export function assertCsvRectangular(rows: string[][]): void {
  if (rows.length < 1) return;
  const expected = rows[0].length;
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    if (!cells || cells.every((c) => !c?.trim())) continue;
    if (cells.length !== expected) {
      throw new CsvShapeError({
        rowNumber: i + 1,
        expected,
        actual: cells.length,
        preview: safePreview(cells),
      });
    }
  }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // Skip trailing empty line
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}

/** Serialize rows with RFC4180 quoting (commas / quotes / newlines). */
export function stringifyCsv(rows: string[][]): string {
  return rows
    .map((cells) =>
      cells
        .map((cell) => {
          const v = cell ?? "";
          if (/[",\n\r]/.test(v)) {
            return `"${v.replace(/"/g, '""')}"`;
          }
          return v;
        })
        .join(",")
    )
    .join("\n");
}

/**
 * Header-name mapping. Validates rectangular shape first — never silent truncate.
 */
export function csvRowsToObjects(
  rows: string[][]
): Record<string, string>[] {
  if (rows.length < 2) return [];
  assertCsvRectangular(rows);
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i += 1) {
      obj[headers[i]] = cells[i] ?? "";
    }
    return obj;
  });
}
