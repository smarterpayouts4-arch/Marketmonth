---
title: Phase 3E baseline failures (pre Phase 4A render bridge)
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-30
---

# Phase 3E baseline failures

Exact failing test **names** recorded after Phase 3E (Manual storyboard scene controls + rail cleanup) and before Phase 4A. Phase 4A must not add failures beyond this set.

## Exact failures (4)

1. `src/brain/architecture-boundary.test.ts`  
   **brain/core domain does not import OpenAI, Next, MCP, or process.env**

2. `src/brain/connected-system.test.ts`  
   **YouTube Short specialist pins StrategyLock and rejects forged claims**

3. `src/brain/evaluation/subjects/eos/outcome-subjects.test.ts`  
   **extracts ingredient→outcome pairs from Zynava-like camel-glued copy**

4. `src/brain/use-cases/generate-content-directions.e2e.test.ts`  
   **use case compiles Brand Core, records history, selection builds atom with same identity**

## Suite snapshot

```text
tests N · pass N-4 · fail 4
```

Failure **names** unchanged from [`phase3d-baseline-failures.md`](./phase3d-baseline-failures.md).
