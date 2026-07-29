---
title: Cursor Context and Indexing Audit
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - .cursorignore
  - .gitignore
  - docs/ai/cursor-context-and-indexing-policy.md
  - scripts/validate-cursor-context.mjs
---

# Cursor context and indexing audit

Audit date: **2026-07-28**. Policy: [`cursor-context-and-indexing-policy.md`](./cursor-context-and-indexing-policy.md).

## Executive verdict

| Question | Answer |
| -------- | ------ |
| Is the current setup healthy? | **PARTIAL → improved.** Defense-in-depth `.cursorignore` + policy + Group A validator are in place. Group B (post-Sync retrieval) remains operator-owned. |
| Is Cursor receiving excessive noise? | **Reduced by config.** Reports, runtime, secrets, reference-library, Idea Lab Flow binaries, and bak debris are excluded. Confirm after Sync (`MANUAL_CHECK_REQUIRED`). |
| Are canonical documents retrievable? | **Yes at structure level** (Group A PASS). Semantic index retrieval: `MANUAL_CHECK_REQUIRED`. |
| Are sensitive or runtime files exposed? | **Defense-in-depth applied.** Still not a security boundary alone — layered secrets policy applies. Direct-read spot-check: `MANUAL_CHECK_REQUIRED`. |
| Is the reference library correctly quarantined? | **Yes** (gitignore + cursorignore + retrieve/MCP/boundary; README refreshed). |
| Is an index rebuild recommended? | **No.** Recommendation: **Keep + Sync** after these ignore changes. Rebuild only if stale/corrupt after Sync. |

Gitignored paths are normally excluded from Cursor folder context, but `.cursorignore` is used as **defense-in-depth** for secrets, runtime artifacts, generated noise, and noncanonical references. Direct-read behavior must be verified in the active Cursor mode (`MANUAL_CHECK_REQUIRED`).

## Evidence table (classification)

| Path or pattern | Current role | Canonical? | Should Cursor index? | Current exclusion evidence | Recommended action |
| --------------- | ------------ | ---------: | ----------------------: | -------------------------- | ------------------ |
| `src/` (app/brain/engine) | Active application | Yes (code) | Yes | None | Keep |
| `mcp/` | Discovery MCP | Yes (code) | Yes | None | Keep |
| `project-knowledge/*.md` | Product/eng doctrine | Yes | Yes | None | Keep |
| `docs/ai/` | Agent/MCP operating docs | Supporting | Yes | None | Keep |
| `project-knowledge/generated/indexes/` | Sole docs-index | Yes (generated nav) | Yes | None | Keep |
| `project-knowledge/generated/maps/` | Route/API/ownership maps | Yes (generated nav) | Yes | None | Keep |
| `STRUCTURE_WARNINGS.md` | Guardian signal | Yes (ops) | Yes | Negation under reports/ | Keep; verify after Sync |
| `project-knowledge/generated/reports/**` | Quality/audit noise | No | No | `.cursorignore` | Exclude |
| `data/fixtures/` | Zynava CSV fixtures | Partial | Light yes | None | Keep |
| `data/runtime/` | History / Idea Lab runs | No | No | gitignore + cursorignore | Exclude |
| `data/seo/*.json` | SEO runtime memory | No | No | gitignore + cursorignore | Exclude |
| `.env.local` / `.env*` | Secrets | No | No | gitignore + cursorignore | Exclude; layered security |
| `.env.example` | Env template | Yes (template) | Yes | Negation | Keep |
| `node_modules/`, `.next/`, coverage, logs | Deps/build | No | No | gitignore + cursorignore | Exclude |
| `reference-library/` | Noncanonical research | No | No (opt-in) | gitignore + cursorignore | Keep quarantined |
| `Refrence folder/` | Legacy name | No | No | gitignore + cursorignore | Exclude if present |
| `.cursor/mcp.json.example` | Safe MCP wiring | Yes (ops) | Yes | None | Keep |
| `.cursor/mcp.json` | Local MCP copy | Ops (gitignored) | Not force cursorignored | gitignore only | Classified safe; do not auto-exclude |
| `src/.../Flow Refernce/**` | Non-runtime PDF/txt | No | No | `.cursorignore` | Exclude now; **DEFERRED** move |
| `.cursor/**/*.bak-*` | Stale APS backups | No | No | Deleted + ignore | Deleted 2026-07-28 |
| Cursor Docs UI | External docs list | N/A | N/A | Not in repo | `MANUAL_CHECK_REQUIRED` |

