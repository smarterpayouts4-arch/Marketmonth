---
title: MarketMonth Agent Toolchain
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
related_paths:
  - docs/ai/mcp.md
  - mcp/**
  - project-knowledge/**
---

# Agent toolchain (modern architecture)

MarketMonth agents use **layered tools**. Every layer has a job. Nothing outside `project-knowledge/` is product truth.

```text
project-knowledge/     → what is true (canonical)
marketmonth-discovery  → LEARN product ops (mm_*)
MCP_DOCKER profile     → research + eng helpers (YouTube, Playwright, …)
RepoBrain / Perplexity → advisory only
```

## Activate Docker profile

Profile id: **`marketmonth_development`** (exported: [`marketmonth_development.profile.yaml`](./marketmonth_development.profile.yaml))

In Docker Desktop → MCP Toolkit → select profile **marketmonth-development** (not only `zynava-development`).

Included now:

| Server | Why it’s in the architecture |
|--------|------------------------------|
| **YouTube Transcripts** | Topic research → Content Universe source material |
| **Playwright** | Visual/UX verification of MarketMonth surfaces |
| **Context7** | Accurate library docs while coding |

Optional later (add when accounts exist): GitHub Official, Sentry.

Re-import if needed:

```bash
docker mcp profile import docs/ai/marketmonth_development.profile.yaml
```

## Invariant

Use the narrowest authoritative source capable of answering the question.

APS workflow: `use-agent-toolchain` (tool selection only).

## Authority hierarchy

| Situation | Preferred source |
|-----------|------------------|
| Known canonical fact | Direct `project-knowledge/` or `mm_read_project_doc` |
| Spanning several knowledge docs | `POST /api/project-knowledge/ask` **if Next is running** |
| Ask unavailable (no server) | `project-knowledge/generated/indexes/docs-index.json` → read canonical docs directly |
| Live implementation detail | Generated maps + source |
| External / current fact | Perplexity / web (advisory) |

Ask returns `{ answer, sources: [{ path, score }], model }` — always check `sources`. Never start the whole app merely to answer a docs question. If docs and code disagree, report the conflict.

## When agents should use which tool

### Always first

1. `AGENTS.md` → `project-knowledge/README.md` → `CURRENT_STATE.md`
2. Relevant PRODUCT / ARCHITECTURE / FEATURE brief
3. Resolve APS `project-context/` stubs into canonical `project-knowledge/` (pointers, not doctrine)

### LEARN (business)

Use **`marketmonth-discovery`**: `mm_analyze_website`, crawl, brand, SEO, social, competitors, `mm_draft_strategy` (human review).

Do **not** replace website LEARN with YouTube alone.

### STRATEGIZE → Content Universe (topics)

After brand/strategy context exists:

1. Pick strategic topics / pillars from LEARN + strategy draft  
2. Use **YouTube Transcripts** (`get_transcript` / `get_timed_transcript`) on:
   - founder / brand channel videos  
   - category explainer videos the business cares about  
   - competitor content worth responding to  
3. Distill transcripts into **talking points under the chosen topic** — never into disconnected posts  

Invariant still holds: strategy-first, not asset-first.

### PRODUCE / REVIEW (later product stages)

YouTube remains a **research input**. Asset generation stays in MarketMonth surfaces when those stages go live.

### Engineering quality

| Need | Tool |
|------|------|
| Click through UI / catch layout bugs | Playwright (Docker) or Cursor browser |
| Library API truth | Context7 |
| Cross-repo patterns | RepoBrain (advisory) |
| Fresh web facts | Perplexity (advisory) |

## What we deliberately do not do

- Fork YouTube / Playwright into `mm_*` Discovery MCP in v1  
- Treat Docker catalog servers as product SoT  
- Let transcript text override PRODUCT.md or CURRENT_STATE  
- Build Content Universe from random videos with no LEARN context  

## Cursor wiring

| MCP server | Config |
|------------|--------|
| `marketmonth-discovery` | Workspace `.cursor/mcp.json` → local stdio |
| `MCP_DOCKER` | User Cursor MCP → Docker gateway; use profile `marketmonth_development` |
| `repobrain` / `perplexity` | User-level; advisory |

See also: [`mcp.md`](./mcp.md).
