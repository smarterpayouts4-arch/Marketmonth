import { buildLlmsTxt } from "../../foundation/llms-document";
import { getProductIdentity } from "../../config/product-identity";
import type { AuditIssue } from "./rendered-site-audit";

export function auditLlmReadiness(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const identity = getProductIdentity();
  const llms = buildLlmsTxt();

  if (!llms.includes(identity.canonicalOrigin)) {
    issues.push({
      code: "LLMS_ORIGIN_MISSING",
      severity: "error",
      message: "llms.txt missing canonical origin",
      affectedFiles: ["src/seo/foundation/llms-document.ts"],
    });
  }

  if (!llms.includes(identity.displayName)) {
    issues.push({
      code: "LLMS_NAME_MISSING",
      severity: "error",
      message: "llms.txt missing displayName from PRODUCT_IDENTITY",
      affectedFiles: [
        "src/seo/foundation/llms-document.ts",
        "src/seo/config/product-identity.ts",
      ],
    });
  }

  return issues;
}
