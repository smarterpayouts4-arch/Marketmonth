<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/ai-audit.mjs -->
# AI_AUDIT (advisory)

## Provenance

- Review type: `Advisory AI review`
- Provider: `openai`
- Requested model: `gpt-5-mini`
- Actual returned model: `gpt-5-mini-2025-08-07`
- API execution status: `ok`
- HTTP status: `200`
- Context files supplied: `project-knowledge/QUALITY_RUBRIC.md`, `project-knowledge/ARCHITECTURE.md`, `project-knowledge/CURRENT_STATE.md`, `project-knowledge/generated/reports/QUALITY_SCORE.md`, `project-knowledge/generated/reports/STRUCTURE_WARNINGS.md`
- Context size: `18104` bytes
- Response generated from live API: `yes`
- AI affects official score: `no`
- Secrets in context: `excluded` (.env.local never sent; only sanitized docs)

> This report does **not** change the Internal Engineering Quality Score.

## Observations

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
  - Evidence: PK-QUALITY-051 (−4) — 15 referenced env keys not in .env.example (image/voice providers, OpenAI models, feature flags).
  - Risk: hidden required config leads to onboarding friction and accidental credential exposure or misconfiguration in CI.
  - Recommendation: add all referenced keys to .env.example with guidance (required/optional, provider hints), and document which are sensitive and should be in secrets manager.

2) Independence / coupling concerns
- Forbidden import directions may be occurring
  - Observation: architecture forbids components ↔ engine cross-imports; discovery UI must use src/lib/discovery/stages.ts contract.
  - Action: run an automated import-scan for forbidden paths (e.g., components importing engine or db). Enforce in CI via an import-linter/ESLint rule.

- Orchestration surfaces lacking clear public APIs
  - Observation: Dashboard/orchestration is allowed to compose public interfaces but must not own internals. Deep-import finding indicates missing or incomplete public entrypoints.
  - Recommendation: define and publish publicApiEntrypoints for surfaces that others must use; update ownership rules and add index files exporting only the public surface contract.

- Dev/sandbox artifacts coupling into prod areas
  - Observation: large set of files under src/app/dev/brain/idea-lab (UI, tests, PDFs) are unowned and mixed with app routes.
  - Risk: accidental imports or shipping of experimental code into production bundles.
  - Recommendation: move experimental code to a clearly marked sandbox package/folder (e.g., /dev-sandbox) and exclude from production build, or assign explicit owners and lifecycle policies.

3) Documentation gaps
- Ownership metadata incomplete
  - Evidence: many unowned paths in PK-QUALITY-004; ownership-rules.json is referenced but ownership entries are missing.
  - Recommendation: update ownership-rules.json (or equivalent) to include the unowned paths and publicApiEntrypoints; add owner contact and expected lifecycle (maintain/archived).

- Public API and domain contract docs missing / incomplete
  - Observation: ARCHITECTURE.md describes rules and mentions future `src/domain/*` but not all shared contracts exist.
  - Recommendation: codify shared contracts (e.g., discovery stages, strategy interfaces) in src/domain or src/lib and add README per contract explaining intended consumers and stability guarantees.

- Environment/key usage
  - Observation: .env.example missing many keys; no per-key docs.
  - Recommendation: create ENVIRONMENT.md listing each env var, purpose, default/required, and where used (file paths). Mark which values are feature flags vs secrets.

- Live vs mocked status and integration guidance
  - Observation: CURRENT_STATE warns about Partial/Mocked features but there's no single canonical map for engineers to check before integrating.
  - Recommendation: add a short "what is production-ready" table or badge per feature (Live / Partial / Prototype / Mocked) in the relevant feature README and enforce checks for building on non-live systems (as the Agent persona requires).

4) Recommended next priorities (ranked)
- P0 — Assign ownership and resolve PK-QUALITY-004 (high impact, medium effort)
  - Tasks: assign owners to the 27 items; either move experimental files into a sandbox or declare owners and lifecycle; update ownership-rules.json; run knowledge:update + quality:check.

- P0 — Add missing env keys to .env.example and ENV docs (low effort, high value)
  - Tasks: add the 15 keys from the report with notes (required/optional/provider), and commit to secrets/CI docs.

- P1 — Eliminate deep imports and publish explicit public APIs (medium effort)
  - Tasks: replace the brand → dashboard deep-import with a public index export; audit repository for similar deep imports; add ESLint/import-linter rules to prevent recurrence.

- P1 — Break up oversized files and re-run tests (medium effort)
  - Tasks: split build-activation-profile.ts and bootstrap-dev-workspace.ts into focused modules; add unit tests for new modules.

- P2 — Refactor route layering (thin handlers) and extract services (medium effort)
  - Tasks: refactor src/app/api/onboarding/workspace-context/route.ts to call engine/db services owned in correct modules; document ownership and testing pattern for server routes.

- P2 — Add automated enforcement to CI (low/medium effort)
  - Tasks: enable import boundary checks (eslint-plugin-boundaries or import/no-internal-modules), require knowledge:check in CI, and fail builds on unowned-path rules.

- P3 — Improve documentation for shared contracts and feature readiness (low effort)
  - Tasks: add README files in src/lib/discovery, src/domain, and per-surface README badges showing CURRENT_STATE status.

Notes / constraints
- Do not modify the official deterministic score; these are advisory remediation steps. The repo already runs typecheck/lint/tests (probes passed). Closing the ownership and env gaps will remove the largest deductions and reduce operational risk.

If you want, I can:
- produce a short PR checklist for each P0/P1 task, or
- generate a small ESLint/import-linter config snippet to prevent deep imports.
