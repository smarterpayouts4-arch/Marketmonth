# Agent Prompt System — System Contract

**Name:** Agent Prompt System (APS)  
**Version:** 1.0.5  
**Role:** Portable Cursor **task routing + selective context + evidence labels**

## Terminology

| Term | Meaning |
|------|---------|
| **APS** | Agent Prompt System — Cursor agent process for this repository |
| **API** | Next.js HTTP `/api/*` routes (product runtime) |
| **Product prompts** | Runtime LLM prompts used by MarketMonth features |
| **Project Knowledge** | Repository + product truth under `project-knowledge/` |
| **Project Context** | Lightweight pointers under `agent-prompt-system/project-context/` into Project Knowledge |

## Not the same as product prompts

Product LLM prompts live in feature modules (for example `src/brain/**/prompt*.ts`, Discovery strategy prompts). There is **no** `src/lib/prompts/PROMPTS.md` in this host repository. APS governs **how Cursor agents approach engineering tasks**. Never merge the two. Never import APS into `src/` runtime or start APS from `npm run dev`.

## Operating principles

1. Classify → select ≤3 workflows → load required context only  
2. Spec + verification plan before large edits  
3. Surgical scope; protected rules win over APS  
4. Evidence-labeled completion  
5. Product and repository truth live in `project-knowledge/` (and live application code). APS `project-context/` holds **pointers only** — not doctrine  

## Portable boundary

| Portable | Project-specific |
|----------|------------------|
| `core/`, `workflows/`, `adapters/`, `scripts/`, `templates/`, `examples/` | `project-context/` (pointers) |

## Packaging vs compliance

`install.mjs` / `validate.mjs` prove **adapter ↔ installed artifact sync** and schema integrity. They do **not** prove that an agent emitted a visible APS brief or followed workflows.

## Personas

Thinking personas under `personas/` are **EXPERIMENTAL** — incomplete, non-authoritative, not installed into Cursor. Workflows remain the spine.
