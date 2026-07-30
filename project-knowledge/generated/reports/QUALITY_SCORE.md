<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/lib/quality-score/write.mjs -->
# QUALITY_SCORE

## Internal Engineering Quality Score

**6.7/10** (`67/100 = 6.7/10`)

> MarketMonth Internal Engineering Quality Score against the project rubric only. Not industry-certified, independently certified, or externally validated.

### Provenance

- Score type: `Internal Engineering Quality Score`
- Rubric version: `2.1.0`
- Rubric file hash: `16cf6a0540c1e5f9`
- Commit SHA: `ffaf395a4dd1f3beb7f93137f3efbbadd42467f5`
- Working tree status: `dirty`
- Git scope: `project-root`
- Commands executed: `npm run typecheck`, `npm run lint`, `npm test`, `knowledge route resolver test`, `guardian + ownership/env/structure collectors`
- Generated from real execution: `yes`
- Probe status: typecheck=`pass` lint=`fail` test=`fail`
- Passed probes: typecheck
- Failed probes: lint, test
- Skipped probes: (none)
- Not-evaluated probes/rules: (none)
- Perfect-score eligible: `no`
- Evaluations complete: `yes`
- Hard knowledge failures: 0
- Soft knowledge warnings: 5
- Visible ignore patterns: `.git, .next, Refrence folder, generated, node_modules, reference-library`
- AI affects official score: `no`

## External Baseline Coverage

- Coverage: **48%**
- External validation status: `Limited`
- External certification: `None`

> This is coverage of recognized engineering practices with executable evidence — not a certification and not merged into the Internal Engineering Quality Score.

## Categories

| Category | Score | /10 | Checks |
|---|---:|---:|---|
| Architecture quality | 19/20 | 9.5 | PK-QUALITY-001, PK-QUALITY-002, PK-QUALITY-003, PK-QUALITY-063, PK-QUALITY-064, PK-QUALITY-065 |
| File and folder organization | 5/15 | 3.3 | PK-QUALITY-060, PK-QUALITY-061, PK-QUALITY-062 |
| Ownership clarity | 7/15 | 4.7 | PK-QUALITY-004, PK-QUALITY-005 |
| Documentation freshness | 13/15 | 8.7 | PK-QUALITY-020, PK-QUALITY-021, PK-QUALITY-022 |
| Type safety and code quality | 12/15 | 8 | PK-QUALITY-030, PK-QUALITY-031, PK-QUALITY-033, PK-QUALITY-034, PK-QUALITY-032 |
| Testing and verification | 5/10 | 5 | PK-QUALITY-040, PK-QUALITY-041, PK-QUALITY-042, PK-QUALITY-043 |
| Security and configuration | 6/10 | 6 | PK-QUALITY-050, PK-QUALITY-051, PK-QUALITY-052, PK-QUALITY-053 |

## Deductions

### `PK-QUALITY-063` (−1) [`deducted`]

- **Category:** architecture
- **Rule:** Features must not deep-import another feature’s internals
- **Why it matters:** Cross-feature coupling must go through declared public APIs.
- **Findings (1):**
  - `src/components/brand/brand-approved.tsx → @/components/dashboard/dashboard-home/phase-query (bypass dashboard public API)`

### `PK-QUALITY-060` (−6) [`deducted`]

- **Category:** organization
- **Rule:** Source files should stay under the agreed line threshold
- **Why it matters:** Oversized files hide mixed responsibilities.
- **Findings (7):**
  - `src/app/dev/brain/idea-lab/use-idea-lab-sandbox.ts (638 lines > 500)`
  - `src/brain/atom/generate.ts (791 lines > 500)`
  - `src/brain/atom/validate/index.ts (870 lines > 500)`
  - `src/components/dashboard/content/hooks/use-content-studio.ts (629 lines > 500)`
  - `src/components/dashboard/marketing-topic/hooks/use-content-directions.ts (524 lines > 500)`
  - `src/lib/company-profile/csv-contract.ts (959 lines > 500)`
  - `src/lib/dev/bootstrap-dev-workspace.ts (532 lines > 500)`

### `PK-QUALITY-061` (−1) [`deducted`]