### Categories

- **A — Must be automatic:** `src/`, `mcp/`, tests, scripts, canonical PK, `docs/ai/`, indexes/maps, `STRUCTURE_WARNINGS.md`, policy/provider/contracts, `.env.example`, mcp example
- **B — When useful:** `data/fixtures/`, APS under `.cursor/rules` & skills
- **C — Must exclude:** deps, build, runtime, secrets, reports (except warnings), caches, logs, bak debris, Flow Refernce binaries
- **D — Manual opt-in only:** entire `reference-library/`

### `.cursor/mcp.json` classification

| File | Secrets? | Decision |
| ---- | -------- | -------- |
| `.cursor/mcp.json.example` | No — portable stdio only | Tracked + indexable |
| Live `.cursor/mcp.json` | No — identical to example (2026-07-28) | Gitignored; **not** in `.cursorignore` |
| `mcp.local.json` split | N/A | **DEFERRED** (loader support unverified) |

## Findings table

| Finding | Evidence | Risk | Priority | Fix | Status |
| ------- | -------- | ---- | -------- | --- | ------ |
| Thin `.cursorignore` (reference only) | Prior file content | High context noise / weak defense-in-depth | P0 | Expanded pattern set | **COMPLETE** |
| Secrets not in `.cursorignore` | Prior gap | Context exposure risk (not sole security) | P0 | `.env` patterns + layered policy | **COMPLETE** |
| Runtime / reports noise | `data/runtime`, `generated/reports` | Stale or wrong “truth” | P1 | Excluded | **COMPLETE** |
| Stale `.cursor` `*.bak-*` | 14 files under rules/skills/hooks | Stale agent instructions | P1 | Deleted + ignore pattern | **COMPLETE** |
| Idea Lab PDF under `src/` | `Flow Refernce/*.pdf` | Binary noise; wrong layer | P2 | cursorignore now; relocate later | **PARTIAL** (exclude COMPLETE; move DEFERRED) |
| No indexing policy | Missing docs | Drift | P1 | Policy + audit docs | **COMPLETE** |
| Grep ≠ semantic index | Plan amendment | False confidence | P1 | Dual Group A/B | **COMPLETE** (A automated; B manual) |
| External Docs list | UI-only | Duplicate local docs | P2 | Checklist | `MANUAL_CHECK_REQUIRED` |
| Post-Sync retrieval | UI-only | Wrong sources | P1 | Fresh-chat checklist | `MANUAL_CHECK_REQUIRED` |
| STRUCTURE_WARNINGS negation | `ignore` lib matches in Group A | Cursor may differ | P2 | Verify after Sync | `MANUAL_CHECK_REQUIRED` |

## Final inclusion policy

Remain indexed / agent-available:

- `src/**` (except Flow Refernce binaries)
- `mcp/**`
- `scripts/**`, active tests
- `project-knowledge/**` canonical + indexes + maps + `STRUCTURE_WARNINGS.md`
- `docs/**` (including `docs/ai/`)
- `agent-prompt-system/**`
- `data/fixtures/**` (not `*.bak*`)
- Config: `package.json`, `tsconfig*.json`, `AGENTS.md`, `.env.example`, `.cursor/mcp.json.example`
- Active `.cursor/rules` and `.cursor/skills` (non-bak)

## Final exclusion policy (`.cursorignore`)

See [`.cursorignore`](../../.cursorignore). Summary:

| Pattern | Why |
| ------- | --- |
| `.env` / `.env.*` / `!.env.example` | Secrets defense-in-depth |
| `node_modules/`, `.next/`, `out/`, `dist/`, `build/`, `coverage/`, `.cache/`, `tmp/`, `temp/`, `*.log`, `*.tsbuildinfo` | Deps/build/noise |
| `data/runtime/`, `data/seo/*.json` | Runtime history ≠ doctrine |
| `reference-library/`, `Refrence folder/` | Noncanonical opt-in |
| `project-knowledge/generated/reports/**` + `!…/STRUCTURE_WARNINGS.md` | Report noise; keep guardian signal |
| `.cursor/hooks/.aps-*.json`, `.cursor/**/*.bak-*`, `**/*.bak*` | Session/backup debris |
| `src/app/dev/brain/idea-lab/Flow Refernce/**` | Non-runtime binaries in src |

