<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/daily-closeout.mjs -->
# Daily closeout — 2026-07-28

**STATUS: READY WITH WARNINGS**

- Commit SHA: `unavailable`
- Git scope: `parent-repo-outside-project`
- Git note: MarketMonth is not its own git root; a parent directory owns .git. Commit SHA is intentionally unavailable until MarketMonth is a dedicated repository (or a documented monorepo package with an explicit root policy).
- Internal Engineering Quality Score: **8.4/10** (MarketMonth rubric `2.1.0`)
- Formula: `84/100 = 8.4/10`
- Perfect-score eligible: `no`
- Evaluations complete: `yes`
- External Baseline Coverage: **52%** (`Limited`)
- External certification: `None`

> Internal score is not industry-certified or independently certified.

## Category scores

- Architecture quality: 19/20 (9.5/10) — checks: PK-QUALITY-001, PK-QUALITY-002, PK-QUALITY-003, PK-QUALITY-063, PK-QUALITY-064, PK-QUALITY-065
- File and folder organization: 12/15 (8/10) — checks: PK-QUALITY-060, PK-QUALITY-061, PK-QUALITY-062
- Ownership clarity: 7/15 (4.7/10) — checks: PK-QUALITY-004, PK-QUALITY-005
- Documentation freshness: 15/15 (10/10) — checks: PK-QUALITY-020, PK-QUALITY-021, PK-QUALITY-022
- Type safety and code quality: 15/15 (10/10) — checks: PK-QUALITY-030, PK-QUALITY-031, PK-QUALITY-033, PK-QUALITY-034, PK-QUALITY-032
- Testing and verification: 10/10 (10/10) — checks: PK-QUALITY-040, PK-QUALITY-041, PK-QUALITY-042, PK-QUALITY-043
- Security and configuration: 6/10 (6/10) — checks: PK-QUALITY-050, PK-QUALITY-051, PK-QUALITY-052, PK-QUALITY-053

## Hard failures (0)

None.

## Soft warnings (0)

None.

## Probe results

- typecheck: pass (exit 0)
- lint: pass (exit 0)
- test: pass (exit 0)

## AI advisory

- Status: `ok`
- Provider: `openai`
- Live API: `yes`
- AI influence on official score: **none**

Summary review (sanitized context). Concrete observations and recommendations.

1) Top architecture risks
- Ownership drifting (high risk)
  - Evidence: PK-QUALITY-004 (−8) — 27 unowned/undesignated source paths under src/app/dev/brain/idea-lab and several API routes.
  - Risk: unowned code becomes stale, unreviewed, and may violate import/ownership rules or ship accidental behavior.
  - Recommendation: immediately assign owners for each listed path (or move to an explicit dev/sandbox area), update ownership-rules.json, and run knowledge:update / knowledge:check to close the deduction.

- Deep imports / cross-feature coupling
  - Evidence: PK-QUALITY-063 (−1) — deep import: src/components/brand/brand-approved.tsx → @/components/dashboard/dashboard-home/phase-query.
  - Risk: bypassing public API increases coupling, breaks surface ownership rules, and makes refactors risky.
  - Recommendation: replace deep imports with a documented public API entry (index.ts) for the target surface or extract the shared piece into a genuinely shared domain or ui/lib location.

- Large files and mixed responsibilities
  - Evidence: PK-QUALITY-060 (−2) — build-activation-profile.ts (599 lines), bootstrap-dev-workspace.ts (532 lines).
  - Risk: monolithic files hide mixed responsibilities, hard to test, and increase merge conflict surface.
  - Recommendation: split files by responsibility (parsing / transforming / builders / adapters). Prefer small modules with well-named exports and unit tests.

- Layer mixing in server routes
  - Evidence: PK-QUALITY-061 (−1) — route.ts mixes db, server, next, engine layers.
  - Risk: routes that perform DB/engine operations directly make testing and ownership boundaries unclear, and violate the "thin route" pattern.
  - Recommendation: extract DB and engine calls into named service modules owned by appropriate surfaces; keep route handlers thin orchestration layers.

- Missing environment configuration visibility
  - Evidence: PK-QUALITY-051 (−4) — 1

## Remaining issues

- `PK-QUALITY-004` (high): Structural src paths must have an owner
- `PK-QUALITY-051` (high): Referenced process.env keys should appear in .env.example
- `PK-QUALITY-060` (medium): Source files should stay under the agreed line threshold
- `PK-QUALITY-063` (low): Features must not deep-import another feature’s internals
- `PK-QUALITY-061` (low): Files should not mix many architectural layers

## Recommended next priority

Structural src paths must have an owner

## Changed files (working tree vs HEAD)

(clean or unavailable)
