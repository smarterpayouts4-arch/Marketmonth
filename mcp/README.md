# Discovery MCP (MarketMonth)

Operational LEARN tooling for Cursor / MCP clients. **Not** the product knowledge SoT.

## May

- Read **allowlisted** documents via `mm_read_project_doc(<documentId>)` only  
  (see `src/security/docs-registry.ts`)
- Invoke discovery engine operations (crawl, brand, SEO, strategy drafts)
- Return results and drafts

## Must not

- Modify canonical knowledge under `project-knowledge/`
- Modify application source under `src/`
- Write generated maps, indexes, or reports
- Accept arbitrary filesystem paths from the model

## Commands

```bash
npm run mcp:server
npm run mcp:test
```

Full ops notes: [`docs/ai/mcp.md`](../docs/ai/mcp.md).

Product truth: `project-knowledge/`. Process: `agent-prompt-system/`.
