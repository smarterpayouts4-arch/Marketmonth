---
title: Agent auditor playbook
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - AGENTS.md
  - project-knowledge/CURRENT_STATE.md
  - project-knowledge/generated/indexes/agent-bootstrap.json
  - docs/ai/agent-toolchain.md
  - mcp/src/security/docs-registry.ts
---

# Agent auditor playbook

Thin navigation checklist — **links only**. Do not treat this file as product doctrine.

## Cold start (token-efficient)

1. [`AGENTS.md`](../../AGENTS.md)
2. Bootstrap: `mm_get_agent_bootstrap` **or** `mm_read_project_doc(agentBootstrap)` **or** [`agent-bootstrap.json`](../../project-knowledge/generated/indexes/agent-bootstrap.json)
3. [`project-knowledge/CURRENT_STATE.md`](../../project-knowledge/CURRENT_STATE.md)
4. Task doc via `mm_list_project_docs` / `mm_find_project_doc` → `mm_read_project_doc` **or** docs-index → one FEATURE/ADR

Optional workflow formatter (not a required door): `npm run agent:preflight -- --workflow <id>` — resolves APS `required_context` only.

Do **not** dump all ADRs or all of `project-knowledge/` every turn.

## Tool doors (same files on disk)

| Need | Tool / path |
|------|-------------|
| List allowlisted docs | `mm_list_project_docs` |
| Find doc by query | `mm_find_project_doc` |
| Read one doc by id | `mm_read_project_doc` |
| Bootstrap pointers | `mm_get_agent_bootstrap` or `mm_read_project_doc(agentBootstrap)` |
| Repo MCP health | `npm run mcp:doctor` (Cursor catalog **not observable**) |
| Customer website LEARN | `mm_crawl_website` / `mm_analyze_website` (heuristics; not 2026 certification) |
| Eng quality of **this** repo | `npm run quality:*` / shell reports (cursorignored except STRUCTURE_WARNINGS) |

Unknown MCP id → envelope `DOCUMENT_NOT_REGISTERED` + `availableAlternatives` → call `mm_list_project_docs` / `mm_find_project_doc`.

## Reality vs vision

- Live / Partial / Mocked / Planned → **CURRENT_STATE** only
- Product loop vision → **PRODUCT**
- Eng Knowledge OS READY ≠ product next-phase complete ≠ website BP auditor

## Freshness vocabulary

| Label | Agent behavior |
|-------|----------------|
| **current** | Safe to rely on for decisions |
| **stale** | Verify against code / regenerate maps before broad work |
| **historical** | Context only |
| **superseded** | Do not use for current-state decisions |

Pilot change-based warnings (`verified_against_commit` + narrow `related_paths`) exist for CURRENT_STATE + PRODUCT only — warn-only, never CI-fail. See project-knowledge README.

## Intentional non-reads

Secrets (`.env*`), `data/runtime/`, `reference-library/`, quality score noise under `generated/reports/` (except STRUCTURE_WARNINGS). Use Shell only when debugging runtime evidence.

## Next.js API truth

Read [`node_modules/next/dist/docs/`](../../node_modules/next/dist/docs/) (narrowly re-included in `.cursorignore`). Do not invent Next APIs from training memory.

## Website “2026 best-practice” auditor

Not shipped. LEARN tools are heuristic. See [`FEATURES/website-best-practice-auditor.md`](../../project-knowledge/FEATURES/website-best-practice-auditor.md) (deferred product track).

---

## Group B — two-phase cold-agent evaluation

Status: **`MANUAL_CHECK_REQUIRED`**. Tests **Wave A/B + near-1 enforcement** (thin bootstrap rule). Record commit SHA used for each round.

### Preconditions

1. Reload Discovery MCP in Cursor
2. `npm run mcp:doctor` → repository server healthy; required tools + legacy bootstrap fallback healthy
3. Cursor Settings → Indexing → **Sync** (wait until finished)

### Six questions (same set every chat)

