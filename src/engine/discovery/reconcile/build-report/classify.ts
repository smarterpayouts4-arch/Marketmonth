import type { KnowledgeClass } from "../types";

export function classForBrandField(
  field: string,
  evidenceType: string | undefined
): KnowledgeClass {
  if (field === "products") {
    return "curated_fixture";
  }
  if (field === "indexedProducts" || field === "schemaVersion") {
    return "observed";
  }
  if (evidenceType === "observed") return "observed";
  if (evidenceType === "inferred" || evidenceType === "recommended") {
    return "derived";
  }
  if (
    [
      "audience",
      "brandVoice",
      "valueProposition",
      "description",
      "services",
    ].includes(field)
  ) {
    return "derived";
  }
  return "unknown";
}