**Not excluded:** `.cursor/mcp.json` (classified safe; gitignored only).

## Group A — Repository structure tests

Command: `npm run validate:cursor-context`  
Result (2026-07-28): **PASS**

Proves: required files exist; canonical paths not matched by `.cursorignore`; forbidden patterns match; gitignore agreement on secrets/runtime/reference; no `reference-library` imports under `src/`/`mcp/`; README keywords; mcp example portable.

Does **not** prove Cursor semantic index quality.

### Structure smoke map (expected sources)

| # | Question | Expected canonical source | Structure evidence | Pass/Fail |
| - | -------- | ------------------------- | ------------------ | --------- |
| 1 | Where is Brand Core compiled? | `src/brain/core/compile-brand-core.ts` (`compileBrandCore`); entry `get-brand-core.ts` | File exists; not cursorignored | **PASS** (structure) |
| 2 | Canonical Content Brain workflow? | `project-knowledge/CONTENT_BRAIN.md` | Exists; not ignored | **PASS** (structure) |
| 3 | Current implementation status? | `project-knowledge/CURRENT_STATE.md` | Exists; not ignored | **PASS** (structure) |
| 4 | Provider policy owned? | `src/brain/policy/provider-policy.ts` | Exists; not ignored | **PASS** (structure) |
| 5 | MCP project docs allowlisted? | `mcp/src/security/docs-registry.ts` (`PROJECT_DOCS`) | Exists; not ignored | **PASS** (structure) |
| 6 | Six-direction contract? | Content Brain doctrine + validators (e.g. intelligent-v1 `validate.ts` expects 6) | Doctrine + code present | **PASS** (structure) |
| 7 | Project Knowledge retrieval? | `src/lib/project-knowledge/retrieve.ts` (`SEED_DOCS`, `BLOCKED_PREFIXES`) | Exists | **PASS** (structure) |
| 8 | Is reference-library part of runtime generation? | **No** — blocked retrieve/MCP/boundary; README noncanonical | Import scan clean; quarantine docs | **PASS** (structure) |
| 9 | Zynava fixture loaded? | `data/companies/zynava.com/approved.csv` + `src/lib/dev/load-zynava-fixture.ts` / `getBrandCore` fixture adapter | Fixtures kept indexable | **PASS** (structure) |
| 10 | Dev-only / deferred behavior? | `CURRENT_STATE.md`, Gate 2 Partial in CONTENT_BRAIN, `PRODUCT_ATOM_PREFER_LLM=false` in provider-policy | Docs + policy present | **PASS** (structure) |

Irrelevant reference-library auto-results: **none expected** after ignore (confirm Group B).

## Group B — Actual Cursor retrieval tests

Status: **`MANUAL_CHECK_REQUIRED`** (cannot be CI-gated — Cursor product index)

Canonical protocol, hard-fail definition, two-phase matrix, and results sheet: [`agent-auditor-playbook.md`](./agent-auditor-playbook.md) (Group B section).

### Operator sequence

1. Reload Discovery MCP → `npm run mcp:doctor` (repo server healthy; Cursor catalog **not observable**)
2. Cursor Settings → Indexing → **Sync** (do not Delete unless corrupted)
3. **Phase A diagnostic:** 2 models × 3 fresh chats (6) — learn failures
4. Remediate recurring issues
5. **Phase B confirmation:** two more identical rounds before claiming near-1
6. Stamp each round with **commit SHA** + config notes (tests Wave A/B + near-1 bootstrap rule)

### Structure prompts (optional extras; fresh chat)

1. Where is Brand Core compiled?
2. What document defines the canonical Content Brain workflow?
3. Where is provider policy defined?
4. Is the reference library part of runtime generation?
5. Where are MCP project documents allowlisted?
6. Where should Next.js API truth be obtained for this repo?

| Prompt | Sources Cursor selected | Canonical appeared? | Stale/reference hit? | `@` required? | Pass/Fail |
| ------ | ----------------------- | ------------------- | -------------------- | ------------- | --------- |
| (fill after Sync) | | | | | |

Also verify manually:

- [ ] `STRUCTURE_WARNINGS.md` still retrievable after Sync
- [ ] `node_modules/next/dist/docs/` readable / citeable after Sync
- [ ] `.env.local` / `data/runtime/` not in automatic folder context
- [ ] `reference-library/` absent unless explicitly attached
- [ ] Playbook Group B results sheet filled (commit SHA + rounds)

