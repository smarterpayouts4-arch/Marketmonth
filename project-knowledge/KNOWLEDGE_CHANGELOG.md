---
title: Knowledge Changelog
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
---

# KNOWLEDGE_CHANGELOG

Meaningful **knowledge** events only (not ordinary code/style commits).

## 2026-07-24

- Quality Rubric **v2.1.0**: Internal Engineering Quality Score labeling; provenance (rubric hash, commit SHA or `unavailable`, probe exit codes); perfect-score blocked on NOT_EVALUATED/hard failures; External Baseline Coverage (separate %); `EXTERNAL_QUALITY_BASELINE.md`; applyRubric anti-gaming tests; AI audit provenance (live API yes/no).
- Quality Rubric **v2.0.0**: probes (typecheck/lint/test) with NOT_EVALUATED ≠ full credit; independence rules (public APIs, UI↔engine/db, cross-feature deep imports, cycles); mixed-responsibility / oversized / export-surface checks; `npm test` feature suites; `ai:audit` + `daily:closeout` + APS workflow `daily-project-closeout`. Discovery stages contract moved to `src/lib/discovery/stages.ts`. Ownership assigned for root layout/globals/favicon + next-auth types. Brand public barrel for dashboard composition.
- Project Quality Rubric v1: `QUALITY_RUBRIC.md` + `quality-rules.json`; official score is deterministic-only with evidence in `generated/reports/QUALITY_SCORE.md` / `quality-score.json`. Scripts: `quality:update`, `quality:check`, `project:audit`. Wired into CI and structural stop-hook closeout. AI review section reserved (advisory, disabled).
- Cursor stop hook runs `knowledge:update` + `knowledge:check` when structural Write/StrReplace paths were touched (no live watcher); hard failure means task not complete.
- Full scan P0–P2 orchestration: discovery-results, quality-score/collect, brand-results, demo-theater, mock-landing-demo, dashboard-home, learn-phase-panel, to-card-summary, guardian, mcp smoke, mock-brand.
- Orchestration refactors: thin `scan.mjs` / `build-strategy.ts` / `persist.ts` / `use-discovery.ts` / MCP `create-server.ts` with specialist folders; shared `route-stage-rules.json`.
- Agent toolchain architecture: Docker profile `marketmonth_development` (YouTube Transcripts, Playwright, Context7) + docs in `docs/ai/agent-toolchain.md`.
- Discovery MCP stdio live: context tools source-backed from `project-knowledge/`; LEARN tools wrapped with SSRF/envelopes; Cursor wiring + Docker catalog path documented.
- Established `project-knowledge/` as canonical product and engineering knowledge system.
- Migrated PRODUCT / ARCHITECTURE / supporting docs; APS `project-context/` are pointer stubs only.
- Added CURRENT_STATE with Status / Implemented / Mocked / Missing / Last verified.
- Generators write `generated/maps/`, `generated/indexes/` (`schemaVersion: 1`), reports under `generated/reports/`.
- Sole docs index: `generated/indexes/docs-index.json` (START_HERE points here).
- Guardian emits stable `PK-WARN-*` / `PK-HARD-*` codes; acknowledgements structured.
- Scripts live under `project-knowledge/scripts/`; route resolver tests under `project-knowledge/tests/`.
- Discovery MCP allowlisted reads only; write ban documented in `mcp/README.md`.
- Read-only `POST /api/project-knowledge/ask` (retrieval + OpenAI reasoner).
- RepoBrain: MarketMonth set as active project (advisory only; never SoT).
