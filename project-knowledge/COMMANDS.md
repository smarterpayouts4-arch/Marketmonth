---
title: MarketMonth Commands
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
---

# COMMANDS

```bash
npm run dev                    # auto-runs knowledge:sync then Next.js
npm run build                  # auto-runs knowledge:sync then production build
npm run start
npm run lint
npm run typecheck
npm run audit:deps             # npm audit --audit-level=high (exit on high+; lower severities still exist)
npm run knowledge:os-audit     # dual-status audit → KNOWLEDGE_OS_AUDIT.* (see statuses below)
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
npm run knowledge:sync         # maps + guardian (predev/prebuild)
npm run knowledge:update       # regenerate generated/maps + indexes
npm run knowledge:check        # exact stale compare + guardian hard-fail (CI / agents)
npm run knowledge:guardian     # STRUCTURE_WARNINGS report only
npm run knowledge:test-routes  # resolve-next-route unit tests
npm test                       # feature tests (node:test) + route resolver tests
npm run quality:update         # full QUALITY_SCORE with typecheck/lint/test probes
npm run quality:update:fast    # structural score only (probes NOT_EVALUATED)
npm run quality:check          # exact stale compare (requires complete probes)
npm run ai:audit               # advisory OpenAI audit (does not change official score)
npm run daily:closeout         # end-of-day gates + DAILY_LATEST report
npm run project:audit          # knowledge:check && quality:check
npm run validate:stabilization # Content Brain health gate (typecheck/lint/test/knowledge/mcp)
npm run verify:select-to-atom  # select→atom acceptance gate (P0–P2 static checks)
npm run inspect:content-atom   # live pipeline → atom readable dump (eng)
npm run walkthrough:company-to-atom # company→topics→directions→atom walkthrough (eng)
npm run spike:atom-depth       # throwaway LLM depth spike (not a product gate)
npm run resanitize:company-csv # safe camel-glue CSV repair with backup (eng utility)
npm run mcp:server             # Discovery MCP stdio
npm run mcp:test               # MCP protocol smoke
npm run seo:verify             # brand + crawl + metadata foundation checks
npm run seo:verify-brand       # fail on forbidden stale product-name hard-codes
npm run brand:impact           # categorized rename/domain impact report (planning)
npm run seo:review             # on-demand SEO Change Brief (audits-only)
npm run seo:review:full        # on-demand review with Perplexity research
npm run seo:review:weekly      # weekly intelligence job entrypoint
npm run seo:review:site-change # post-deploy lightweight review
npm run seo:readiness          # origin hard-fail, persistence, research failure, MCP minimization
```

Brand / domain treatments (A name, B domain, C both): [`BRAND_CHANGE_MAP.md`](./BRAND_CHANGE_MAP.md).

`npm run dev` / `npm run build` refresh knowledge maps before the app starts. Full quality probes run via `quality:update`, CI, stop-hook, or `daily:closeout`.

Note: `npm warn Unknown env config "devdir"` comes from Cursor’s sandbox env (`npm_config_devdir`), not from this repo’s `.npmrc`. Safe to ignore locally; it is not a MarketMonth config debt.

See [`QUALITY_RUBRIC.md`](./QUALITY_RUBRIC.md) (Internal Engineering Quality Score, Rubric **2.1.0**) and [`EXTERNAL_QUALITY_BASELINE.md`](./EXTERNAL_QUALITY_BASELINE.md) (separate coverage %). Official score is deterministic (+ probes); AI review is advisory and never changes the official number. CI also runs `audit:deps` and Gitleaks. Reviewed dependency blockers / overrides: [`DEPENDENCY_BLOCKERS.md`](./DEPENDENCY_BLOCKERS.md).

## `knowledge:os-audit` status vocabulary

Two independent axes (never conflate):

| Axis | Values | Meaning |
|------|--------|---------|
| **Knowledge OS operational** | `READY` \| `DEGRADED` \| `NOT OPERATIONAL` | Maps, knowledge/quality checks, MCP. Finding dependency vulns proves the gate works — it does **not** mark Knowledge OS broken. |
| **Project closeout readiness** | `READY` \| `READY WITH WARNINGS` \| `NOT READY` | Required probes + high/critical dependency security. Blocks release/closeout when high/critical remain without a safe stable fix. |

- Process exits nonzero when closeout is `NOT READY` or Knowledge OS is `NOT OPERATIONAL`.
- `READY` never means externally certified.
- `project:audit` is a convenience for `knowledge:check && quality:check`; `knowledge:os-audit` runs those shared probes once (not twice).
- `--audit-level=high` only controls the `audit:deps` exit code; the OS audit report still counts critical / high / moderate / low.

## Agent Prompt System

```bash
node agent-prompt-system/scripts/install.mjs
node agent-prompt-system/scripts/validate.mjs
```

Open [http://localhost:3000](http://localhost:3000) — `/` landing; app shell under `/dashboard`.
