---
title: Phase 3D baseline failures (pre Phase 4A render bridge)
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-30
---

# Phase 3D baseline failures

Exact failing test **names** recorded after Phase 3D (Manual scene count + global visual style + hook lint refactor) and before Phase 4A.

## Status (2026-07-30 quality score lift)

All four baseline failures below are **resolved**. Full `npm test` is green (0 fails). Kept here as historical record of the pre-fix set.

## Exact failures (4) — resolved

1. `src/brain/architecture-boundary.test.ts`  
   **brain/core domain does not import OpenAI, Next, MCP, or process.env**  
   → Env helper extracted to `src/lib/company-profile/allow-dev-company-aliases.ts`

2. `src/brain/connected-system.test.ts`  
   **YouTube Short specialist pins StrategyLock and rejects forged claims**  
   → Test uses `deriveLimitations` + `limitationsAcknowledgement` for limited atoms

3. `src/brain/evaluation/subjects/eos/outcome-subjects.test.ts`  
   **extracts ingredient→outcome pairs from Zynava-like camel-glued copy**  
   → `formatOutcomeLabel` prefers cleaned outcome (avoids multi_item_catalog false reject)

4. `src/brain/use-cases/generate-content-directions.e2e.test.ts`  
   **use case compiles Brand Core, records history, selection builds atom with same identity**  
   → Same limitations acknowledgement pattern as (2)

## Suite snapshot (pre-fix)

```text
tests 595 · pass 591 · fail 4
```

## Suite snapshot (post quality score lift)

```text
tests ≥597 · fail 0
```
