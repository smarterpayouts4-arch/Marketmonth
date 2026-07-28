import { buildLandingMetadata, buildRootMetadata } from "../../foundation/metadata";
import { buildLandingJsonLdGraph } from "../../foundation/structured-data";
import { getProductIdentity } from "../../config/product-identity";

export type AuditIssue = {
  code: string;
  severity: "error" | "warn" | "info";
  message: string;
  affectedFiles: string[];
};

export function auditRenderedSite(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const identity = getProductIdentity();
  const root = buildRootMetadata();
  const landing = buildLandingMetadata();
  const graph = buildLandingJsonLdGraph();

  if (!root.description) {
    issues.push({
      code: "META_MISSING_DESCRIPTION",
      severity: "error",
      message: "Root metadata missing description",
      affectedFiles: ["src/seo/foundation/metadata.ts", "src/app/layout.tsx"],
    });
  }

  if (!landing.alternates?.canonical) {
    issues.push({
      code: "META_MISSING_CANONICAL",
      severity: "error",
      message: "Landing missing canonical",
      affectedFiles: ["src/seo/foundation/metadata.ts", "src/app/page.tsx"],
    });
  }

  const serialized = JSON.stringify(graph);
  if (!serialized.includes(identity.displayName)) {
    issues.push({
      code: "JSONLD_IDENTITY_MISMATCH",
      severity: "error",
      message: "JSON-LD does not include product displayName",
      affectedFiles: ["src/seo/foundation/structured-data.ts"],
    });
  }

  const ogImages = root.openGraph?.images;
  const hasOgImage = Array.isArray(ogImages)
    ? ogImages.length > 0
    : Boolean(ogImages);
  if (!hasOgImage) {
    issues.push({
      code: "OG_MISSING_IMAGE",
      severity: "warn",
      message: "Open Graph images not configured on root metadata",
      affectedFiles: ["src/seo/foundation/metadata.ts", "src/app/opengraph-image.tsx"],
    });
  }

  return issues;
}
