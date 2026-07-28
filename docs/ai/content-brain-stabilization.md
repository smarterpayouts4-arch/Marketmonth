---
title: Content Brain Stabilization Log
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/brain/**
  - project-knowledge/CONTENT_BRAIN.md
  - mcp/**
---

# Content Brain Stabilization Log

## Canonical decisions (fixed)

1. Brand Core = sole runtime brand SoT.
2. CSV / UI / Discovery = ingest adapters → Brand Core.
3. `CONTENT_BRAIN.md` = Content Brain doctrine.
4. Wider `project-knowledge/` = product/eng OS.
5. Runtime history = novelty/eval/debug only.
6. Never dump Project Knowledge into content-generation prompts.
7. Application code owns orchestration.
8. MCP = controlled doc/integration access only.
9. MCP does not orchestrate generation / compile Brand Core / own workflow state.
10. Humans approve doctrine changes and consequential external writes.
11. **reference-library/** = noncanonical research library (KEEP; never import; promotion path only).

## Authority decisions (accepted 2026-07-28)

| Conflict | Decision |
| -------- | -------- |
| Topic-title-hook | Keep deterministic remap; docs updated |
| Gate 2 | Document Partial (Studio validate/continue) |
| openai-stub | Not selectable; unknown providers fail closed |
| preferLlm | Product forced false via `PRODUCT_ATOM_PREFER_LLM` |
| Idea Lab directions | Remain `deterministic-v1` only |
| Refrence | KEEP excluded; do not delete |

## Migration ledger

| Legacy path | Canonical replacement | Consumers remaining | Compatibility | Delete after |
| ----------- | --------------------- | ------------------- | ------------- | ------------ |
| Ad-hoc fixture path strings | `default-fixture.ts` / `load-fixture-brand-core.ts` | Tests may still hardcode path strings | Prefer helpers | When tests migrated |
| Duplicate atom brand load | `load-brand-context-for-atom.ts` | build + produce | Shared helper | N/A |
| Idea Lab route stage shaping | `ild/parse-generate-request.ts` | generate route | Thin route | N/A |
| Lab double Brand Core load | `preloaded` on `generateAndRecordContentDirections` | Idea Lab generate stage | Optional preloaded | N/A |
| Inline ask system prompt | `ask-prompt.ts` + prompt registry | ask route | Registry pointer | N/A |
| subjects helpers↔label cycle | `label-text.ts` | subject modules | Shared clamp | N/A |
| `selectIdeaLabDirectionsProvider` | Same policy via `selectDirectionsProvider` | policy tests | Keep thin wrapper | Optional later |

## Slice status (this pass)

| Slice | Class | Status |
| ----- | ----- | ------ |
| A Baseline | Present debt / baseline | COMPLETE |
| B Ownership matrix | Clarity | COMPLETE |
| C Boundary / Refrence fences | Immediate regression | COMPLETE |
| D Lean contracts | Immediate regression | COMPLETE |
| E Workflow consolidation | Present debt | COMPLETE |
| F Prompt registry | Duplication prevention | COMPLETE |
| G Invariant regressions | Immediate regression | COMPLETE |
| H Trace + min draft eval | Maturity (min) | COMPLETE |
| I Ask security | Immediate security | COMPLETE |
| J MCP governance | Immediate regression | COMPLETE |
| K Debris (keep Refrence) | Present debt | COMPLETE — Refrence retained |
| L CI + final | Immediate + evidence | COMPLETE |

## Deleted / retained

| Item | Action | Reason |
| ---- | ------ | ------ |
| `scripts/debug-title-polish-api.mjs` | Deleted (prior slice) | Unused |
| `reference-library/` | **Retained + excluded** | Noncanonical research library; promotion path required |

## Validation command

```bash
npm run validate:stabilization
```

## Remaining intentional debt

| Item | Status |
| ---- | ------ |
| Full Gate 2 UI | DEFERRED_BY_ARCHITECTURE_DECISION (product) |
| Multi-instance ask rate limit | DEFERRED (production scaling) |
| Physical domain/application folders | DEFERRED unless boundary violation |
| Product LLM atom enablement | DEFERRED (needs eval + policy change) |
| Broader draft-eval metric suite | Maturity — min reliable shipped |
| Bundle-level Brand Core recompile inside directions | Acceptable for now; preloaded removes Lab double-load |

Do not claim production multi-tenant readiness. Zynava CSV-dev stage only.
