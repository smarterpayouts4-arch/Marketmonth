---
title: Website best-practice auditor (deferred)
status: planned
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - mcp/src/tools/**
  - src/engine/discovery/**
  - docs/ai/agent-auditor-playbook.md
related_features:
  - discovery-engine
  - website-best-practice-auditor
---

# FEATURE: Website best-practice auditor (deferred)

## Purpose

**Not shipped.** Product track for a versioned customer-site auditor that scores against an explicit 2026 marketing/SEO/a11y/performance rubric with evidence collectors.

Today’s Discovery LEARN tools (`mm_crawl_website`, `mm_analyze_seo`, `mm_analyze_website`, …) produce **heuristics**, not certification. Do not present LEARN output as a complete 2026 best-practice audit score.

## Planned ownership (when built)

| Layer | Intent |
|-------|--------|
| Rubric | Versioned checklist under project-knowledge (new ADR + FEATURE update) |
| Collectors | Bounded evidence (on-page, CWV/Lighthouse/a11y as separate collectors) |
| MCP / API | Read-only audit report envelope; doctrine writes still forbidden |
| UI | Optional customer-facing report — not required for v1 engine |

## Boundaries

- LEARN heuristics ≠ this feature.
- Perplexity / web research is advisory only.
- Eng-only `EXTERNAL_QUALITY_BASELINE` scores **this repo**, not customer sites.

## Status

**Planned** — deferred product track. See [`agent-auditor-playbook.md`](../../docs/ai/agent-auditor-playbook.md).
