---
title: Phase 3 baseline failures (pre manual-prompt UI)
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-30
---

# Phase 3 baseline failures

Exact failing test **names** recorded at the Phase 2.1 → Phase 3 Git checkpoint (2026-07-30). Phase 3 must not add failures beyond this set.

## Exact failures (4)

1. `src/brain/architecture-boundary.test.ts`  
   **brain/core domain does not import OpenAI, Next, MCP, or process.env**

2. `src/brain/connected-system.test.ts`  
   **YouTube Short specialist pins StrategyLock and rejects forged claims**

3. `src/brain/evaluation/subjects/eos/outcome-subjects.test.ts`  
   **extracts ingredient→outcome pairs from Zynava-like camel-glued copy**

4. `src/brain/use-cases/generate-content-directions.e2e.test.ts`  
   **use case compiles Brand Core, records history, selection builds atom with same identity**

## Suite snapshot (checkpoint probe)

```text
tests 25 · pass 21 · fail 4
```

See also [`phase2-baseline-failures.md`](./phase2-baseline-failures.md) for earlier notes on #1–#2.
