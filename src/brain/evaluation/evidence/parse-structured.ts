import type { TopicEvidenceItem } from "./types";
import type { EvidenceClassification, EvidenceConfidence } from "./score";
import { classifyEvidenceSignalType } from "./signal-taxonomy";
import { isRejectedEvidence, sanitizeEvidenceValue } from "./sanitize";
import { scoreEvidenceQuality } from "./score";

const STRUCTURED_FIELDS = new Set([
  "products",
  "productsServices",
  "services",
  "indexedProducts",
  "indexedProduct",
  "catalogProduct",
  "socialProfiles",
  "contentOpportunities",
  "seo.contentOpportunities",
  "educationalTopics",
  "knowsAbout",
  "ownedTopics",
]);

export function isStructuredEvidenceField(field: string): boolean {
  return STRUCTURED_FIELDS.has(field);
}

function parseJsonLike(value: string): unknown {
  const t = value.trim();
  if (!t) return null;
  if (!(t.startsWith("[") || t.startsWith("{"))) return t;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

type PushItemInput = {
  recordType: string;
  field: string;
  value: string;
  text: string;
  sourceUrl: string;
  evidenceType: EvidenceClassification;
  confidence: EvidenceConfidence;
  sourceSnippet?: string;
};

function asClassification(raw: string | undefined): EvidenceClassification {
  const t = (raw ?? "").toLowerCase();
  if (t === "observed") return "observed";
  if (t === "recommended") return "recommended";
  return "inferred";
}

function asConfidence(raw: string | undefined): EvidenceConfidence {
  const t = (raw ?? "").toLowerCase();
  if (t === "high") return "high";
  if (t === "low") return "low";
  return "medium";
}

function pushTextItem(out: TopicEvidenceItem[], input: PushItemInput): void {
  const sanitized = sanitizeEvidenceValue(input.text);
  if (!sanitized) return;
  if (isRejectedEvidence(sanitized)) return;

  const evidenceType = input.evidenceType;
  const confidence = input.confidence;
  const signalType = classifyEvidenceSignalType({
    field: input.field,
    recordType: input.recordType,
  });

  out.push({
    id: input.sourceSnippet
      ? `${input.recordType}|${input.field}|${sanitized.slice(0, 40)}`
      : `${input.recordType}|${input.field}|${sanitized.slice(0, 80)}`,
    recordType: input.recordType,
    field: input.field,
    value: input.value,
    normalizedText: sanitized,
    sourceUrl: input.sourceUrl || "",
    evidenceType,
    confidence,
    sourceSnippet: input.sourceSnippet?.slice(0, 180),
    qualityScore: scoreEvidenceQuality({ evidenceType, confidence }),
    signalType,
  });
}

/**
 * Parse JSON arrays/objects in evidence values into clean text items.
 * Used for products, indexedProducts, catalogProduct, etc.
 */
export function parseStructuredEvidenceValue(
  field: string,
  raw: unknown,
  sourceUrl: string,
  evidenceType: EvidenceClassification,
  confidence: EvidenceConfidence,
  recordType: string
): TopicEvidenceItem[] {
  const out: TopicEvidenceItem[] = [];

  const flatten = (value: unknown) => {
    if (value == null) return;
    if (typeof value === "string") {
      const parsed = parseJsonLike(value);
      if (typeof parsed === "string") {
        pushTextItem(out, {
          recordType,
          field,
          value,
          text: parsed,
          sourceUrl,
          evidenceType,
          confidence,
        });
        return;
      }
      flatten(parsed);
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      for (const item of value) {
        if (typeof item === "string") {
          pushTextItem(out, {
            recordType,
            field,
            value: item,
            text: item,
            sourceUrl,
            evidenceType,
            confidence,
          });
        } else if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const name =
            (typeof obj.name === "string" && obj.name) ||
            (typeof obj.label === "string" && obj.label) ||
            (typeof obj.platform === "string" && obj.platform) ||
            (typeof obj.question === "string" && obj.question) ||
            null;
          const status =
            typeof obj.status === "string" ? obj.status : undefined;
          const url =
            (typeof obj.sourceUrl === "string" && obj.sourceUrl) ||
            (typeof obj.url === "string" && obj.url) ||
            (typeof obj.website === "string" && obj.website) ||
            sourceUrl;
          if (name) {
            const text =
              status != null ? `${name} (${status})` : String(name);
            pushTextItem(out, {
              recordType,
              field,
              value: String(name),
              text,
              sourceUrl: url,
              evidenceType,
              confidence,
            });
          }
          if (
            typeof obj.answer === "string" &&
            typeof obj.question === "string"
          ) {
            pushTextItem(out, {
              recordType: "faq",
              field: "entry",
              value: `${obj.question} ${obj.answer}`,
              text: `Q: ${obj.question} A: ${obj.answer}`,
              sourceUrl: url,
              evidenceType,
              confidence,
              sourceSnippet: obj.question,
            });
          }
        }
      }
      return;
    }
  };

  flatten(raw);
  return out;
}

export { asClassification, asConfidence, pushTextItem };
