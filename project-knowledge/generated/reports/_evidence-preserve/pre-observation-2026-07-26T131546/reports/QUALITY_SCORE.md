<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/update.mjs -->
# QUALITY_SCORE

## Internal Engineering Quality Score

**9.9/10** (`99/100 = 9.9/10`)

> MarketMonth Internal Engineering Quality Score against the project rubric only. Not industry-certified, independently certified, or externally validated.

### Provenance

- Score type: `Internal Engineering Quality Score`
- Rubric version: `2.1.0`
- Rubric file hash: `16cf6a0540c1e5f9`
- Commit SHA: `unavailable`
- Working tree status: `unavailable`
- Git scope: `parent-repo-outside-project`
- Git note: MarketMonth is not its own git root; a parent directory owns .git. Commit SHA is intentionally unavailable until MarketMonth is a dedicated repository (or a documented monorepo package with an explicit root policy).
- Commands executed: `npm run typecheck`, `npm run lint`, `npm test`, `knowledge route resolver test`, `guardian + ownership/env/structure collectors`
- Generated from real execution: `yes`
- Probe status: typecheck=`pass` lint=`pass` test=`pass`
- Passed probes: typecheck, lint, test
- Failed probes: (none)
- Skipped probes: (none)
- Not-evaluated probes/rules: (none)
- Perfect-score eligible: `no`
- Evaluations complete: `yes`
- Hard knowledge failures: 0
- Soft knowledge warnings: 0
- Visible ignore patterns: `.git, .next, Refrence folder, generated, node_modules`
- AI affects official score: `no`

## External Baseline Coverage

- Coverage: **55%**
- External validation status: `Limited`
- External certification: `None`

> This is coverage of recognized engineering practices with executable evidence — not a certification and not merged into the Internal Engineering Quality Score.

## Categories

| Category | Score | /10 | Checks |
|---|---:|---:|---|
| Architecture quality | 20/20 | 10 | PK-QUALITY-001, PK-QUALITY-002, PK-QUALITY-003, PK-QUALITY-063, PK-QUALITY-064, PK-QUALITY-065 |
| File and folder organization | 15/15 | 10 | PK-QUALITY-060, PK-QUALITY-061, PK-QUALITY-062 |
| Ownership clarity | 15/15 | 10 | PK-QUALITY-004, PK-QUALITY-005 |
| Documentation freshness | 15/15 | 10 | PK-QUALITY-020, PK-QUALITY-021, PK-QUALITY-022 |
| Type safety and code quality | 15/15 | 10 | PK-QUALITY-030, PK-QUALITY-031, PK-QUALITY-033, PK-QUALITY-034, PK-QUALITY-032 |
| Testing and verification | 10/10 | 10 | PK-QUALITY-040, PK-QUALITY-041, PK-QUALITY-042, PK-QUALITY-043 |
| Security and configuration | 9/10 | 9 | PK-QUALITY-050, PK-QUALITY-051, PK-QUALITY-052, PK-QUALITY-053 |

## Deductions

### `PK-QUALITY-051` (−1) [`deducted`]

- **Category:** security
- **Rule:** Referenced process.env keys should appear in .env.example
- **Why it matters:** Undocumented env vars hide required configuration.
- **Findings (1):**
  - `DISCOVERY_PLAYWRIGHT`

## Improvement plan

- **low** `PK-QUALITY-051`: Referenced process.env keys should appear in .env.example
  - `DISCOVERY_PLAYWRIGHT`

## AI review (advisory)

AI findings are advisory only and never alter officialScore.

AI influence on official score: **none**.

## Anti-gaming reminder

NOT_EVALUATED and failed probes cannot produce a perfect internal score. External baseline coverage is tracked separately and does not start at 100%.