- **Category:** organization
- **Rule:** Files should not mix many architectural layers
- **Why it matters:** UI + engine + db + server in one file is a responsibility smell.
- **Findings (1):**
  - `src/app/api/onboarding/workspace-context/route.ts layers=[db,server,next,engine] (min 3)`

### `PK-QUALITY-062` (−3) [`deducted`]

- **Category:** organization
- **Rule:** Modules should not expose an excessive public surface
- **Why it matters:** Too many exports usually means mixed jobs.
- **Findings (3):**
  - `src/brain/atom/content-atom.schema.ts (44 export decls > 25)`
  - `src/engine/discovery/index.ts (26 export decls > 25)`
  - `src/lib/discovery/discovery-narrative.schema.ts (32 export decls > 25)`

### `PK-QUALITY-004` (−8) [`deducted`]

- **Category:** ownership
- **Rule:** Structural src paths must have an owner
- **Why it matters:** Unowned paths drift without a responsible surface.
- **Findings (34):**
  - `src/app/api/dev/brain/idea-lab/generate/route.ts`
  - `src/app/api/dev/brain/idea-lab/runs/route.ts`
  - `src/app/api/onboarding/create-plan/route.ts`
  - `src/app/api/onboarding/workspace-context/route.ts`
  - `src/app/dev/brain/idea-lab/Flow Refernce/Hooked-by-Nir-Eyal-2.pdf`
  - `src/app/dev/brain/idea-lab/Flow Refernce/Marketing Hook.txt`
  - `src/app/dev/brain/idea-lab/idea-lab-candidate-list.tsx`
  - `src/app/dev/brain/idea-lab/idea-lab-candidates-panel.tsx`
  - `src/app/dev/brain/idea-lab/idea-lab-client.tsx`
  - `src/app/dev/brain/idea-lab/idea-lab-directions-panel.tsx`
  - `src/app/dev/brain/idea-lab/idea-lab-research-assist-panel.tsx`
  - `src/app/dev/brain/idea-lab/idea-lab-test-inspector.tsx`
  - `src/app/dev/brain/idea-lab/idea-lab-title-hook-badge.tsx`
  - `src/app/dev/brain/idea-lab/idea-lab-ui.test.ts`
  - `src/app/dev/brain/idea-lab/ili/candidates-tab.tsx`
  - `src/app/dev/brain/idea-lab/ili/compare-mini.tsx`
  - `src/app/dev/brain/idea-lab/ili/controls-tab.tsx`
  - `src/app/dev/brain/idea-lab/ili/craft-tab.tsx`
  - `src/app/dev/brain/idea-lab/ili/evidence-tab.tsx`
  - `src/app/dev/brain/idea-lab/ili/history-tab.tsx`
  - `src/app/dev/brain/idea-lab/ili/inputs-tab.tsx`
  - `src/app/dev/brain/idea-lab/ili/overview-tab.tsx`
  - `src/app/dev/brain/idea-lab/ili/resolve-evidence.ts`
  - `src/app/dev/brain/idea-lab/ili/row.tsx`
  - `src/app/dev/brain/idea-lab/ili/trace-tab.tsx`
  - `src/app/dev/brain/idea-lab/layout.tsx`
  - `src/app/dev/brain/idea-lab/map-idea-to-variation.ts`
  - `src/app/dev/brain/idea-lab/page.tsx`
  - `src/app/dev/brain/idea-lab/SANDBOX.md`
  - `src/app/dev/brain/idea-lab/use-idea-lab-sandbox.ts`
  - `src/components/topic-candidates/from-candidate.ts`
  - `src/components/topic-candidates/index.ts`
  - `src/components/topic-candidates/topic-candidate-list.tsx`
  - `src/components/topic-candidates/topic-candidates-panel.tsx`

### `PK-QUALITY-022` (−2) [`deducted`]

- **Category:** documentation
- **Rule:** Qualifying feature roots need FEATURES briefs
- **Why it matters:** Meaningful surfaces need a short intent doc.
- **Findings (1):**
  - `src/brain/content`

### `PK-QUALITY-034` (−3) [`deducted`]

- **Category:** code_quality
- **Rule:** Lint must pass
- **Why it matters:** Lint failures block a perfect code-quality score.
- **Findings (1):**
  - `lint failed (exit 1)`

### `PK-QUALITY-043` (−5) [`deducted`]

