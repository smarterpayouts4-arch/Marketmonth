---
title: Content Brain Stabilization Final Package
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
---

# Content Brain Stabilization — Final Package

## 1. Executive verdict

**Exit criteria: SATISFIED for development-stage stabilization** (evidence below).

Numerical score is informational only and does not override tests.

| Priority | Remaining |
| -------- | --------- |
| P0 | None known |
| P1 | Gate 2 full product UI (deferred product work) |
| P2 | Multi-instance ask rate limit; broader draft-eval metrics; leftover test fixture path hardcodes |
| P3 | Physical folder rename (no benefit without violation) |

**May development continue?** Yes — on top of Brand Core ownership, shared use cases, lean contracts, invariant regressions, ask protection, MCP agreement, and `npm run validate:stabilization`.

## 2. Architecture (after)

```text
Refrence/ (quarantined read-only; promotion path only)
project-knowledge/ (eng/product OS; ask/MCP)
        │
CSV/UI/Discovery ingest → Brand Core (sole content brand SoT)
        │
normalize topic → directions (shared use case + TraceRecorder)
        │ Gate 1 human select (ReviewDecision.direction_select)
        ▼
Content Atom → channel package → draft-eval (PASS/FAIL/WARNING)
        │ Gate 2 Partial (Studio)
        ▼
runtime history (novelty/eval only)
```

MCP reads allowlisted docs only. Ask route: auth + caps + dev rate limit.

## 3. Responsibility map

See [`content-brain-ownership-matrix.md`](./content-brain-ownership-matrix.md).

## 4. Contract registry

| Contract | Version | Path |
| -------- | ------- | ---- |
| NormalizedTopic | normalized-topic-v1 | `src/brain/contracts/normalized-topic.schema.ts` |
| ContentContextPacket | content-context-packet-v1 | `.../content-context-packet.schema.ts` |
| EvaluationResult | evaluation-result-v1 | `.../evaluation-result.schema.ts` |
| ReviewDecision | review-decision-v1 | `.../review-decision.schema.ts` |
| ContentRunTrace | content-run-trace-v1 | `.../content-run-trace.schema.ts` |

## 5. Prompt / model / provider registry

- Prompts: `src/brain/policy/prompt-registry.ts` (metadata + module pointers)
- Models: `src/brain/policy/model-registry.ts` (unknown keys fail closed)
- Providers: `src/brain/policy/provider-policy.ts` + `resolve-provider.ts` (unknown fail closed)
- Disabled: openai-stub; product atom LLM (`PRODUCT_ATOM_PREFER_LLM=false`)

## 6. MCP capability matrix

See [`mcp-capability-matrix.md`](./mcp-capability-matrix.md). Runtime: `npm run mcp:test` PASS including allowlist drift + `contentBrain` read.

## 7. Deleted / consolidated

| Previous | Replacement | Reason | Validation |
| -------- | ----------- | ------ | ---------- |
| Route-local Idea Lab stage logic | `ild/parse-generate-request.ts` | Domain out of route | typecheck + idea-lab tests |
| Duplicate atom brand load | `load-brand-context-for-atom.ts` | Present debt | atom/produce paths |
| Lab second Brand Core load | `preloaded` on generate use case | Present debt | idea-lab generate stage |
| subjects import cycle | `label-text.ts` | Cycle gate | `check-brain-cycles.mjs` |
| Inline ask system prompt | `ask-prompt.ts` | Registry + injection split | ask security tests |
| Refrence | **Kept excluded** | Research library | boundary + retrieve + MCP |

## 8. Regression report

| Scenario | Result |
| -------- | ------ |
| Normal six directions + required angles | PASS |
| Unsupported medical claim blocked | PASS |
| Unknown provider/model fail closed | PASS |
| Prompt registry unique | PASS |
| ReviewDecision discriminated types | PASS |
| Ask: context delimiting, Refrence block, rate limit | PASS |
| Contracts + TraceRecorder | PASS |
| Full `npm test` | PASS (240) |
| `mcp:test` | PASS |
| Brain cycles | PASS |

## 9. Output-difference vs baseline

Baseline captured in `data/fixtures/stabilization/baseline-outputs/` (audit).

| Classification | Notes |
| -------------- | ----- |
| No behavior change (directions) | Deterministic provider + policy unchanged for product/Lab defaults |
| Intentional correction | Idea Lab skips redundant Brand Core reload via `preloaded` |
| Intentional correction | Ask route now auth-gated (dev bypass explicit) |
| Approved contract change | New optional `runTrace` on directions use-case result |

No accidental direction-output regression asserted via brittle full-text CI (invariant suite only).

## 10. Informational score (post-exit-criteria)

| Dimension | Score | Evidence |
| --------- | ----- | -------- |
| SoT clarity | 1.0 | Brand Core + CONTENT_BRAIN + ownership matrix |
| Code boundaries | 1.0 | architecture-boundary + Refrence fence + cycle check |
| Contract ownership | 1.0 | Five lean versioned contracts + tests |
| Workflow ownership | 0.9 | Shared use cases; bundle still recompiles Brand Core once (documented) |
| Duplication control | 0.9 | Prompt registry; loaders consolidated; ledger tracks residue |
| Docs consistency | 1.0 | Doctrine + matrices + final package |
| Regression protection | 1.0 | Stabilization suite + existing brain tests |
| Observability | 0.9 | TraceRecorder on directions; cost null when deterministic |
| MCP/integration safety | 1.0 | Matrix + drift + ask auth |
| Repo hygiene | 1.0 | Refrence exclusion integrity (not deletion) |
| **Mean (informational)** | **~0.97** | Does not override exit criteria |

## Exit criteria checklist

- [x] No P0
- [x] No known duplicate orchestration for shared directions
- [x] No known duplicate canonical contracts for the five names
- [x] No duplicate active prompt IDs
- [x] Provider policy matches executable behavior
- [x] Five contracts implemented (lean)
- [x] Six-direction invariant suite passes
- [x] Draft-level evaluation exists (PASS/FAIL/WARNING) + tested via contracts/eval module
- [x] Run traces via TraceRecorder with versions/latency
- [x] Ask route protected (auth, caps, documented rate-limit scope)
- [x] MCP source/runtime/docs agree
- [x] Refrence excluded with zero leakage (kept)
- [x] CI enforces via `validate:stabilization`
- [x] Remaining gaps documented as deferrals
