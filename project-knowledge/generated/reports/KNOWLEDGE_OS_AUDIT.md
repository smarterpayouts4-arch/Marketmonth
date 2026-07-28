<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/knowledge-os-audit.mjs -->
# Knowledge OS Audit

**Knowledge OS operational status: DEGRADED**

**Project closeout readiness: NOT READY**

Evaluated: `2026-07-28T00:31:58.047Z`

Run ID: `21d8219a-2b47-4c28-975d-8d6a3b011244`

> Knowledge OS operational status: DEGRADED. Project closeout readiness: NOT READY. Closeout reasons: audit:deps failed (exit 1); 11 high/critical dependency advisories remain; 3 documented blocked remediation(s) — see DEPENDENCY_BLOCKERS.md. This does not constitute external certification. Limited external baseline coverage does not imply Knowledge OS malfunction.

## Scope

MarketMonth Project Knowledge OS — structure, security, independence, MCP, living detection, known risks

## Status semantics

- Knowledge OS operational (`READY` | `DEGRADED` | `NOT OPERATIONAL`): maps, checks, quality artifacts, MCP — not product dependency posture.
- Project closeout readiness (`READY` | `READY WITH WARNINGS` | `NOT READY`): required probes + high/critical dependency gate.
- `READY` never means externally certified.
- Exit code nonzero when project closeout is `NOT READY` or Knowledge OS is `NOT OPERATIONAL`.

### Closeout reasons

- audit:deps failed (exit 1)
- 11 high/critical dependency advisories remain
- 3 documented blocked remediation(s) — see DEPENDENCY_BLOCKERS.md

### Knowledge OS reasons

- daily-closeout.mjs is 284 lines and still mixes orchestration and report body; no split required this pass

## Git

- Commit SHA: `unavailable`
- Git scope: `parent-repo-outside-project`
- Note: MarketMonth is not its own git root; a parent directory owns .git. Commit SHA is intentionally unavailable until MarketMonth is a dedicated repository (or a documented monorepo package with an explicit root policy).

## Scores

- Internal Engineering Quality Score: **8.4/10** (rubric `2.1.0`)
- External Baseline Coverage: **52%** (`Limited`)
- External certification: `None`
- AI audit: `completed` (advisory only)

## Results

- Knowledge structure: `PASS`
- Canonical authority: `PASS`
- Monolithic files: `PASS` (largest PK script: `project-knowledge/scripts/knowledge-os-audit.mjs` @ 1035 lines)
- Mixed responsibility: `READY WITH WARNINGS`
- Component independence: `READY WITH WARNINGS` (unowned=27)
- Secret leak: `PASS`
- Documentation: `PASS`
- MCP readiness: `PASS`
- Living / stale detection: `PASS`

## Typecheck reliability

- Current typecheck result: `PASS` (exit 0)
- Probe reliability history: `FLAKY`
- Last 10 runs: 1 pass, 1 fail (n=2)
- Previously reported intermittent failure: `unresolved/unreproduced`

## Visibility timing (not continuous watch)

- **knowledge:update**: regenerates maps/indexes
- **knowledge:sync**: update + guardian warnings
- **knowledge:check**: stale compare + hard fail
- **quality:check**: stale quality artifacts + probes
- **daily:closeout**: full gate set
- **CI**: knowledge-check.yml

## Command evidence (same run `21d8219a-2b47-4c28-975d-8d6a3b011244`)

| Command | Exit | OK | Duration ms |
|---|---:|:---:|---:|
| `npm run typecheck` | 0 | yes | 18306 |
| `npm run lint` | 0 | yes | 31337 |
| `npm run test` | 0 | yes | 9938 |
| `npm run knowledge:update` | 0 | yes | 2194 |
| `npm run knowledge:check` | 0 | yes | 2657 |
| `npm run quality:update` | 0 | yes | 82417 |
| `npm run quality:check` | 0 | yes | 68357 |
| `npm run audit:deps` | 1 | no | 17712 |
| `npm run ai:audit` | 0 | yes | 24860 |
| `npm run mcp:test` | 0 | yes | 15825 |
| `npm run daily:closeout` | 0 | yes | 231891 |

### project:audit equivalence

- Definition: `npm run project:audit → knowledge:check && quality:check`
- Invoked separately this run: `false`
- Equivalent would pass: `true`
- Shared probes already include knowledge:check and quality:check once; project:audit kept as convenience npm script only.

## Dependency severity counts

- critical: **0**
- high: **11**
- moderate: **6**
- low: **0**

> `npm run audit:deps` uses --audit-level=high (nonzero exit on high/critical only). Moderate and low findings still exist and are counted above.

## Known unresolved risks

