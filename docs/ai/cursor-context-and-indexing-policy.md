---
title: Cursor Context and Indexing Policy
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - .cursorignore
  - .gitignore
  - .cursor/mcp.json.example
  - project-knowledge/**
  - docs/ai/**
  - reference-library/**
---

# Cursor context and indexing policy

How MarketMonth configures Cursor so agents see **active source + canonical knowledge**, not secrets, runtime debris, or noncanonical research.

This document does **not** repeat Content Brain or product doctrine. Canonical truth:

- [`CONTENT_BRAIN.md`](../../project-knowledge/CONTENT_BRAIN.md)
- [`CURRENT_STATE.md`](../../project-knowledge/CURRENT_STATE.md)
- [`ARCHITECTURE.md`](../../project-knowledge/ARCHITECTURE.md)
- [`PRODUCT.md`](../../project-knowledge/PRODUCT.md)
- [`DOMAIN_GLOSSARY.md`](../../project-knowledge/DOMAIN_GLOSSARY.md)
- [`agent-toolchain.md`](./agent-toolchain.md)
- [`mcp.md`](./mcp.md)

## 1. Three controls (do not collapse)

| Control | Decides | Primary tools |
| ------- | ------- | ------------- |
| **Indexing** | What Cursor searches automatically | `.gitignore`, `.cursorignore`, Sync / index UI |
| **Context** | What enters a particular conversation | Ignores, `@` attachments, rules, prompts |
| **Security** | What the agent may read or expose | Untracked secrets, permission deny rules, app redaction |

`.cursorignore` helps **indexing** and **context**. It is **not** a security boundary by itself.

## 2. What Cursor should index (automatic)

Category **A** — must stay available:

- `src/`, `mcp/`, active tests, active scripts
- Canonical `project-knowledge/*.md` (and FEATURES / Idea Lab doctrine)
- Active `docs/ai/` operating docs
- Package / build / schema config (`package.json`, `tsconfig.json`, Drizzle schema, etc.)
- `src/brain/policy/`, contracts, architecture boundary tests
- `project-knowledge/generated/indexes/` (sole docs-index)
- `project-knowledge/generated/maps/`
- `project-knowledge/generated/reports/STRUCTURE_WARNINGS.md` (exception under reports/)
- `agent-prompt-system/`
- `.env.example` (template only)
- `.cursor/mcp.json.example` (safe portable MCP wiring)

Category **B** — may be available when useful:

- `data/fixtures/` (stable Zynava CSV fixtures)
- Small ADRs / migration notes when present under `docs/`
- APS install copies under `.cursor/rules` and `.cursor/skills` (generated from APS; do not hand-edit)

## 3. What Cursor must ignore

Defense-in-depth in [`.cursorignore`](../../.cursorignore). Patterns cover:

- Secrets: `.env`, `.env.*` (keep `!.env.example`)
- Dependencies / build / caches / coverage / logs via `node_modules/**/*`, with **narrow** re-include of `node_modules/next/dist/docs/**` (AGENTS.md Next API truth). Root build dirs use `/dist/`, `/.next/`, etc. — never bare `dist/` (that re-ignores Next docs).
- Runtime: `data/runtime/`, `data/seo/*.json`
- Noncanonical research: `reference-library/`, legacy `Refrence folder/`
- Generated report noise: `project-knowledge/generated/reports/**` except `STRUCTURE_WARNINGS.md`
- Cursor session markers and `*.bak*` debris
- Non-runtime Idea Lab reference binaries currently under `src/app/dev/brain/idea-lab/Flow Refernce/**`

**Assumption (wording):** Gitignored paths are normally excluded from Cursor folder context, but `.cursorignore` still lists secrets, runtime, generated noise, and reference material as defense-in-depth. Direct-read behavior must be verified in the active Cursor mode (`MANUAL_CHECK_REQUIRED`).

**Not in `.cursorignore` by default:** `.cursor/mcp.json` — see §5.

## 4. Canonical documents

Agents locate product/engineering truth via [`AGENTS.md`](../../AGENTS.md) → `CURRENT_STATE` → docs-index / MCP allowlist → code.

Internal Project Knowledge stays **local repository files**. Do **not** re-add `CONTENT_BRAIN.md` (or other PK docs) as separately crawled Cursor Docs.

## 5. MCP configuration classification

| MCP configuration | Action |
| ----------------- | ------ |
| Contains secrets or personal paths | Do not commit; keep/refresh safe example; prefer env references |
| Safe, portable, canonical configuration | Keep example tracked and indexable |
| Mixed | Split canonical config + ignored local override **only if** Cursor and this repo support the split |

**Supported MarketMonth method today:**

1. Track [`.cursor/mcp.json.example`](../../.cursor/mcp.json.example) (portable stdio; no tokens).
2. Copy to `.cursor/mcp.json` locally (gitignored) — see [`mcp.md`](./mcp.md).
3. Do **not** list `.cursor/mcp.json` in `.cursorignore` unless a live file is reclassified as secret-bearing; indexing already skips gitignored files by default.

`.cursor/mcp.local.json` is **DEFERRED** until Cursor + this repo’s loader are verified to support it.

## 6. Reference library

`reference-library/` is optional, noncanonical research. See its README and [`PROMOTION.md`](../../reference-library/PROMOTION.md).

- Excluded from automatic indexing via `.cursorignore`
- Blocked from ask retrieval, MCP paths, Brand Core, and runtime imports
- Agents read **only** when a human explicitly names a path or `@` attachment

Promotion path:

```text
Reference concept
→ repository comparison
→ evidence collection
→ applicability decision
→ human approval
→ ADR or canonical document update
→ implementation
→ tests
```

**Deferred cleanup:** non-runtime Idea Lab PDFs under `src/app/dev/brain/idea-lab/Flow Refernce/` should move to `reference-library/idea-lab/flow-reference/` after verifying no UI/test/build dependency. Until then they remain ignored in place.

## 7. External Cursor Docs

Reserve Cursor Settings → Indexing & Docs → **Docs** for **external** official documentation (Next.js, Auth.js, Zod, MCP spec, OpenAI, Cursor docs) that matches versions this repo uses.

Do **not** duplicate local Project Knowledge or `docs/ai/` as external Docs.

UI state is `MANUAL_CHECK_REQUIRED` — repository code cannot inspect the account Docs list.

## 8. Layered secret controls

| Layer | Rule |
| ----- | ---- |
| `.gitignore` | Do not commit secrets |
| `.cursorignore` | Do not include secrets in normal AI context (defense-in-depth) |
| Cursor permissions | Deny direct secret reads where supported (e.g. project/CLI `Read(.env*)`) |
| Application code | Never print or return secret values; redact logs |

Accidental secret sightings: do not repeat values into chat or docs; rotate if exposure is confirmed.

## 9. Diagnosing a stale index

1. Confirm `.cursorignore` / `.gitignore` patterns are correct.
2. Cursor Settings → Indexing → **Sync**.
3. Wait for completion.
4. Run Group B fresh-chat retrieval tests (see audit doc).
5. Consider Delete Index **only** if results remain stale/corrupt after Sync, or the index appears permanently stuck.

Do **not** delete the index merely because ignore rules changed.

| Condition | Recommendation |
| --------- | -------------- |
| Index complete; answers use current files | Keep |
| Canonical files missing due to ignore rules | Fix rules, then Sync |
| Generated or reference files included | Fix `.cursorignore`, then Sync |
| Still stale after Sync | Consider rebuild |
| Corrupted or permanently stuck | Delete and rebuild |
| Repository functioning normally | Do not delete |

## 10. Validating repository-aware retrieval

Two groups — do not conflate them:

| Group | What it proves | How |
| ----- | -------------- | --- |
| **A — Structure** | Paths exist; ignore classification; product quarantine | `npm run validate:cursor-context` |
| **B — Cursor retrieval** | Semantic/index retrieval picks canonical sources | Fresh chat after Sync (`MANUAL_CHECK_REQUIRED`) |

Group A does **not** prove Group B.

After changing ignores:

1. Update `.cursorignore`
2. Delete confirmed backup debris
3. Run `validate:cursor-context`
4. Open Cursor Settings → Indexing
5. Press **Sync**
6. Wait for indexing to complete
7. Run fresh-chat retrieval tests
8. Rebuild only if still stale or corrupted

## 11. Ownership

| Item | Owner |
| ---- | ----- |
| This policy | engineering |
| `.cursorignore` | engineering |
| Canonical doctrine | engineering (via Project Knowledge process) |
| External Cursor Docs list | human operator (UI) |
| Index Sync / rebuild | human operator (UI) |

**Last verified:** 2026-07-28
