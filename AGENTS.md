<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MarketMonth — agent entry

## Always read (substantial work)

1. This file  
2. [`project-knowledge/README.md`](project-knowledge/README.md) — knowledge system  
3. [`project-knowledge/CURRENT_STATE.md`](project-knowledge/CURRENT_STATE.md) — what is actually live  

## Then by task

| Task | Read |
|------|------|
| Product / UX | [`project-knowledge/PRODUCT.md`](project-knowledge/PRODUCT.md) |
| Structure / ownership | [`project-knowledge/ARCHITECTURE.md`](project-knowledge/ARCHITECTURE.md) |
| Feature-specific | `project-knowledge/FEATURES/<feature>.md` |
| Data | [`project-knowledge/DATA_MODEL.md`](project-knowledge/DATA_MODEL.md) |
| Tool / MCP choice | APS workflow `use-agent-toolchain` + [`docs/ai/agent-toolchain.md`](docs/ai/agent-toolchain.md) |

Then follow **APS** (`.cursor/rules/agent-prompt-router.mdc`): classify → ≤3 workflows → resolve pointers → task spec → evidence labels.

```text
APS = how agents work
project-knowledge/ = what is true about MarketMonth
Discovery MCP = LEARN tool capabilities
Docker profile marketmonth_development = YouTube / Playwright / Context7 helpers
```

Do not merge them. APS `project-context/` files are pointers, not doctrine. Resolve every pointer and read the canonical `project-knowledge/` document before reasoning from it.

## Authority hierarchy

| Situation | Preferred source |
|-----------|------------------|
| Known canonical fact | Direct `project-knowledge/` or `mm_read_project_doc` |
| Spanning several knowledge docs | `POST /api/project-knowledge/ask` **if Next is running** |
| Ask unavailable (no server) | [`docs-index.json`](project-knowledge/generated/indexes/docs-index.json) → read canonical docs |
| Live implementation | Generated maps + source |
| External / current fact | Perplexity / web (advisory) |

Never start the whole app just to answer a docs question. If docs and code disagree, report the conflict — ask is a spanning reader, not SoT.

## Invariants

- **Strategy-first, not asset-first.**  
- **Content Universe** = coordinated family from one narrative.  
- Customer- and industry-agnostic.  
- Colors from `src/app/globals.css`.  
- Discovery UI never imports `src/engine/discovery/`.  
- Ignore `reference-library/` (and legacy `Refrence folder/` if present) and RepoBrain for product truth. Read `reference-library/` only when a user or approved workflow explicitly names a path.

## Docs index (sole)

[`project-knowledge/generated/indexes/docs-index.json`](project-knowledge/generated/indexes/docs-index.json)

## Commands

```bash
npm test
npm run typecheck
npm run lint
npm run quality:update
npm run knowledge:update
npm run knowledge:check
npm run knowledge:guardian
npm run mcp:test
node agent-prompt-system/scripts/install.mjs
node agent-prompt-system/scripts/validate.mjs
```

Official quality score requires full `npm run quality:update` (probes). Do **not** treat `quality:update --fast` as the official score.

After editing APS adapters, re-run `install.mjs` — do not hand-edit `.cursor` APS copies.
