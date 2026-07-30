---
title: Phase 3B baseline failures (pre Phase 4A render bridge)
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-30
---

# Phase 3B baseline failures

Exact failing test **names** recorded after Phase 3B (durable scene-level prompts) and before Phase 4A (stub/dry-run renderer bridge). Phase 4A must not add failures beyond this set.

## Exact failures (4)

1. `src/brain/architecture-boundary.test.ts`  
   **brain/core domain does not import OpenAI, Next, MCP, or process.env**

2. `src/brain/connected-system.test.ts`  
   **YouTube Short specialist pins StrategyLock and rejects forged claims**

3. `src/brain/evaluation/subjects/eos/outcome-subjects.test.ts`  
   **extracts ingredient→outcome pairs from Zynava-like camel-glued copy**

4. `src/brain/use-cases/generate-content-directions.e2e.test.ts`  
   **use case compiles Brand Core, records history, selection builds atom with same identity**

## Suite snapshot (full suite probe)

```text
tests 574 · pass 570 · fail 4
```

Same four names as [`phase3-baseline-failures.md`](./phase3-baseline-failures.md); Phase 3B did not expand the failure set.

## Browser smoke (Phase 3B gate)

Atom: `atom_9753d45e4a51` at `/content?atomId=atom_9753d45e4a51`

| Step | Result |
|------|--------|
| Scene 1 + Scene 2 different field overrides saved | Pass (durable bundle on disk) |
| Refresh | Pass — S1 visual/OST + S2 narration/`video` restored |
| Regenerate | Pass — both scene overrides reapplied |
| Reset Scene 1 only | Pass — S1 cleared; S2 narration/`video` remained |
| Reset all | Pass — durable scenes empty; S2 back to generated |
