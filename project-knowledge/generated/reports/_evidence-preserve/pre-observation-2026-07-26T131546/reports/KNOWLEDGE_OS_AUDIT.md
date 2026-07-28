<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/update.mjs -->
# Knowledge OS Audit

**STATUS: NOT READY**

Evaluated: `2026-07-25T05:10:21.355Z`

> The MarketMonth Knowledge OS is structurally verified and operational within its documented scope. This does not constitute external certification, and any unresolved security, reliability, or coverage findings remain explicitly listed.

## Scope

MarketMonth Project Knowledge OS — structure, security, independence, MCP, living detection, known risks

## Git

- Commit SHA: `unavailable`
- Git scope: `parent-repo-outside-project`
- Note: MarketMonth is not its own git root; a parent directory owns .git. Commit SHA is intentionally unavailable until MarketMonth is a dedicated repository (or a documented monorepo package with an explicit root policy).

## Scores

- Internal Engineering Quality Score: **9.9/10** (rubric `2.1.0`)
- External Baseline Coverage: **55%** (`Limited`)
- External certification: `None`
- AI audit: `completed` (advisory only)

## Results

- Knowledge structure: `PASS`
- Canonical authority: `PASS`
- Monolithic files: `PASS`
- Mixed responsibility: `READY WITH WARNINGS`
- Component independence: `PASS` (unowned=0)
- Secret leak: `PASS`
- Documentation: `PASS`
- MCP readiness: `PASS`
- Living / stale detection: `PASS`

## Visibility timing (not continuous watch)

- **knowledge:update**: regenerates maps/indexes
- **knowledge:sync**: update + guardian warnings
- **knowledge:check**: stale compare + hard fail
- **quality:check**: stale quality artifacts + probes
- **daily:closeout**: full gate set
- **CI**: knowledge-check.yml

## Command exit codes

| Command | Exit | OK |
|---|---:|:---:|
| `npm run typecheck` | 0 | yes |
| `npm run lint` | 0 | yes |
| `npm run test` | 0 | yes |
| `npm run knowledge:update` | 0 | yes |
| `npm run knowledge:check` | 0 | yes |
| `npm run quality:update` | 0 | yes |
| `npm run quality:check` | 0 | yes |
| `npm run audit:deps` | 1 | no |
| `npm run ai:audit` | 0 | yes |
| `npm run project:audit` | 1 | no |
| `npm run mcp:test` | 0 | yes |
| `npm run daily:closeout` | 0 | yes |

## Known unresolved risks

- **dep-vulns-high** (high): 12 high/critical advisories remain; audit:deps exit=1. No force-fix applied. See dependencyVulnerabilitiesHigh.
- **typecheck-flake** (medium): Prior daily:closeout observed typecheck exit 2 while isolated quality:update passed. Re-run twice this audit: both exit 0. Root cause NOT EVALUATED (possible concurrent generated-file writers / resource pressure during closeout).
- **git-parent-scope** (low): MarketMonth is not its own git root; a parent directory owns .git. Commit SHA is intentionally unavailable until MarketMonth is a dedicated repository (or a documented monorepo package with an explicit root policy).

## High/critical dependency advisories (12)

| Package | Direct | Breaking fix? | Safe path |
|---|:---:|:---:|---|
| `@eslint/config-array` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `@eslint/eslintrc` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `brace-expansion` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `eslint` | yes | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `eslint-config-next` | yes | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `eslint-plugin-import` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `eslint-plugin-jsx-a11y` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `eslint-plugin-react` | no | maybe/no | Non-major fix may be available — review changelog then upgrade |
| `minimatch` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `next` | yes | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `postcss` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |
| `sharp` | no | yes | Requires reviewed major upgrade — do not npm audit fix --force |

## Classification lists

- Canonical: project-knowledge/PRODUCT.md, project-knowledge/ARCHITECTURE.md, project-knowledge/CURRENT_STATE.md
- Generated: `project-knowledge/generated/**`
- Deprecated / historical / orphaned: none confirmed
