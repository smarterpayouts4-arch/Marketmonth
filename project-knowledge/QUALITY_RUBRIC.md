---
title: Project Quality Rubric
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
related_paths:
  - project-knowledge/quality-rules.json
  - project-knowledge/scripts/quality.mjs
  - project-knowledge/generated/reports/QUALITY_SCORE.md
---

# QUALITY_RUBRIC

**Rubric version:** see `quality-rules.json` → `rubricVersion` (currently **2.1.0**).

The official number is the **MarketMonth Internal Engineering Quality Score**.  
It is **not** industry-certified, independently certified, or externally validated.

A **10/10** means full points against this project rubric with complete probe execution — not absolute product perfection. See also [`EXTERNAL_QUALITY_BASELINE.md`](./EXTERNAL_QUALITY_BASELINE.md) for separate external coverage.

**Provenance:** reports include commit SHA when MarketMonth itself is the git toplevel (`git rev-parse --show-toplevel` equals the project root). If MarketMonth sits inside a parent repository (common when a user home folder owns `.git`), SHA is reported as `unavailable` so a parent commit is never mis-attributed. Prefer CI closeouts on a clean project-owned commit when auditors need a hash.

```text
Living knowledge system
        ↓
Deterministic checks (+ probes)
        ↓
Rubric scoring
        ↓
Evidence-backed score
        ↓
Warnings, improvement plan, daily closeout
```

## Official vs advisory

| Layer | Role |
|-------|------|
| **Official score** | Deterministic facts + typecheck/lint/test probes |
| **AI review** (`ai:audit`) | Advisory only — **never** merged into official score |

Unexecuted probe checks are **`NOT_EVALUATED`** and do **not** receive full credit.

## Categories (100 points → /10)

| Category | Points |
|----------|--------|
| Architecture quality | 20 |
| File and folder organization | 15 |
| Ownership clarity | 15 |
| Documentation freshness | 15 |
| Type safety and code quality | 15 |
| Testing and verification | 10 |
| Security and configuration | 10 |

## Independence (precise)

- A feature owns its implementation.
- Other features may use **only** its declared public API (`publicApiEntrypoints` in `ownership-rules.json`).
- UI does not import engine, database, or infrastructure modules.
- Shared code must be genuinely cross-feature (`src/lib/**`, `src/components/ui/**`, `src/components/shared/**`).
- Complete independence ≠ duplicating dependencies; it means low coupling and explicit interfaces.

## Commands

```bash
npm run quality:update       # full score with typecheck/lint/test probes
npm run quality:update:fast  # structural score only (NOT_EVALUATED for probes)
npm run quality:check        # stale compare; requires complete evaluations
npm run audit:deps           # npm audit --audit-level=high (also in CI)
npm run ai:audit             # advisory OpenAI review
npm run daily:closeout       # end-of-day gates + DAILY_LATEST report
npm run project:audit        # knowledge:check && quality:check
```

## Daily closeout statuses

| Status | Meaning |
|--------|---------|
| `NOT READY TO CLOSE` | Hard failure remains |
| `READY WITH WARNINGS` | Soft warnings or category &lt; 10 |
| `READY TO CLOSE` | All categories 10/10, evaluations complete, no hard failures |

## Anti-gaming

Do not weaken deductions, add blanket allowlists, invent empty tests, or split files only to beat line counts. Track trends; show evidence beside every deduction.
