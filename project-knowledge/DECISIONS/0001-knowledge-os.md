---
title: Establish project-knowledge as SoT
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
---

# ADR 0001 — Canonical knowledge system

## Decision

MarketMonth product and engineering truth lives in `project-knowledge/`. APS holds portable process and pointer stubs only. Discovery MCP serves tools; it does not fork PRODUCT.md.

## Consequences

- Agents read CURRENT_STATE before assuming stages are live.
- Generated maps are script-owned under `project-knowledge/generated/`.
- RepoBrain remains advisory.
