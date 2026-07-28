import { buildAppShellMetadata } from "../../foundation/metadata";
import type { AuditIssue } from "./rendered-site-audit";

export function auditMetadata(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const app = buildAppShellMetadata();
  if (
    !(
      app.robots &&
      typeof app.robots === "object" &&
      !Array.isArray(app.robots) &&
      app.robots.index === false
    )
  ) {
    issues.push({
      code: "APP_SHELL_INDEXABLE",
      severity: "error",
      message: "App shell must be noindex",
      affectedFiles: [
        "src/seo/foundation/metadata.ts",
        "src/app/(app)/layout.tsx",
      ],
    });
  }
  return issues;
}
