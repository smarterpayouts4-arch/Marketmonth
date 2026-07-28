import { auditContentHonesty } from "./content-audit";
import { auditCrawlability } from "./crawlability-audit";
import { auditLlmReadiness } from "./llm-readiness-audit";
import { auditMetadata } from "./metadata-audit";
import { auditRenderedSite, type AuditIssue } from "./rendered-site-audit";

export function runAllSiteAudits(): AuditIssue[] {
  return [
    ...auditRenderedSite(),
    ...auditCrawlability(),
    ...auditMetadata(),
    ...auditContentHonesty(),
    ...auditLlmReadiness(),
  ];
}
