---
title: Phase 2 baseline failures (pre-migration)
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-30
---

# Phase 2 baseline failures

Captured **before** Content Studio Phase 2 (Short channel service + durable edits) so these are not attributed to the migration.

| Test | Failure | Notes |
|------|---------|-------|
| `src/brain/architecture-boundary.test.ts` → `brain/core domain does not import OpenAI, Next, MCP, or process.env` | `src/brain/core/get-brand-core.ts` uses `process.env` (`ALLOW_DEV_COMPANY_ALIASES`, `NODE_ENV`) | Pre-existing boundary/policy tension |
| `src/brain/connected-system.test.ts` → `YouTube Short specialist pins StrategyLock and rejects forged claims` | `approveAtom` returns `ok: false` without limitations acknowledgement path used in newer adapter tests | Pre-existing flake / outdated test vs limited-atom approve rules |

Phase 2 / 2.1 must not add new failures beyond this baseline.

## Also observed on full `npm test` (unrelated to Short adapter deletion)

Recorded during Phase 2.1 verification so they are not misattributed to cleanup:

| Test | Notes |
|------|-------|
| `src/brain/evaluation/subjects/eos/outcome-subjects.test.ts` → extracts ingredient→outcome pairs | Assert `subjects.length >= 5` failed |
| `src/brain/use-cases/generate-content-directions.e2e.test.ts` → use case compiles Brand Core… | Assert `ok === true` failed |

These do not import or depend on `youtube-short-adapter.ts`.
