---
title: MarketMonth Discovery MCP
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - mcp/**
  - project-knowledge/**
---

# Discovery MCP

Stdio MCP server that:

1. **Serves allowlisted knowledge** from `project-knowledge/` (and a few root docs) — never forks PRODUCT doctrine into TypeScript.
2. **Wraps the LEARN discovery engine** (`src/engine/discovery`) with SSRF checks, timeouts, size bounds, and status envelopes.

There is **no Knowledge MCP** in v1. Cursor can read files directly; `npm run knowledge:check` enforces freshness.

## Local (Cursor)

1. Copy [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example) → `.cursor/mcp.json` (gitignored).
2. Reload MCP servers in Cursor.
3. Smoke: `npm run mcp:test`

**Classification (2026-07-28):** The tracked example is safe/portable (stdio only; no tokens). Live `.cursor/mcp.json` matches the example and is **not** listed in `.cursorignore` (gitignored only). If a local copy ever gains secrets or personal paths, move those to env references and refresh the example — do not commit secrets. A `mcp.local.json` split is **DEFERRED** until Cursor + this repo verify support.

```bash
npm run mcp:server   # stdio server (protocol on stdout)
npm run mcp:test     # protocol + security smoke
```

## Tools

| Tool | Role |
|------|------|
| `mm_product_overview` | Parse PRODUCT.md |
| `mm_architecture_map` | Parse ARCHITECTURE.md |
| `mm_route_inventory` | Live `src/app/**/page.tsx` routes |
| `mm_stage_for_request` | Stage **recommendation** with rationale (guide, not authority; may return ENGINEERING/CROSS_STAGE) |
| `mm_list_project_docs` | List allowlisted document ids + metadata |
| `mm_get_agent_bootstrap` | Generated cold-start pointers (`agent-bootstrap.json`) |
| `mm_find_project_doc` | Query → candidate document ids |
| `mm_read_project_doc` | Allowlisted document by id (`DOCUMENT_NOT_REGISTERED` + alternatives when unknown) |
| `mm_crawl_website` | Bounded crawl |
| `mm_extract_brand` | Brand signals |
| `mm_analyze_seo` | SEO summary |
| `mm_discover_social` | Social links |
| `mm_suggest_competitors` | Competitor hints |
| `mm_draft_strategy` | Strategy draft (**human review required**) |
| `mm_analyze_website` | Full analyze pipeline |
| `mm_seo_status` | Read-only product site SEO intelligence status / Change Brief summary |

Document ids: see `mcp/src/security/docs-registry.ts` (includes `contentBrain`, `domainGlossary`, Idea Lab docs, `siteSeo`, `discoveryEngine`, `qualityRubric`, `agentToolchain`, `brandChangeMap`).

Full tool matrix: [`mcp-capability-matrix.md`](./mcp-capability-matrix.md). Allowlist drift is enforced in `npm run mcp:test`.

**MCP does not orchestrate Content Brain generation**, compile Brand Core, or own workflow state. It is allowlisted document access + LEARN wrappers only.

`mm_seo_status` is **not** customer-website SEO (`mm_analyze_seo`). It reads `src/seo/` intelligence memory only — no research run, no doctrine writes.

## Security

- URL tools: `http`/`https` only; blocks private IPs / localhost unless `MARKETMONTH_MCP_ALLOW_PRIVATE_NETWORK=1`.
- Docs: registry paths only; `reference-library/` (and legacy `Refrence folder/`) rejected.
- Envelopes: `complete` \| `partial` \| `failed` with redaction for secret-looking strings.
- Logs: **stderr only** (stdout is MCP protocol).

## Agent toolchain (use this with Docker catalog servers)

Full map: [`agent-toolchain.md`](./agent-toolchain.md).

Docker profile **`marketmonth_development`** includes YouTube Transcripts, Playwright, and Context7 for research + eng quality. That is **agent infrastructure**, not a second PRODUCT.md.

Activate **marketmonth-development** in Docker Desktop MCP Toolkit (do not rely only on `zynava_development`).

## Docker MCP Toolkit path (product Discovery image)

No compose file. When packaging MarketMonth Discovery into the gateway:

```text
build image (mcp/Dockerfile)
  → custom catalog entry
  → profile: marketmonth_development
  → Docker MCP gateway
```

```bash
docker build -f mcp/Dockerfile -t marketmonth-discovery-mcp:local .
```

Until the image is catalog-registered, Cursor runs Discovery via local stdio (`marketmonth-discovery`). Helper servers (YouTube, etc.) still come through `MCP_DOCKER` + the profile above.

Do not mount `.env.local` into shared catalogs; inject only the env vars the gateway profile allows.

## Authority

| Source | Role |
|--------|------|
| `project-knowledge/` | Product / engineering truth |
| APS | Agent process only |
| RepoBrain / `reference-library/` | Advisory — never overrides PRODUCT |