- **dep-vulns-high** (high): 11 high/critical advisories remain; audit:deps exit=1. No force-fix applied. See dependencyVulnerabilitiesHigh and DEPENDENCY_BLOCKERS.md.
- **git-parent-scope** (low): MarketMonth is not its own git root; a parent directory owns .git. Commit SHA is intentionally unavailable until MarketMonth is a dedicated repository (or a documented monorepo package with an explicit root policy).
- **sharp-outside-next-16.2.11-range** (high): sharp@0.34.5 via next@16.2.11 optionalDependency ^0.34.5; patched >=0.35.0 is outside Next's declared range. Blocked until stable Next ships sharp>=0.35. No canary without approval.
- **next-npm-force-downgrade-ignore** (high): npm may suggest a force-downgrade for next. Ignored. Nested postcss cleared via overrides.next.postcss=8.5.22 (review 2026-07-25). next remains high via sharp until upstream ships sharp>=0.35.
- **eslint-10-peer-blocked** (high): eslint@10.8.0 attempted; eslint-config-next@16.2.11 plugins peer only eslint@^9 (invalid peer state). Reverted to eslint@^9.39.5. Remaining minimatch/plugin highs wait on upstream.

## High/critical dependency advisories (11)

| Package | Installed | Direct | npm suggested | Downgrade? | Safe path |
|---|---|:---:|---|:---:|---|
| `@eslint/config-array` | `0.21.2` | no | `eslint@10.8.0` | no | Requires reviewed major upgrade to eslint@10.8.0 — do not npm audit fix --force |
| `@eslint/eslintrc` | `3.3.6` | no | `eslint@10.8.0` | no | Requires reviewed major upgrade to eslint@10.8.0 — do not npm audit fix --force |
| `brace-expansion` | `5.0.8` | no | `eslint@10.8.0` | no | Requires reviewed major upgrade to eslint@10.8.0 — do not npm audit fix --force |
| `eslint` | `9.39.5` | yes | `eslint@10.8.0` | no | Requires reviewed major upgrade to eslint@10.8.0 — do not npm audit fix --force |
| `eslint-config-next` | `16.2.11` | yes | `eslint-config-next@0.2.4` | yes | Ignore npm force-downgrade suggestion (eslint-config-next@0.2.4) — do not npm audit fix --force |
| `eslint-plugin-import` | `?` | no | `eslint-config-next@0.2.4` | yes | Ignore npm force-downgrade suggestion (eslint-config-next@0.2.4) — do not npm audit fix --force |
| `eslint-plugin-jsx-a11y` | `?` | no | `eslint-config-next@0.2.4` | yes | Ignore npm force-downgrade suggestion (eslint-config-next@0.2.4) — do not npm audit fix --force |
| `eslint-plugin-react` | `?` | no | `true (unspecified)` | no | Non-major fix may be available — review changelog then upgrade |
| `minimatch` | `10.2.5` | no | `eslint@10.8.0` | no | Requires reviewed major upgrade to eslint@10.8.0 — do not npm audit fix --force |
| `next` | `16.2.11` | yes | `next@14.2.35` | yes | Ignore npm force-downgrade suggestion (next@14.2.35) — do not npm audit fix --force |
| `sharp` | `0.34.5` | no | `next@14.2.35` | no | Requires reviewed major upgrade to next@14.2.35 — do not npm audit fix --force |

## Classification lists

- Canonical: project-knowledge/PRODUCT.md, project-knowledge/ARCHITECTURE.md, project-knowledge/CURRENT_STATE.md
- Generated: `project-knowledge/generated/**`
- Deprecated / historical / orphaned: none confirmed

## Failed command tails

### `npm run audit:deps` (exit 1)

```text
 versions of eslint-plugin-jsx-a11y
      Depends on vulnerable versions of eslint-plugin-react
      node_modules/eslint-config-next
    eslint-plugin-jsx-a11y  >=6.5.0
    Depends on vulnerable versions of minimatch
    node_modules/eslint-config-next/node_modules/eslint-plugin-jsx-a11y
    eslint-plugin-react  >=7.23.0
    Depends on vulnerable versions of minimatch
    node_modules/eslint-config-next/node_modules/eslint-plugin-react

esbuild  <=0.24.2
Severity: moderate
esbuild enables any website to send any requests to the development server and read the response - https://github.com/advisories/GHSA-67mh-4wv8-2f99
fix available via `npm audit fix --force`
Will install drizzle-kit@0.18.1, which is a breaking change
node_modules/@esbuild-kit/core-utils/node_modules/esbuild
  @esbuild-kit/core-utils  *
  Depends on vulnerable versions of esbuild
  node_modules/@esbuild-kit/core-utils
    @esbuild-kit/esm-loader  *
    Depends on vulnerable versions of @esbuild-kit/core-utils
    node_modules/@esbuild-kit/esm-loader
      drizzle-kit  0.19.0 - 1.0.0-beta.1-fd8bfcc
      Depends on vulnerable versions of @esbuild-kit/esm-loader
      node_modules/drizzle-kit

sharp  <0.35.0
Severity: high
sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 - https://github.com/advisories/GHSA-f88m-g3jw-g9cj
fix available via `npm audit fix --force`
Will install next@14.2.35, which is a breaking change
node_modules/sharp
  next  9.5.6-canary.0 - 10.0.7 || 14.3.0-canary.0 - 16.3.0-preview.7
  Depends on vulnerable versions of sharp
  node_modules/next

17 vulnerabilities (6 moderate, 11 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

npm warn Unknown env config "devdir". This will stop working in the next major version of npm.
npm warn Unknown env config "devdir". This will stop working in the next major version of npm.
```
