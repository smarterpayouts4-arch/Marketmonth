# MarketMonth — START HERE

## What this is

**MarketMonth** is a **customer- and industry-agnostic AI marketing operating system**. It learns each business and turns a handful of good monthly ideas into a coordinated content system, then learns from what performed.

## Where truth lives

| Need | Document |
|------|----------|
| Knowledge system | [`project-knowledge/README.md`](../project-knowledge/README.md) |
| What works today | [`project-knowledge/CURRENT_STATE.md`](../project-knowledge/CURRENT_STATE.md) |
| Product doctrine | [`project-knowledge/PRODUCT.md`](../project-knowledge/PRODUCT.md) |
| Architecture | [`project-knowledge/ARCHITECTURE.md`](../project-knowledge/ARCHITECTURE.md) |
| Quality rubric (internal score) | [`project-knowledge/QUALITY_RUBRIC.md`](../project-knowledge/QUALITY_RUBRIC.md) |
| External baseline (coverage %) | [`project-knowledge/EXTERNAL_QUALITY_BASELINE.md`](../project-knowledge/EXTERNAL_QUALITY_BASELINE.md) |
| **Docs index (sole)** | [`project-knowledge/generated/indexes/docs-index.json`](../project-knowledge/generated/indexes/docs-index.json) |

APS (`agent-prompt-system/`) is **process only** — its `project-context/` files are pointer stubs.

### Quality dual-score (do not merge)

| Score | Meaning |
|-------|---------|
| **Internal Engineering Quality Score** | Points vs MarketMonth Rubric **2.1.0** (`quality-rules.json`) — deterministic collectors + probes |
| **External Baseline Coverage** | % of recognized practice areas with executable gates — not certification |

Honest wording: internal 10/10 is **not** industry-certified. AI audit (`ai:audit`) is advisory only. Commit SHA may be `unavailable` when MarketMonth is nested under a parent git root.

## Product loop (summary)

1. LEARN → 2. STRATEGIZE → 3. CONTENT UNIVERSE → 4. PRODUCE → 5. REVIEW + SCHEDULE → 6. PUBLISH + LEARN  

**Invariant:** strategy-first, not asset-first. Check CURRENT_STATE before assuming a stage is live.

## Current prototype (high level)

- Next.js + tokens from `src/app/globals.css`
- Landing + Discovery analyze (`POST /api/discovery/analyze`)
- App shell routes under `src/app/(app)/`
- Details: CURRENT_STATE.md

## Agent process

```bash
npm run knowledge:update && npm run knowledge:check
node agent-prompt-system/scripts/install.mjs
node agent-prompt-system/scripts/validate.mjs
npm run mcp:test
```

Toolchain (Discovery MCP + Docker helpers including YouTube): [`docs/ai/agent-toolchain.md`](ai/agent-toolchain.md).  
In Docker Desktop MCP Toolkit, use profile **marketmonth-development**.

## Ignore for product truth

- `reference-library/` (and legacy `Refrence folder/` if present)
- Zynava / host-product doctrine in that folder  
- RepoBrain vault as MarketMonth SoT  
