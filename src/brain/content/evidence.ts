import { createHash } from "node:crypto";

import type { Confidence, ContentEvidence } from "./types";

/**
 * Deterministic evidence id from stable fields.
 * Prefer this when source rows lack an explicit id.
 */
export function buildEvidenceId(parts: {
  recordType: string;
  field: string;
  sourceUrl: string;
  sourceSnippet: string;
}): string {
  const raw = [
    parts.recordType.trim().toLowerCase(),
    parts.field.trim().toLowerCase(),
    parts.sourceUrl.trim().toLowerCase(),
    parts.sourceSnippet.trim().slice(0, 160).toLowerCase(),
  ].join("|");
  return `ev_${createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}

export function toEvidence(row: {
  recordType: string;
  field: string;
  value: string;
  sourceUrl: string;
  sourceSnippet?: string;
  confidence?: string;
  evidenceType?: string;
  notes?: string;
}): ContentEvidence {
  const sourceSnippet = (row.sourceSnippet ?? "").trim();
  const id = buildEvidenceId({
    recordType: row.recordType,
    field: row.field,
    sourceUrl: row.sourceUrl,
    sourceSnippet: sourceSnippet || row.value.slice(0, 80),
  });
  return {
    id,
    recordType: row.recordType,
    field: row.field,
    value: row.value,
    sourceUrl: row.sourceUrl,
    sourceSnippet,
    confidence: normalizeConfidence(row.confidence),
    evidenceType: row.evidenceType?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
  };
}

function normalizeConfidence(value?: string): Confidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

/** Stable short hash for decision set / ids */
export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}
