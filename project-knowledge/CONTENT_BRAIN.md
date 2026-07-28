---
title: Content Brain
status: active
authority: canonical
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/brain/**
  - src/app/api/brain/**
  - src/components/dashboard/marketing-topic/**
  - src/components/dashboard/content/**
  - docs/ai/content-brain-stabilization.md
---

# Content Brain (Connected Content System)

## Doctrine (locked)

> AI creates structured strategic and creative decisions. Application code controls the workflow, validates boundaries, and compiles provider-specific payloads.

This is **one connected content system with specialized stages** — not a network of autonomous agent brains.

## Knowledge ownership (locked)

| Layer | Role | Not |
| ----- | ---- | --- |
| **Brand Core** | Sole runtime brand SoT for content generation | Not engineering docs |
| **Ingest helpers** | CSV fixture, UI/Summit inputs, Discovery → compile into Brand Core | Not peer living documents |
| **CONTENT_BRAIN.md** (this file) | Sole doctrine for how Content Brain works | Not brand rows / SKUs |
| **Wider project-knowledge/** | Product/eng OS for agents | Never dumped into generation prompts |
| **Runtime history** | Novelty, evaluation, debug | Not doctrine or Brand Core |
| **reference-library/** | Noncanonical research library (human-directed) | Never imported; not product truth |

```text
CSV / UI / Discovery (ingest)
        ↓
  Brand Core  ←── sole content brand SoT
        ↓
  topics → ≤6 directions → human picks ONE → Atom → YouTube Short
```

### Company knowledge layers (Discovery → Brand Core)

| Layer | What | Persist (dev) | Not |
| ----- | ---- | ------------- | --- |
| **Layer 1 — raw pages** | Cleaned page text + `contentHash` + final URL | `data/runtime/discovery-pages/` (ephemeral; not Brand Core) | Not product SoT; not dumped into prompts wholesale |
| **Layer 2 — structured profile** | CSV / BrandProfile / evidence rows (ingest) | `data/fixtures/zynava-discovery.csv` today | Not runtime SoT; no peer doctrine |
| **Layer 3 — passages** | Retrievable snippets keyed by page/hash for grounding | Keyword stub over Layer 1; RAG later | Not a second Brand Core |
| **Brand Core** | Compiled via `getBrandCore(companyId)` / `compileBrandCore` | Runtime SoT for generation | Not raw crawl HTML |

```text
Website crawl → Layer 1 pages → extract → Layer 2 CSV/profile
        → compileBrandCore / getBrandCore → Brand Core
        → (optional) Layer 3 passage retrieve for grounding
```

**Precedence (target):** owner-approved → approved manual edit → approved website discovery → proposed website discovery → model inference / Perplexity-derived → unknown. Perplexity and industry research stay **derived/proposed** — never silent company-fact SoT.

**Runtime entry:** prefer `getBrandCore(companyId)` over ad-hoc CSV parse + compile at call sites.

### Context selection by stage

| Workflow stage | Brand Core | Project Knowledge | Runtime history | Full PK dump to model? |
| -------------- | ---------- | ----------------- | --------------- | ---------------------- |
| Topic generation | Yes | No | Optional novelty | No |
| Six directions | Yes | No | Yes for novelty | No |
| Content Atom | Yes | No | Selected direction | No |
| Cursor architecture work | No | Yes (relevant sections) | Usually no | No |
| Content-system audit | Yes (runtime) | Yes (doctrine) | When evaluating | No |
| Canonical doc update | Evidence only | Yes | No | Human review required |

## Product intake (STRATEGIZE UI)

```text
One master topic (umbrella subject)
  → up to six concrete editorial directions
  → owner chooses exactly ONE direction
  → that selection feeds the Core Content Brain
```

Owned by [`src/brain/content/`](../src/brain/content/) + Marketing Topic UI.

Handoff: `ContentDirectionsHandoffV1` (Zod). Save navigates to `/content`.

### Marketing Topic session vs history vs Brand Core

| Object | Role | Cleared by Start over? |
|--------|------|------------------------|
| Marketing Topic session | Ephemeral UI workspace | Yes |
| TopicGenerationRecord | Append-only history / eval (`data/runtime/topic-generation-history.csv`) | No |
| Brand Core (from ingest helpers) | Company truth for Directions + Atom | No |

- Fresh load: **empty** workspace — no handoff hydrate, no generation API on mount.
- **Manual Generate:** typed topic wins as master; history may soft-notice “similar topic.”
- **Auto-generate:** Brand Core is primary; recent history is novelty only.
- **Regenerate:** keeps master; new record with `mode: "regenerate"` + `parent_generation_id`.
- **Start over:** clears session only.
- **Directions provider:** product default `deterministic-v1` (ADR 0002). Opt-in `intelligent-v1` via `directionsProvider` (manual only). There is **no** openai-stub provider.
- **Atom path:** product forces deterministic (`PRODUCT_ATOM_PREFER_LLM = false`). LLM atom exists for experiments only.
- Canonical identity: **`generation_id`**.
- Each idea card: `specific_topic` + `idea_summary` (180–600 chars).

**Brain ownership:** Intelligence under `src/brain/`. Routes transport-only. UI presentation + ephemeral state. History CSV only via `CsvTopicGenerationRepository`.

## Canonical production pipeline

```text
Ingest (CSV today) → compileBrandCore() → Brand Core
  → Directions (master + ≤6 ideas) → human selects ONE
  → Content Atom (channel-neutral; ready|invalid)
  → Channel specialists (YouTube Short enabled; others not_connected)
  → Studio preview + Gate 2 (Partial — see below)
```

| Stage | Path | Role |
|-------|------|------|
| Brand Core | `src/brain/core/` | Compile + identity |
| Policy | `src/brain/policy/` | Provider + model + prompt metadata registry |
| Contracts | `src/brain/contracts/` | Lean versioned envelopes (topic, context packet, eval, review, run trace) |
| Observability | `src/brain/observability/` | `RunContext` + `TraceRecorder` → ContentRunTrace |
| Draft eval | `src/brain/evaluation/draft-eval/` | PASS/FAIL/WARNING metrics (min reliable) |
| Use cases | `src/brain/use-cases/` | Orchestration |
| Directions | `src/brain/content/` | Master + directions |
| Core Content Brain | `src/brain/pipeline/` | Brand Core + direction → Atom |
| Content Atom | `src/brain/atom/` | Strategic SSoT |
| StrategyLock | `src/brain/strategy-lock/` | Specialist immutability |
| Channel registry | `src/brain/channels/channel-registry.ts` | Enabled / not_connected |
| YouTube Short | `src/brain/channels/youtube-short/` | Enabled specialist |
| Studio UI | `src/components/dashboard/content/` | Preview + Prompt Inspector |
| Topic history | `src/brain/store/` | Eval + product history |

## Six-Idea Contract (machine-testable)

Exactly six `ContentVariation`s under one `masterTopic` / `masterTitle` (byte-stable when `SelectedTopicContext` present).

**Required differentiation:** unique `ContentAngle` from:

`beginner_guide` · `faq` · `problem_solution` · `decision_guide` · `comparison` · `trust_transparency`

**Also required per card:** `specific_topic`, `idea_summary` (180–600), audience problem, strategic purpose, core promise, suggested format; grounding IDs when `intelligent-v1`.

**Dedup:** deterministic → angle uniqueness; intelligent → Jaccard token similarity &lt; 0.72; reject inventing claim IDs / banned claims / masterTitle rewrite.

**Rejection:** missing angle diversity · near-duplicate intelligent pairs · safety fail · length fail · padding limited topic candidates to six.

## Human gates

1. **Gate 1 (live):** Select editorial direction (Marketing Topic / Idea Lab).
2. **Gate 2 (Partial):** Studio validates package, Save Draft, Regenerate, Continue to Review. Full approve/reject-per-package is **not** shipped; Review phase is a shell. Documented honesty — do not invent Gate 2 completeness.

## Idea Lab

Dev-only sandbox. Topic candidates: see [`IDEA_LAB_TOPIC_STRATEGY.md`](./IDEA_LAB_TOPIC_STRATEGY.md). Directions: always `deterministic-v1` via shared `generateAndRecordContentDirections`. Structured handoff: [`IDEA_LAB_DIRECTION_HARDENING.md`](./IDEA_LAB_DIRECTION_HARDENING.md), ADR 0003.

**Topic-title-hook:** deterministic templates by default. `TOPIC_TITLE_HOOK_PROVIDER=openai` is **remapped to deterministic** (OpenAI path not live). Title polish / hook-enrichment OpenAI are separate opt-in flags.

## APIs

| Route | Role |
|-------|------|
| `POST /api/brain/content-directions` | → `generateAndRecordContentDirections` |
| `POST /api/brain/topic-generation` | History status |
| `POST /api/brain/content-atom` | → `buildContentAtomFromHandoff` |
| `POST /api/brain/content/production` | → `produceContentFromHandoff` |
| `POST/GET /api/brain/session` | Dev handoff by `generationId` |

## Content Atom rules

- Channel-neutral — no platform formatting or provider payloads
- Hook-first `hook_strategy` with `opening_intent`
- Structured `central_claim` + `supporting_proof` with IDs
- Status auto `ready` \| `invalid` — no human `claims_approved` before specialists

## reference-library (noncanonical)

**KEEP** as `reference-library/` for deliberate human-directed research (TOC + `index.yaml`). **Never import** into `src/`, MCP tools, ask retrieval, Brand Core, or tests as a dependency. Agents read only when a path is explicitly named. See [`reference-library/PROMOTION.md`](../reference-library/PROMOTION.md).

Promotion path (mandatory — nothing moves directly into production code or this file):

```text
Reference concept
→ compare against current repository
→ collect code evidence
→ determine applicability
→ record human decision
→ create ADR or update canonical doctrine
→ implement and test
```

## Stabilization validation

```bash
npm run validate:stabilization
```

Runs typecheck, lint, tests (incl. Content Brain regressions), brain cycle check, MCP smoke, knowledge update+check.

## Related

- Stabilization log: [`docs/ai/content-brain-stabilization.md`](../docs/ai/content-brain-stabilization.md)
- Ownership matrix: [`docs/ai/content-brain-ownership-matrix.md`](../docs/ai/content-brain-ownership-matrix.md)
- Final package: [`docs/ai/content-brain-stabilization-final.md`](../docs/ai/content-brain-stabilization-final.md)
- MCP matrix: [`docs/ai/mcp-capability-matrix.md`](../docs/ai/mcp-capability-matrix.md)
- Glossary: [`DOMAIN_GLOSSARY.md`](./DOMAIN_GLOSSARY.md)
- ADR 0002 / 0003 under `DECISIONS/`
- Active brand spelling: **Zynava** / `https://zynava.com`