No `@file`. Fresh chat. No carryover.

1. Which product areas are Live, Partial, Mocked, Planned? → `CURRENT_STATE.md`
2. Is Review/Publish safe to treat as implemented? → `CURRENT_STATE` (Planned/shells)
3. Where is canonical Content Brain doctrine? → `CONTENT_BRAIN.md` / `contentBrain`
4. Which command is the Content Brain stability gate? → `validate:stabilization`
5. May Discovery MCP modify project doctrine? → No
6. Where should Next.js API truth be obtained? → `node_modules/next/dist/docs/`

Also probe when applicable: unknown MCP document ID recovery (`mm_list` / `mm_find` / alternatives); do not invent the 2026 website auditor.

### Hard failures (fail the round)

- Wrong Live / Partial / Mocked / Planned classification
- Invented 2026 website auditor capability
- Inaccessible required path (instructed-but-unreadable)
- Reliance on superseded / noncanonical source as authority
- Inability to recover from unknown MCP document ID
- Omission of `CURRENT_STATE` for audit work

Minor source-order variation does **not** fail. **Context efficiency:** measure and note; not a hard gate.

### Phase A — Diagnostic

- **2 models × 3 fresh chats = 6 chats**
- Learn recurring failures; remediate before demanding perfection

### Phase B — Confirmation

- After fixes: **two more identical rounds** (12 chats)
- Strong near-1 claim needs **three clean rounds** total (up to 18 chats) — only after known problems are fixed

### Results sheet

Record also in [`cursor-context-and-indexing-audit.md`](./cursor-context-and-indexing-audit.md).

| Field | Value |
|-------|-------|
| Commit SHA | |
| Config notes (MCP reloaded? Sync done?) | |
| Round | Diagnostic / Confirmation-1 / Confirmation-2 |
| Model | |
| Chat # | 1–3 |
| Hard-fail? (Y/N + which) | |
| Context efficiency notes | |
| Pass/Fail | |

---

## Operator sequence

```text
Reload Discovery MCP → npm run mcp:doctor → Cursor Index Sync
  → Group B Phase A (6 chats) → fix recurring failures
  → Group B Phase B (two rounds) → stop readiness infra if stop conditions met
```

## Stop conditions (end readiness infrastructure)

Stop adding agent-readiness infrastructure when all are true:

- Required MCP tools appear in repository-side `mcp:doctor`
- Bootstrap fallback works
- Fresh agents consistently read `CURRENT_STATE`
- Status classification correct
- No invented website auditor
- Agents recover from unknown MCP IDs
- No instructed path inaccessible
- Remaining failures are model-quality, not repository-navigation

Then return effort to **product and release blockers**.

## Claims matrix

**Supported by static gates (this pass):**

- Required MCP tools exist in the live repository server
- Bootstrap rule installed and always applied
- Required project documents are readable
- Workflow context resolvable via minimal `agent:preflight` formatter
- Freshness warnings exist for CURRENT_STATE + PRODUCT (pilot)

**Supported only after Group B confirmation:**

- Fresh agents reliably select canonical sources
- Near-1 experienced readability
- Updated MCP tools visible in Cursor after reload/Sync (human observation)
- Routing consistently prevents capability invention

**Still unsupported:**

- 2× agent productivity / faster feature delivery
- CI or release readiness improved
- Complete 2026 customer-site audit product
- Rating 1 for every model

## Wave A/B + Near-1 static evidence

| Gate | Result | Label |
|------|--------|-------|
| `npm run validate:cursor-context` | PASS (Group A) | **Verified** (prior) |
| `npm run mcp:doctor` | Run after install | Operator |
| `npm run agent:preflight -- --workflow audit-existing-system` | Formatter only | Operator |
| Thin bootstrap rule (`.cursor/rules/agent-bootstrap.mdc`) | Installed via APS | **Verified** after `aps:install` |
| Cursor Index Sync + Group B | Operator-owned | **Not verified** until rounds recorded |