## External Docs manual checklist

Status: **`MANUAL_CHECK_REQUIRED`**

Cursor Settings → Indexing & Docs → Docs:

- [ ] Internal repo docs (`CONTENT_BRAIN.md`, PK, `docs/ai/*`) were **not** re-added as external Docs
- [ ] Old/duplicate Doc sources removed
- [ ] Remaining Docs are official and version-relevant (e.g. Next.js, Auth.js, Zod, MCP, OpenAI, Cursor)
- [ ] Each Doc has a clear reason
- [ ] No conflict with installed package versions (`package.json`)

## Codebase index health checklist

Status: **`MANUAL_CHECK_REQUIRED`**

- [ ] Index completion percentage
- [ ] Indexed file count looks plausible (not millions of `.next` files)
- [ ] Indexing not stuck
- [ ] Excluded folders do not appear in included-file views
- [ ] Recently changed canonical files can be retrieved
- [ ] Deleted bak files do not appear in agent answers
- [ ] Sync resolves stale results

**Decision:** Keep current index → Sync → wait → Group B. Delete/rebuild only if still stale or corrupted.

## Deferred: Idea Lab Flow Refernce relocation

| Item | Status |
| ---- | ------ |
| Immediate exclude via `.cursorignore` | **COMPLETE** |
| Move to `reference-library/idea-lab/flow-reference/` | **DEFERRED** |
| Consumer check (pre-scan) | No `src` code string references to `Flow Refernce` / PDF name |
| Re-verify before move | UI, tests, build, FILE_OWNERSHIP maps |

Rationale: `src/` should hold application code; optional conceptual PDFs belong in the quarantined reference library.

## Changes made

| File | Why |
| ---- | --- |
| [`.cursorignore`](../../.cursorignore) | Defense-in-depth exclusions; no `mcp.json` |
| [`reference-library/README.md`](../../reference-library/README.md) | Authority, agent rules, promotion path |
| [`docs/ai/cursor-context-and-indexing-policy.md`](./cursor-context-and-indexing-policy.md) | Policy (3 controls, secrets, MCP, validation) |
| [`docs/ai/cursor-context-and-indexing-audit.md`](./cursor-context-and-indexing-audit.md) | This report |
| [`scripts/validate-cursor-context.mjs`](../../scripts/validate-cursor-context.mjs) | Group A automation (`ignore` + `git check-ignore`) |
| [`package.json`](../../package.json) | `validate:cursor-context` + `ignore` devDependency |
| [`AGENTS.md`](../../AGENTS.md) | Command + policy pointer |
| [`docs/ai/agent-toolchain.md`](./agent-toolchain.md) | Indexing section; last_verified |
| [`docs/ai/mcp.md`](./mcp.md) | MCP classification note |
| Deleted `.cursor/**/*.bak-*` (14 files) | Remove stale APS debris |

## Remaining gaps

| Item | Status |
| ---- | ------ |
| Expanded `.cursorignore` | **COMPLETE** |
| Policy + audit docs | **COMPLETE** |
| Group A validator | **COMPLETE** |
| Bak cleanup | **COMPLETE** |
| reference-library README | **COMPLETE** |
| MCP classification documented | **COMPLETE** |
| Layered secrets (docs) | **COMPLETE** |
| Cursor permission deny rules for `.env*` | **PARTIAL** — documented; operator must enable where supported |
| Group B fresh-chat retrieval | **`MANUAL_CHECK_REQUIRED`** |
| External Docs UI | **`MANUAL_CHECK_REQUIRED`** |
| Index Sync / health UI | **`MANUAL_CHECK_REQUIRED`** |
| STRUCTURE_WARNINGS negation in Cursor product | **`MANUAL_CHECK_REQUIRED`** |
| Move Flow Refernce PDF into reference-library | **DEFERRED** |
| `mcp.local.json` split | **DEFERRED** |

## Operator exit order

1. Update `.cursorignore` — done  
2. Delete bak debris — done  
3. Run `npm run validate:cursor-context` — PASS  
4. Open Cursor Settings → Indexing  
5. Press **Sync**  
6. Wait for indexing to complete  
7. Run Group B fresh-chat tests; fill table above  
8. Rebuild **only** if results remain stale or corrupted  
