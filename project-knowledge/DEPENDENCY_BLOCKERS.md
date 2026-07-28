---
title: Dependency remediation blockers
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-25
related_paths:
  - package.json
  - package-lock.json
---

# Dependency remediation blockers and reviewed overrides

This document records **why** high/critical advisories remain, and any **narrow overrides** that were reviewed. It is intentional that Knowledge OS keeps project closeout **NOT READY** when no safe stable fix exists.

Rules:

- No `npm audit fix --force`
- No audit suppressions / allowlists
- No Next.js canary/preview without explicit approval
- Overrides must be exact versions, preferably parent-scoped, with review date

## Applied overrides (reviewed)

| Override | Scope | Exact version | Review date | Expiry review | Justification |
|----------|-------|---------------|-------------|---------------|---------------|
| `next.postcss` | under `next` only (`overrides.next.postcss`) | `8.5.22` | 2026-07-25 | 2026-08-25 | Next 16.2.11 vendors `postcss@8.4.31` (high advisories `<=8.5.17`). After lockfile regenerate, resolves as `next → postcss@8.5.22` (deduped; postcss high cleared). Smoke: build + `next/image` required. |

## Blocked: ESLint 10 (attempted 2026-07-25)

| Field | Value |
|-------|--------|
| Attempt | `eslint@10.8.0` |
| Node | Local Node 24.x OK; CI set to 20.19 |
| Flat config | Present (`eslint.config.mjs`) |
| Why blocked | `eslint-plugin-import` / `jsx-a11y` / `react` (via `eslint-config-next@16.2.11`) peer-range only to `eslint@^9` — `npm ls` reported **invalid** peer state |
| Decision | Reverted to `eslint@^9.39.5`. Keep closeout blocked for remaining eslint-plugin/minimatch highs until `eslint-config-next` ships ESLint-10-capable plugins |
| Do not | Force ESLint 10 with unexplained invalid peers for a green audit |

## Blocked remediations (retain closeout NOT READY until upstream)

### sharp via next@16.2.11

| Field | Value |
|-------|--------|
| Advisory | sharp `<0.35.0` (libvips CVEs) |
| Installed | `sharp@0.34.5` (optionalDependency of `next@16.2.11`) |
| Parent declared range | `^0.34.5` (does **not** include 0.35.x) |
| Why blocked | Moving to `0.35.x` leaves Next’s declared compatible range; upstream reports runtime/load issues with sharp 0.35 on some 16.2 hosts |
| Safe path | Wait for stable Next release that declares/ships sharp `>=0.35`, or obtain explicit approval for a verified override after image-pipeline smoke on target deploy OS |
| Do not | Install Next canary/preview solely to silence audit |

### next high advisory (transitive postcss/sharp)

| Field | Value |
|-------|--------|
| Advisory | `next` listed high for vulnerable nested `postcss` / `sharp` |
| Installed | `next@16.2.11` (latest stable at review) |
| npm suggested fix | `next@9.3.3` — **force-downgrade; ignore** |
| Partial path | Nested `postcss` addressed via parent-scoped override above |
| Remaining | `sharp` blocker above may keep `next` flagged until upstream ships |

### ESLint plugin minimatch@3 (if still present after ESLint 10)

| Field | Value |
|-------|--------|
| Packages | `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react` pull `minimatch@3.1.5` |
| Preferred path | ESLint 10 + latest compatible `eslint-config-next` peer alignment |
| Override policy | Only exact parent-scoped minimatch bumps after lint suite passes; do not global `minimatch: ">=…"` |

## Investigation notes (2026-07-25)

- Local Node: recorded at remediation time (must be ESLint-10-capable: 20.19+ / 22.13+ / 24+)
- CI: `.github/workflows/knowledge-check.yml` Node floor aligned for ESLint 10
- Flat config: `eslint.config.mjs` uses `eslint/config` + `eslint-config-next`
- `npm audit --audit-level=high` only affects exit code; moderate/low still counted in Knowledge OS audit report
