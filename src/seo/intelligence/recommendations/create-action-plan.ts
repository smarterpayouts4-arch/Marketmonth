import { randomUUID } from "node:crypto";

import type { SeoChangeBrief, SeoRecommendation } from "../contracts/recommendation";
import type { ResearchReport } from "../contracts/search-provider";
import { confidenceFromSources } from "../contracts/source-quality";
import type { AuditIssue } from "../audits/rendered-site-audit";
import {
  fingerprintFinding,
  readResearchHistory,
} from "../memory/research-history";
import { priorDecisionForFingerprint } from "../memory/decision-history";
import { filesForSurfaces, filesFromAuditIssues } from "./affected-files";
import { prioritizeRecommendations } from "./prioritize";

function auditToRecommendation(issue: AuditIssue, now: string): SeoRecommendation {
  return {
    id: randomUUID(),
    finding: issue.message,
    whyItMatters: `Internal audit (${issue.code}) detected a gap in the public SEO foundation.`,
    evidence: {
      source: "Local site audit",
      excerpt: issue.message,
    },
    impact:
      issue.severity === "error"
        ? "High"
        : issue.severity === "warn"
          ? "Medium"
          : "Low",
    affectedSurfaces: ["Foundation audit"],
    affectedFiles: issue.affectedFiles,
    recommendation: `Review and fix ${issue.affectedFiles.join(", ")}. Do not change product doctrine without approval.`,
    confidence: "Confirmed",
    status: "New",
    createdAt: now,
    updatedAt: now,
  };
}

function reportToRecommendation(
  report: ResearchReport,
  surface: string,
  now: string
): SeoRecommendation {
  const urls = report.citations.map((c) => c.url).filter(Boolean);
  const primary = report.citations[0];
  return {
    id: randomUUID(),
    finding: `${report.topic}: ${report.summary.slice(0, 280)}${report.summary.length > 280 ? "…" : ""}`,
    whyItMatters:
      "External guidance may affect how we configure crawlability, metadata, or AI-facing documents.",
    evidence: {
      source: primary?.title || report.provider,
      url: primary?.url,
      publishedAt: report.retrievedAt,
      excerpt: (primary?.excerpt || report.summary).slice(0, 400),
    },
    impact: "Medium",
    affectedSurfaces: [surface],
    affectedFiles: filesForSurfaces([surface]),
    recommendation:
      "Compare with current foundation implementation. Propose a patch only after human approval. Do not silently rewrite crawler policy or product claims.",
    confidence: confidenceFromSources(urls),
    status: "New",
    createdAt: now,
    updatedAt: now,
  };
}

export function createActionPlan(input: {
  kind: SeoChangeBrief["kind"];
  auditIssues: AuditIssue[];
  reports: { report: ResearchReport; surface: string }[];
  snapshotSummary: string;
}): SeoChangeBrief {
  const now = new Date().toISOString();
  const previous = readResearchHistory()[0];
  const previousFingerprints = new Set(previous?.findingFingerprints ?? []);

  let recommendations: SeoRecommendation[] = [
    ...input.auditIssues.map((i) => auditToRecommendation(i, now)),
    ...input.reports.map(({ report, surface }) =>
      reportToRecommendation(report, surface, now)
    ),
  ];

  // Restore prior human decisions (Rejected/Implemented remain visible with status)
  recommendations = recommendations.map((rec) => {
    const fp = fingerprintFinding(rec.finding);
    const prior = priorDecisionForFingerprint(fp);
    if (prior && (prior.status === "Rejected" || prior.status === "Implemented")) {
      return { ...rec, status: prior.status, updatedAt: now };
    }
    if (prior && prior.status === "Recheck later") {
      return { ...rec, status: prior.status, updatedAt: now };
    }
    return rec;
  });

  // Dedupe by fingerprint (keep first / prioritized later)
  const seen = new Set<string>();
  recommendations = recommendations.filter((rec) => {
    const fp = fingerprintFinding(rec.finding);
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  });

  const actionable = recommendations.filter(
    (r) => r.status === "New" || r.status === "Accepted" || r.status === "Recheck later"
  );

  const fingerprints = actionable.map((r) => fingerprintFinding(r.finding));
  const newCount = fingerprints.filter((fp) => !previousFingerprints.has(fp)).length;
  const changesSincePrevious = Math.abs(
    fingerprints.length - previousFingerprints.size
  );

  const prioritized = prioritizeRecommendations(recommendations);

  return {
    id: randomUUID(),
    generatedAt: now,
    kind: input.kind,
    snapshotSummary: input.snapshotSummary,
    recommendations: prioritized,
    newCount,
    highPriorityCount: actionable.filter((r) => r.impact === "High").length,
    changesSincePrevious,
    staleAfterDays: 7,
  };
}

export function auditFilesSummary(issues: AuditIssue[]): string {
  const files = filesFromAuditIssues(issues);
  return files.length ? `Audit touched: ${files.join(", ")}` : "No audit file hits";
}
