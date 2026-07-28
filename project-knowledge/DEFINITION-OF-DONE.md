---
title: MarketMonth Definition of Done
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
---

# DEFINITION-OF-DONE

A substantial change is done only when:

1. **CURRENT_STATE consulted** — Do not claim Live/Planned incorrectly.
2. **Stage alignment** — Maps to a PRODUCT loop stage (or shell / orchestration / infrastructure).
3. **Strategy-first check** — Content/produce stays tied to topic → pillar → learned context.
4. **Folder ownership** — Edits in owning module; Discovery UI never imports `src/engine/discovery/`.
5. **Tokens** — Colors from `globals.css`.
6. **Knowledge freshness** — If structure/routes/API/env/schema changed: `npm run knowledge:update` and `npm run knowledge:check` pass. The Cursor **stop** hook runs update+check (+ `quality:update`) automatically when Write/StrReplace touched structural paths (`src/app`, `src/components`, `src/engine`, `src/db`, `.env.example`, `project-knowledge/**`). Hard failure → task is **not** complete.
7. **Quality score** — After structural work, refresh with `npm run quality:update` (or `project:audit`). Treat the score as evidence-backed against [`QUALITY_RUBRIC.md`](./QUALITY_RUBRIC.md), not as absolute truth. Note open `PK-QUALITY-*` deductions in closeout when relevant.
8. **Structured warnings** — Remaining soft warnings acknowledged as `PK-WARN-NNN: acknowledged — <reason>`.
9. **Evidence labels** — Verified / Partially verified / Not verified / Blocked / Assumed.
10. **Checks** — Relevant lint / typecheck / `mcp:test` when MCP touched.

## Warning acknowledgement format

```text
Knowledge warnings:
- PK-WARN-003: acknowledged — intentional temporary Discovery UI split
```

## Knowledge / APS integrity

- [ ] Product authority lives only in `project-knowledge/PRODUCT.md` (APS stub is pointer-only)
- [ ] `AGENTS.md` / `START_HERE.md` point at `project-knowledge/`
- [ ] Sole docs index is `project-knowledge/generated/indexes/docs-index.json`
- [ ] `npm run knowledge:check` passes hard rules
- [ ] `npm run quality:check` passes when quality reports are committed (CI)
- [ ] Official quality score remains deterministic-only (no silent AI merge)