- **Category:** testing
- **Rule:** npm test suite must pass
- **Why it matters:** Failing tests block a perfect testing score.
- **Findings (1):**
  - `test failed (exit 1)`

### `PK-QUALITY-051` (−4) [`deducted`]

- **Category:** security
- **Rule:** Referenced process.env keys should appear in .env.example
- **Why it matters:** Undocumented env vars hide required configuration.
- **Findings (21):**
  - `ALLOW_DEV_COMPANY_ALIASES`
  - `ATOM_CRAFT_POLISH_PROVIDER`
  - `BRAIN_HISTORY_STORE`
  - `BRAIN_JUDGE_SAMPLE_RATE`
  - `BRAIN_TENANT_DAILY_TOKEN_CAP`
  - `DISCOVERY_PLAYWRIGHT`
  - `HOOK_ENRICHMENT_PROVIDER`
  - `INDUSTRY_RESEARCH_ENABLED`
  - `INDUSTRY_RESEARCH_LIVE`
  - `JSON2VIDEO_API_KEY`
  - `MM_IMAGE_API_KEY`
  - `MM_IMAGE_MODEL`
  - `MM_IMAGE_PROVIDER`
  - `MM_IMAGE_RENDER`
  - `MM_PIPELINE_TRACE`
  - `MM_PROVENANCE`
  - `MM_VOICE_MODEL`
  - `MM_VOICE_PROVIDER`
  - `OPENAI_MAX_CONCURRENCY`
  - `RATE_LIMIT_STORE`
  - `TOPIC_TITLE_HOOK_PROVIDER`

## Improvement plan

- **high** `PK-QUALITY-004`: Structural src paths must have an owner
  - `src/app/api/dev/brain/idea-lab/generate/route.ts`
  - `src/app/api/dev/brain/idea-lab/runs/route.ts`
  - `src/app/api/onboarding/create-plan/route.ts`
  - `src/app/api/onboarding/workspace-context/route.ts`
  - `src/app/dev/brain/idea-lab/Flow Refernce/Hooked-by-Nir-Eyal-2.pdf`
- **high** `PK-QUALITY-060`: Source files should stay under the agreed line threshold
  - `src/app/dev/brain/idea-lab/use-idea-lab-sandbox.ts (638 lines > 500)`
  - `src/brain/atom/generate.ts (791 lines > 500)`
  - `src/brain/atom/validate/index.ts (870 lines > 500)`
  - `src/components/dashboard/content/hooks/use-content-studio.ts (629 lines > 500)`
  - `src/components/dashboard/marketing-topic/hooks/use-content-directions.ts (524 lines > 500)`
- **high** `PK-QUALITY-043`: npm test suite must pass
  - `test failed (exit 1)`
- **high** `PK-QUALITY-051`: Referenced process.env keys should appear in .env.example
  - `ALLOW_DEV_COMPANY_ALIASES`
  - `ATOM_CRAFT_POLISH_PROVIDER`
  - `BRAIN_HISTORY_STORE`
  - `BRAIN_JUDGE_SAMPLE_RATE`
  - `BRAIN_TENANT_DAILY_TOKEN_CAP`
- **medium** `PK-QUALITY-062`: Modules should not expose an excessive public surface
  - `src/brain/atom/content-atom.schema.ts (44 export decls > 25)`
  - `src/engine/discovery/index.ts (26 export decls > 25)`
  - `src/lib/discovery/discovery-narrative.schema.ts (32 export decls > 25)`
- **medium** `PK-QUALITY-034`: Lint must pass
  - `lint failed (exit 1)`
- **medium** `PK-QUALITY-022`: Qualifying feature roots need FEATURES briefs
  - `src/brain/content`
- **low** `PK-QUALITY-063`: Features must not deep-import another feature’s internals
  - `src/components/brand/brand-approved.tsx → @/components/dashboard/dashboard-home/phase-query (bypass dashboard public API)`
- **low** `PK-QUALITY-061`: Files should not mix many architectural layers
  - `src/app/api/onboarding/workspace-context/route.ts layers=[db,server,next,engine] (min 3)`

## AI review (advisory)

AI findings are advisory only and never alter officialScore.

AI influence on official score: **none**.

## Anti-gaming reminder

NOT_EVALUATED and failed probes cannot produce a perfect internal score. External baseline coverage is tracked separately and does not start at 100%.
