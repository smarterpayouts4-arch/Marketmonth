import {
  companyResearchImportSchema,
  type CompanyResearchImportV1,
} from "./types";

export type ParseResearchImportResult =
  | { ok: true; value: CompanyResearchImportV1 }
  | { ok: false; error: string };

/**
 * Fail closed on invalid JSON or schema violations.
 */
export function parseCompanyResearchImport(
  raw: string
): ParseResearchImportResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Paste the JSON research result before validating.",
    };
  }

  // Allow fenced ```json blocks
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced);
  } catch {
    return {
      ok: false,
      error:
        "Invalid JSON. Paste a single JSON object matching company-research-import-v1.",
    };
  }

  const result = companyResearchImportSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? issue.path.join(".") : "root";
    return {
      ok: false,
      error: `Schema error at ${path}: ${issue?.message ?? "invalid import"}`,
    };
  }

  // Soft reject title-like labels
  for (const f of result.data.findings) {
    if (
      /\b(topic title|content idea|hooked title|six ideas)\b/i.test(f.label) ||
      /^(Why|How to write|Best headline)\b/i.test(f.label)
    ) {
      return {
        ok: false,
        error:
          "Import looks like topic titles or content ideas. Return research findings only.",
      };
    }
  }

  return { ok: true, value: result.data };
}
