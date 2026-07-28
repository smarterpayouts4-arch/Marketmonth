---
title: MCP Capability Matrix
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - mcp/**
  - docs/ai/mcp.md
---

# MCP Capability Matrix

Discovery MCP only. No Content Brain orchestration server.

| ID | Type | Owner | Purpose | Inputs | Outputs | R/W | Data scope | Auth | Approval | Logs | Tests |
| -- | ---- | ----- | ------- | ------ | ------- | --- | ---------- | ---- | -------- | ---- | ----- |
| mm_product_overview | tool | mcp/context | Product north star + stages | none | overview JSON | R | PRODUCT.md | local stdio | none | smoke | mcp:test |
| mm_architecture_map | tool | mcp/context | Ownership / stages | none | architecture JSON | R | ARCHITECTURE.md | local stdio | none | smoke | mcp:test |
| mm_route_inventory | tool | mcp/context | Live Next routes | none | routes[] | R | src/app (excludes Refrence) | local stdio | none | smoke | mcp:test |
| mm_stage_for_request | tool | mcp/context | Suggest product stage | request text | stage + rationale | R | PRODUCT stages | local stdio | none | smoke | mcp:test |
| mm_read_project_doc | tool | mcp/context | Read allowlisted docs | documentId enum | doc text | R | PROJECT_DOCS only | local stdio | none | smoke + allowlist-drift | mcp:test |
| mm_crawl_website | tool | mcp/discovery | Crawl URL | url | crawl result | R | external URL | local stdio | none | partial | network not live in smoke |
| mm_extract_brand | tool | mcp/discovery | Brand extract | crawl/url | brand fields | R | external | local stdio | none | partial | not live smoke |
| mm_analyze_seo | tool | mcp/discovery | SEO analyze | url | SEO notes | R | external | local stdio | none | partial | not live smoke |
| mm_discover_social | tool | mcp/discovery | Social discover | url | social links | R | external | local stdio | none | partial | not live smoke |
| mm_suggest_competitors | tool | mcp/discovery | Competitor suggest | brand | suggestions | R | external | local stdio | none | partial | not live smoke |
| mm_draft_strategy | tool | mcp/discovery | Strategy draft | brand inputs | strategy | R | derived | local stdio | none | partial | not live smoke |
| mm_analyze_website | tool | mcp/discovery | Full analyze | url | bundle | R | external | local stdio | none | partial | not live smoke |
| mm_seo_status | tool | mcp/seo | SEO status | none | stale + counts | R | data/seo | local stdio | none | smoke | mcp:test |

## Allowlist notes

- Document IDs include `contentBrain`, `domainGlossary`, Idea Lab docs, stabilization log.
- Arbitrary paths rejected; `reference-library/` / `Refrence folder/` rejected; doctrine writes forbidden.
- Runtime verified by `npm run mcp:test` (fresh stdio process — not stale Cursor UI schema).

## Explicit non-capabilities

- Does not orchestrate Content Brain generation
- Does not compile Brand Core
- Does not own workflow state
- Does not write project-knowledge or src
