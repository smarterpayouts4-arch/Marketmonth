import { APPROVED_CAPABILITIES } from "../../config/approved-capabilities";
import { buildLlmsTxt } from "../../foundation/llms-document";
import type { AuditIssue } from "./rendered-site-audit";

export function auditContentHonesty(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const llms = buildLlmsTxt().toLowerCase();

  if (llms.includes("ai-approved") || llms.includes("ai certified")) {
    issues.push({
      code: "CLAIM_AI_APPROVED",
      severity: "error",
      message: "llms.txt must not claim AI-approved / certified status",
      affectedFiles: ["src/seo/foundation/llms-document.ts"],
    });
  }

  if (!llms.includes("experimental interoperability")) {
    issues.push({
      code: "LLMS_MISSING_EXPERIMENTAL_LABEL",
      severity: "warn",
      message: "llms.txt should label itself as experimental interoperability",
      affectedFiles: ["src/seo/foundation/llms-document.ts"],
    });
  }

  const liveCount = APPROVED_CAPABILITIES.live.length as number;
  if (liveCount === 0) {
    issues.push({
      code: "CAPABILITIES_EMPTY",
      severity: "warn",
      message: "No approved live capabilities listed",
      affectedFiles: ["src/seo/config/approved-capabilities.ts"],
    });
  }

  return issues;
}
