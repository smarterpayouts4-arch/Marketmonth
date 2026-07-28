import { createHash } from "node:crypto";

import { assertCsvRectangular, parseCsv } from "@/lib/dev/parse-csv";

import { toEvidence } from "../evidence";
import type { ContentBrainContext, ContentEvidence } from "../types";

type CsvRow = {
  record_type: string;
  field: string;
  value: string;
  source_url: string;
  evidence_type?: string;
  confidence?: string;
  source_snippet?: string;
  notes?: string;
  retrieved_at?: string;
};

/** Pure CSV → context (no FS). Safe for tests and server loaders. */
export function parseFixtureCsv(text: string): ContentBrainContext | null {
  const grid = parseCsv(text);
  if (grid.length < 2) return null;
  assertCsvRectangular(grid);

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const rows: CsvRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const line = grid[r];
    if (!line || line.every((c) => !c?.trim())) continue;
    rows.push({
      record_type: cell(line, idx("record_type")),
      field: cell(line, idx("field")),
      value: cell(line, idx("value")),
      source_url: cell(line, idx("source_url")),
      evidence_type: cell(line, idx("evidence_type")),
      confidence: cell(line, idx("confidence")),
      source_snippet: cell(line, idx("source_snippet")),
      notes: cell(line, idx("notes")),
      retrieved_at: cell(line, idx("retrieved_at")),
    });
  }

  const profile = new Map<string, string>();
  const evidenceById: Record<string, ContentEvidence> = {};

  for (const row of rows) {
    if (row.record_type === "brand_profile") {
      profile.set(row.field, row.value);
    }
    if (row.record_type && row.field) {
      const ev = toEvidence({
        recordType: row.record_type,
        field: row.field,
        value: row.value,
        sourceUrl: row.source_url,
        sourceSnippet: row.source_snippet,
        confidence: row.confidence,
        evidenceType: row.evidence_type,
        notes: row.notes,
      });
      evidenceById[ev.id] = ev;
    }
  }

  const brandName = profile.get("businessName")?.trim();
  const website = profile.get("website")?.trim();
  if (!brandName || !website) return null;

  let domain = "";
  try {
    domain = new URL(website).hostname.replace(/^www\./, "");
  } catch {
    domain = website.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }

  const contextVersion = createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 16);

  return {
    brandName,
    domain,
    website,
    description: profile.get("description")?.trim(),
    audience: profile.get("audience")?.trim(),
    products: parseJsonStringArray(profile.get("products")),
    services: parseJsonStringArray(profile.get("services")),
    catalogProducts: parseCatalogProducts(
      profile.get("catalogProducts"),
      evidenceById
    ),
    valueProposition: profile.get("valueProposition")?.trim(),
    brandVoice: profile.get("brandVoice")?.trim(),
    marketingOpportunity: profile.get("marketingOpportunity")?.trim(),
    contentOpportunities: parseJsonStringArray(
      profile.get("seo.contentOpportunities")
    ),
    evidenceById,
    contextVersion,
    source: "fixture",
  };
}

function cell(line: string[], i: number): string {
  if (i < 0) return "";
  return (line[i] ?? "").trim();
}

function parseJsonStringArray(raw?: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function parseCatalogProducts(
  raw: string | undefined,
  evidenceById: Record<string, ContentEvidence>
): import("../types").ContentCatalogProduct[] {
  const fromField: import("../types").ContentCatalogProduct[] = [];
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            typeof item === "object" &&
            typeof (item as { name?: unknown }).name === "string" &&
            (item as { name: string }).name.trim()
          ) {
            const row = item as {
              name: string;
              price?: string;
              sourceUrl?: string;
            };
            fromField.push({
              name: row.name.trim(),
              price:
                typeof row.price === "string" ? row.price : undefined,
              sourceUrl:
                typeof row.sourceUrl === "string" ? row.sourceUrl : undefined,
            });
          }
        }
      }
    } catch {
      /* ignore malformed */
    }
  }

  // Also mine typed evidence rows (field catalogProduct) without inventing names
  const fromEvidence: import("../types").ContentCatalogProduct[] = [];
  for (const ev of Object.values(evidenceById)) {
    if (ev.field !== "catalogProduct") continue;
    const name = ev.value.trim();
    if (!name || name.length > 80) continue;
    if (!isSemanticallyValidCatalogName(name)) continue;
    fromEvidence.push({
      name,
      sourceUrl: ev.sourceUrl || undefined,
    });
  }

  const out: import("../types").ContentCatalogProduct[] = [];
  const seen = new Set<string>();
  for (const p of [...fromField, ...fromEvidence]) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Reject platform/capability phrasing masquerading as catalog SKUs. */
function isSemanticallyValidCatalogName(name: string): boolean {
  const lower = name.toLowerCase();
  if (
    /\b(search|comparison|compare|builder|advisor|filter|filters|console|dashboard|platform|engine|tool|toolkit|sdk|api|app|software|service|faq)\b/i.test(
      lower
    )
  ) {
    return false;
  }
  // Require at least two tokens or a known product-like pattern
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  return tokens.length >= 2 || /^[A-Z0-9][\w-]{2,}$/.test(name.trim());
}
