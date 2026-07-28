---
title: External Quality Baseline
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
---

# EXTERNAL_QUALITY_BASELINE

Maps MarketMonth’s **Internal Engineering Quality Score** to recognized engineering and security practice areas.

This document does **not** claim industry certification, independent certification, or production perfection.

## Two scores (never merge)

| Score | Meaning |
|-------|---------|
| **Internal Engineering Quality Score** | Points against `quality-rules.json` with deterministic collectors + probes |
| **External Baseline Coverage** | % of recognized practice areas with executable/verified coverage |

Executable evidence is required where practical. Mentioning a topic in docs alone does **not** count as covered.

## Practice-area map

| Area | Internal coverage today | Independent tooling |
|------|-------------------------|---------------------|
| TypeScript strictness / build | Rubric probes + tsconfig strict | `tsc` present |
| ESLint / static analysis | Lint probe | ESLint present |
| Automated tests | Feature + route tests | `node:test` / npm test |
| Coverage tooling | Not gated | Absent |
| Circular imports | In-repo graph detector | dependency-cruiser recommended later |
| Dead code / unused exports | Not gated | Knip recommended later |
| Dependency vulnerabilities | `audit:deps` in CI | `npm audit --audit-level=high` |
| Secret scanning | Gitleaks in CI + NEXT_PUBLIC name checks | gitleaks-action in knowledge-check |
| OWASP / Semgrep / CodeQL | Not gated | Recommended later |
| AuthN/AuthZ boundaries | Partial (product incomplete) | Expand matrix tests |
| Secure env handling | `.env.example` + undocumented checks | Covered internally |
| Accessibility | Not gated | axe/pa11y later |
| Performance / bundles | Not gated | Lighthouse CI later |
| API contracts | Zod partial | OpenAPI later |
| DB migrations | Drizzle present, no drift gate | Later |
| Resilience | Partial via validation tests | Later |
| Observability | Absent (CURRENT_STATE) | Recommended now |
| CI quality gates | Present | Present |
| Supply-chain integrity | Dependabot (npm + Actions) partial | SBOM/attestation later |
| Docs / ownership | Rubric + ownership-rules | Present |
| Architecture enforcement | Guardian + independence rules | Present |

## Tooling gap summary

| Tool / category | Status | Recommendation |
|-----------------|--------|----------------|
| TypeScript compiler | Present | Keep |
| ESLint | Present | Keep |
| Test runner (`node:test`) | Present | Keep / expand |
| Coverage tooling | Absent | Later |
| dependency-cruiser / madge | Absent (equivalent partial) | Later |
| Knip / unused exports | Absent | Later |
| npm audit | Present (`audit:deps` in CI) | Keep |
| Secret scanning | Present (Gitleaks in CI) | Keep |
| Dependabot | Present (npm + Actions) | Keep / expand |
| Semgrep / CodeQL | Absent | Later |
| Accessibility testing | Absent | Later |
| Lighthouse / bundle analysis | Absent | Later |

## Honest wording

Use:

> The project earned N/100 against MarketMonth Rubric X.Y.Z (Internal Engineering Quality Score). This is not an external certification. External Baseline Coverage is tracked separately.
