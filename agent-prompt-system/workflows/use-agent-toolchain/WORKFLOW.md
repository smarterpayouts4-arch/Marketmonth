---
id: use-agent-toolchain
version: 1.0.0
title: Use Agent Toolchain
description: Pick the narrowest authoritative tool or knowledge source for the question.
categories:
  - investigation
  - tooling
tags:
  - mcp
  - toolchain
  - context7
  - routing
risk_levels:
  - low
  - medium
use_when:
  - Unclear which MCP, docs, or research tool to use
  - Spanning product-knowledge questions
  - Library API truth vs product doctrine
  - UI verification vs code inspection
do_not_use_when:
  - Already mid-implementation with a locked tool path
  - Trivial one-file typo with a known path
compatible_with:
  - investigate-codebase
  - implement-feature
  - plan-feature
  - test-and-verify
  - audit-existing-system
required_context:
  - PROJECT.md
  - COMMANDS.md
---

# Use Agent Toolchain

## Purpose

Make a **tool-selection** decision. This is not a general engineering playbook.

## Invariant

Use the narrowest authoritative source capable of answering the question.

## Routing table

| Need | Preferred source |
|------|------------------|
| Product truth or current state | `project-knowledge/` or `mm_read_project_doc` |
| LEARN operation (customer website) | Discovery MCP (`mm_*`) |
| Library / API behavior of an installed package | Context7 (Docker profile) |
| UI verification | Playwright (Docker) or Cursor browser |
| Current public facts | Perplexity / web (advisory) |
| Cross-repository patterns | RepoBrain (advisory only — never product SoT) |

Also see [`docs/ai/agent-toolchain.md`](../../../docs/ai/agent-toolchain.md).

## Authority hierarchy

1. **Known canonical fact** → read the relevant `project-knowledge/` document (or `mm_read_project_doc`).
2. **Question spanning several knowledge docs** → `POST /api/project-knowledge/ask` **if the Next server is up**.
3. **Ask unavailable** → `project-knowledge/generated/indexes/docs-index.json` → read canonical docs directly. Do **not** start the whole app just to answer a docs question.
4. **Live implementation detail** → generated maps + source inspection.
5. **External / current fact** → Perplexity / web (advisory).

If documentation and code disagree: **report the conflict**. Never treat ask as source of truth.

## Pointer rule

APS `project-context/` files are pointers, not doctrine. Resolve every pointer and read the canonical `project-knowledge/` document before reasoning from it.

## Steps

1. Classify the question against the routing table.
2. State the chosen source in one line (e.g. `Toolchain: Context7 for Next.js API`).
3. Call that source; if insufficient, escalate one step (index → canonical read → maps/source).
4. Do not invent doctrine from RepoBrain, YouTube transcripts, or APS stubs.

## Evidence

Label what was Verified vs Assumed about the chosen source.
