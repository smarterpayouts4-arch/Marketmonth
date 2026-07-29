---
title: MarketMonth Knowledge System
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
related_paths:
  - project-knowledge/**
  - agent-prompt-system/**
---

# MarketMonth Project Knowledge OS

## Purpose

This folder is the **living project partner** for MarketMonth: the source of truth for product doctrine, architecture, current implementation status, ownership, and engineering quality gates.

| It is | It is not |
|-------|-----------|
| Canonical knowledge for humans, Cursor agents, and MCP clients | External industry certification |
| Deterministic discovery + scoring when scripts run | A continuous file watcher (unless later added) |
| A dual-score quality system (internal + external coverage) | Proof the product is universally perfect |
| Allowlisted context for advisory AI | A channel that may send secrets or rewrite doctrine |

**What is deterministic:** maps, guardian (`PK-HARD-*` / `PK-WARN-*`), Internal Engineering Quality Score, External Baseline Coverage.  
**What is AI advisory:** `ai:audit` observations — never merged into the official score.  
**What it does not guarantee:** production readiness, OWASP certification, or zero dependency risk.

## Architecture

```text
Canonical knowledge (PRODUCT, ARCHITECTURE, CURRENT_STATE, FEATURES, …)
        ↓
Deterministic discovery (knowledge:update → maps + docs-index)
        ↓
Guardian checks (PK-HARD-* / PK-WARN-*)
        ↓
Quality scoring (quality-rules.json → Internal Engineering Quality Score)
        ↓
External Baseline Coverage (separate %)
        ↓
Advisory AI audit (allowlisted excerpts only)
        ↓
Daily closeout + CI
```

## Directory map

| Path | Purpose | Authority | Updated by | Consumers |
|------|---------|-----------|------------|-----------|
| [`PRODUCT.md`](./PRODUCT.md) | Product doctrine / loop | **canonical** | humans/agents | everyone |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Ownership & boundaries | **canonical** | humans/agents | eng / agents |
| [`CURRENT_STATE.md`](./CURRENT_STATE.md) | What works today (includes Integration Lead agent persona) | **canonical** | humans/agents after verify | eng / agents |
| [`CONTENT_BRAIN.md`](./CONTENT_BRAIN.md) | Content Brain doctrine; Brand Core = sole runtime brand SoT | **canonical** | humans/agents | eng / agents |
| [`DOMAIN_GLOSSARY.md`](./DOMAIN_GLOSSARY.md) | Canonical terminology | **canonical** | humans/agents | eng / agents |
| [`IDEA_LAB_TOPIC_STRATEGY.md`](./IDEA_LAB_TOPIC_STRATEGY.md) | Objective strategies → ranked topic candidates | supporting | humans/agents | Idea Lab |
| [`IDEA_LAB_DIRECTION_HARDENING.md`](./IDEA_LAB_DIRECTION_HARDENING.md) | Structured SelectedTopicContext → six directions | supporting | humans/agents | Idea Lab / Directions |
| [`PROJECT.md`](./PROJECT.md) | Project framing | supporting | humans | onboarding |
| [`PROTECTED-AREAS.md`](./PROTECTED-AREAS.md) | Do-not-break zones | supporting | humans | agents |
| [`QUALITY_RUBRIC.md`](./QUALITY_RUBRIC.md) | Human rubric | supporting | humans | quality scripts |
| [`EXTERNAL_QUALITY_BASELINE.md`](./EXTERNAL_QUALITY_BASELINE.md) | Practice-area map | supporting | humans | baseline engine |
| [`COMMANDS.md`](./COMMANDS.md) | Command cheat sheet | supporting | humans | humans / agents |
| [`KNOWLEDGE_CHANGELOG.md`](./KNOWLEDGE_CHANGELOG.md) | Knowledge OS history | supporting | humans | maintainers |
| [`ownership-rules.json`](./ownership-rules.json) | Owners + independence | machine SoT | humans | guardian / quality |
| [`quality-rules.json`](./quality-rules.json) | Rubric machine rules | machine SoT | humans | quality scorer |
| [`FEATURES/`](./FEATURES/) | Feature briefs | supporting | humans | agents |
| [`DECISIONS/`](./DECISIONS/) | ADRs | supporting | humans | agents |
| [`templates/`](./templates/) | Doc templates | n/a | humans | authors |
| [`scripts/`](./scripts/) | Knowledge / quality tooling | n/a | eng | npm scripts / CI |
| [`tests/`](./tests/) | Knowledge OS tests | n/a | eng | `npm test` |
| [`generated/maps/`](./generated/maps/) | ROUTE/API/ENV/OWNERSHIP | **generated** | `knowledge:update` | agents / CI |
| [`generated/indexes/`](./generated/indexes/) | Sole `docs-index.json` + manifest | **generated** | `knowledge:update` | MCP / ask |
| [`generated/reports/`](./generated/reports/) | Warnings, scores, audits | **generated** | quality / closeout | humans / CI |

Cold start for the **repo** (not duplicated here): [`docs/START_HERE.md`](../docs/START_HERE.md).  
`CONTROL_MATRIX.md` is **not** implemented — do not invent it.

Scripts write **only** under `generated/`. Never hand-edit generated files.

## Reading order

**Always (substantial work):**

1. Root [`AGENTS.md`](../AGENTS.md)
2. This README
3. [`CURRENT_STATE.md`](./CURRENT_STATE.md)

**Then task-relevant only:**

- Feature briefs in `FEATURES/`
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) / [`PRODUCT.md`](./PRODUCT.md)
- `DECISIONS/`
- Generated maps and reports under `generated/`

Do **not** read every document for every task.

## Freshness vocabulary (`last_verified`)

| Label | Meaning for agents |
|-------|-------------------|
| **current** | Safe to rely on for decisions (recently verified) |
| **stale** | Re-check against code / regenerate maps before broad work |
| **historical** | Context only — not current-state authority |
| **superseded** | Do not use for current-state decisions |

Treat area `last_verified` dates in [`CURRENT_STATE.md`](./CURRENT_STATE.md) with this vocabulary. Prefer code + generated maps when a stamp is clearly stale relative to active work.

### Change-based freshness pilot (warn-only)

On **CURRENT_STATE.md** and **PRODUCT.md** only: optional `verified_against_commit` + **narrow** `related_paths` (no `**` globs). Guardian emits `PK-WARN-008` if a listed path changed after that commit. **Never fails CI.** Broad globs are skipped. False positives expected (format-only, tests, semantic-preserving refactors). Do not expand to CONTENT_BRAIN until the signal proves useful.

Generated cold-start pointers: [`generated/indexes/agent-bootstrap.json`](./generated/indexes/agent-bootstrap.json) (from `knowledge:update`).

## Commands

Verified against root `package.json`. None of these rewrite canonical doctrine.

| Command | Reads | Writes | Can fail? | When to run |
|---------|-------|--------|-----------|-------------|
| `npm run knowledge:update` | `src/`, rules, docs | `generated/maps`, `generated/indexes` | rarely | after structural changes |
| `npm run knowledge:sync` | same + guardian | maps + `STRUCTURE_WARNINGS` | soft warn | auto on `dev`/`build` |
| `npm run knowledge:check` | committed vs regenerated | none (compare) | **yes** (stale/hard) | CI / agents / closeout |
| `npm run quality:update` | collectors + probes | `QUALITY_SCORE.*` | soft | after meaningful eng change |
| `npm run quality:check` | score artifacts | none | **yes** if stale | CI |
| `npm run ai:audit` | allowlisted docs + OpenAI | `AI_AUDIT.*` | yes if no key | advisory only |
| `npm run project:audit` | knowledge + quality checks | none | **yes** | quick gate |
| `npm run audit:deps` | lockfile | none | **yes** on high+ | CI / before release |
| `npm run daily:closeout` | full gate set + AI | `DAILY_LATEST` + daily/ | **yes** | end of day |
| `npm run knowledge:os-audit` | full audit suite (shared probes once) | `KNOWLEDGE_OS_AUDIT.*` | **yes** if closeout `NOT READY` or OS `NOT OPERATIONAL` | final Knowledge OS pass |

Canonical docs are **never** changed by these scripts.

## Score interpretation

| Score | Meaning |
|-------|---------|
| **Internal Engineering Quality Score** | Points vs MarketMonth Rubric (`quality-rules.json`, currently **2.1.0**) |
| **External Baseline Coverage** | % of recognized practice areas with executable gates |
| **Advisory AI Review** | Narrative only — cannot change official score |
| **External certification** | Always **None** unless an independent auditor says otherwise |

> A perfect internal score means all checks in the current MarketMonth rubric passed. It does not mean the project is universally perfect or externally certified.

## Warning behavior

| Kind | Where | Blocks closeout? |
|------|-------|------------------|
| Terminal / npm exit | local shell & CI logs | if exit ≠ 0 |
| Soft knowledge | `generated/reports/STRUCTURE_WARNINGS.md` (`PK-WARN-*`) | no (unless policy changes) |
| Hard knowledge | same report (`PK-HARD-*`) | **yes** |
| Quality deductions | `QUALITY_SCORE.md` (`PK-QUALITY-*`) | yes if probes fail / hard |

Acknowledgements (soft):

```text
Knowledge warnings:
- PK-WARN-003: acknowledged — intentional temporary Discovery UI split
```

Exceptions in `ownership-rules.json` need `code`, `reason`, and `expires` (YYYY-MM-DD).

`daily:closeout` statuses: `NOT READY TO CLOSE` | `READY WITH WARNINGS` | `READY TO CLOSE`.

`knowledge:os-audit` uses **two** statuses (see [`COMMANDS.md`](./COMMANDS.md)):

| Axis | Values |
|------|--------|
| Knowledge OS operational | `READY` \| `DEGRADED` \| `NOT OPERATIONAL` |
| Project closeout readiness | `READY` \| `READY WITH WARNINGS` \| `NOT READY` |

Dependency high/critical findings block **project closeout**, not Knowledge OS operational health. Documented blockers / reviewed overrides: [`DEPENDENCY_BLOCKERS.md`](./DEPENDENCY_BLOCKERS.md).

## Update lifecycle

| Moment | What runs |
|--------|-----------|
| `npm run dev` / `build` | `knowledge:sync` |
| Cursor stop (structural edits) | knowledge update/check + quality update |
| CI (`knowledge-check.yml`) | audit:deps, Gitleaks, typecheck, lint, test, knowledge/quality checks, mcp:test |
| `daily:closeout` | full deterministic gates + advisory AI |

**Not** continuously watching every save.

## Troubleshooting

| Symptom | Recovery |
|---------|----------|
| Stale generated files | `npm run knowledge:update` then `knowledge:check` |
| Failed probes | Fix typecheck/lint/test; re-run `quality:update` (not `--fast` for official) |
| AI audit unavailable | Set `OPENAI_API_KEY` in `.env.local` (never commit). Advisory only. |
| Commit SHA `unavailable` | MarketMonth nested under parent git (`gitScope: parent-repo-outside-project`). Prefer a dedicated repo root for auditor hashes. |
| `audit:deps` fails | Remediate high vulns carefully — do **not** `--force` blindly or suppress for green CI |
| Flaky typecheck | Re-run alone; avoid concurrent writers; treat unexplained flake as reliability risk |
| `NOT_EVALUATED` in score | Ran `--fast` or incomplete probes — use full `quality:update` |

Never bypass checks with `--no-verify` to “close” a day.

## Security

- Only allowlisted documents/excerpts go to AI providers (`ai-audit`, ask API, MCP docs registry).
- Secrets must never appear as **values** in generated reports (names are OK).
- AI cannot modify the official score or canonical knowledge.
- MCP cannot read `.env.local`, cannot write `project-knowledge/` or `src/`.
- Gitleaks runs in CI; see [`.gitleaks.toml`](../.gitleaks.toml).

## Adding new knowledge

| Add | How |
|-----|-----|
| Feature doc | Copy `templates/FEATURE.md` → `FEATURES/<name>.md`; set frontmatter; link related paths |
| Decision | Copy `DECISIONS/_template.md` → next number |
| Ownership rule | Edit `ownership-rules.json` `owners` (+ `publicApiEntrypoints` if others import the feature) |
| Quality rule | Edit `quality-rules.json` (keep category totals = 100) |
| Warning code | Add to `scripts/guardian/codes.mjs` and emit from hard/soft |
| Generated map | Extend `scripts/lib/scan/*` + `update.mjs` writers |
| External baseline control | Extend `scripts/lib/external-baseline.mjs` + document in `EXTERNAL_QUALITY_BASELINE.md` |

Example ownership owner:

```json
"site-seo": ["src/seo/**", "src/components/seo/**", "src/app/robots.ts"]
```

## Layers outside this folder

| Layer | Role |
|-------|------|
| APS (`agent-prompt-system/`) | Agent process only — pointer stubs to this folder |
| Discovery MCP (`mcp/`) | Allowlisted reads + LEARN tools |
| Docker MCP profile | Helpers — [`docs/ai/agent-toolchain.md`](../docs/ai/agent-toolchain.md) |
| RepoBrain | Advisory only — never overrides PRODUCT / ARCHITECTURE / CURRENT_STATE |

## Docs index

Sole authoritative index: [`generated/indexes/docs-index.json`](./generated/indexes/docs-index.json) (`schemaVersion: 1`, stable `id`, `description`, `kind`, `generated`).  
There is no second `docs/docs-index.json`.

## Ignore for product truth

- `reference-library/` (legacy: `Refrence folder/`)
- Zynava / host-product doctrine in that library
- RepoBrain vault as MarketMonth SoT
