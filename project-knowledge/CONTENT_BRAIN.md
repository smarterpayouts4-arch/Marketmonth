---
title: Content Brain
status: active
authority: canonical
owner: engineering
last_verified: 2026-07-30
related_paths:
  - src/brain/**
  - src/brain/content-studio/**
  - src/brain/channels/youtube-short/**
  - src/brain/craft/**
  - src/app/api/brain/**
  - src/components/dashboard/marketing-topic/**
  - src/components/dashboard/content/**
  - docs/ai/content-brain-stabilization.md
  - project-knowledge/DECISIONS/0005-content-atom-v2.md
  - project-knowledge/DECISIONS/0006-content-studio-channel-ownership.md
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
  topics → ≤6 directions → human picks ONE → Atom (approve/lock on MT or Idea Lab) → `/content?atomId=` → YouTube Short + Video packages
```

### Company knowledge layers (Discovery → Brand Core)

| Layer | What | Persist (dev) | Not |
| ----- | ---- | ------------- | --- |
| **Layer 1 — raw pages** | Cleaned page text + `contentHash` + final URL | `data/runtime/discovery-pages/` (ephemeral; not Brand Core) | Not product SoT; not dumped into prompts wholesale |
| **Layer 2 — structured profile** | BrandProfile + evidence (Neon draft → gate → published → materialized CSV) | Neon `brand_profiles` (durable); `data/companies/zynava.com/approved.csv` = Idea Lab **read cache** | Not runtime SoT; no peer doctrine |
| **Layer 3 — passages** | Retrievable snippets keyed by page/hash for grounding | Keyword stub over Layer 1; RAG later | Not a second Brand Core |
| **Brand Core** | Compiled via `getBrandCore(companyId)` / `compileBrandCore` | Runtime SoT for generation | Not raw crawl HTML |

```text
Website crawl → Layer 1 pages → extract → Neon draft BrandProfile
        → quality gate → publish pointer → materialize rich CSV
        → compileBrandCore / getBrandCore → Brand Core → Idea Lab
        → (optional) Layer 3 passage retrieve for grounding
```

**Storage policy:** Neon may store imperfect **drafts**. Only `approval_ready` profiles publish and materialize CSV. Idea Lab does **not** hit Neon per topic. Frozen/rules refresh is not the Idea Lab CSV writer.

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
- **Atom path (Live — ADR 0005):** Content Atom v2; product primary is constrained LLM (`PRODUCT_ATOM_PREFER_LLM = true` via `atom/generate.ts`); deterministic skeleton is the honest thin/offline fallback. Superseded `pipeline/llm-atom.ts` removed.
- **Select → atom:** human picks ONE direction → `/api/brain/content-atom` → atom review/approve → specialists from locked `atomId` only.
- Canonical identity: **`generation_id`**.
- Each idea card: `specific_topic` + `idea_summary` (180–600 chars).

**Brain ownership:** Intelligence under `src/brain/`. Routes transport-only. UI presentation + ephemeral state. History CSV only via `CsvTopicGenerationRepository`.

## Canonical production pipeline

```text
Ingest (CSV today) → compileBrandCore() → Brand Core
  → Directions (master + ≤6 ideas) → human selects ONE
  → Content Atom (channel-neutral; ready|invalid)
  → Content Studio production orchestrator (transitional multi-format layer — ADR 0006)
  → Channel specialists (YouTube Short enabled; youtubeLong still not_connected)
  → Renderer shared worker (stub/dry-run until wired; UI never calls providers)
  → Studio preview + Gate 2 (Partial — see below)
```

**Dependency direction (ADR 0006):** UI → thin API → use case / Content Studio orchestrator → channel or format specialist → renderer → providers. Dual registries intentional: `channelRegistry` = specialist enablement; `PLATFORM_REGISTRY` = Studio format tabs.

| Stage | Path | Role |
|-------|------|------|
| Brand Core | `src/brain/core/` | Compile + identity |
| Policy | `src/brain/policy/` | Provider + model + prompt metadata registry + `token-budgets` |
| Craft DNA | `src/brain/craft/` | Shared Hooked/Storytelling/short-form operational clauses (`CRAFT_DNA_VERSION`); never copyrighted extracts |
| Contracts | `src/brain/contracts/` | Lean versioned envelopes (topic, context packet, eval, review, run trace) |
| Observability | `src/brain/observability/` | `RunContext` + `TraceRecorder` → ContentRunTrace |
| Draft eval | `src/brain/evaluation/draft-eval/` | PASS/FAIL/WARNING metrics (min reliable) |
| Use cases | `src/brain/use-cases/` | Orchestration (`produce-content-bundle`, `review-content-atom`, …) |
| Directions | `src/brain/content/` | Master + directions |
| Core Content Brain | `src/brain/pipeline/` | Brand Core + direction → Atom (`core-content-brain` / `deterministic-atom` wrappers) |
| Content Atom v2 | `src/brain/atom/` | Strategic SSoT (`content-atom-v2`; constrained LLM + optional craft polish + validate/repair) |
| StrategyLock | `src/brain/strategy-lock/` | Specialist immutability |
| Channel registry | `src/brain/channels/channel-registry.ts` | Enabled / not_connected (Short enabled; Long not_connected) |
| YouTube Short | `src/brain/channels/youtube-short/` | Enabled specialist |
| Content Studio production | `src/brain/content-studio/` + `produce-content-bundle.ts` | **Transitional** multi-format orchestrator: platform/format registry, Video adapter, idempotent bundles (ADR 0006); Short adapter deleted Phase 2.1 |
| YouTube Short domain | `src/brain/channels/youtube-short/` | `youtube-short-service` + specialist + duration policy + draft / durable-edits contracts |
| Studio UI | `src/components/dashboard/content/` | Atom deep-link vision shell; must not import channels/render/use-cases/bundle-store |
| Topic history | `src/brain/store/` | Eval + product history + atom repository |

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

Dev-only sandbox. Topic candidates: four **TopicCategoryId** chips (`customer_questions`, `product_education`, `trust_proof`, `offers_conversion`) per ADR 0004 — see [`IDEA_LAB_TOPIC_STRATEGY.md`](./IDEA_LAB_TOPIC_STRATEGY.md). Stage 1 tries optional LLM candidates (`topicLlmCandidates` / `gpt-5.4-nano`) with shared OpenAI client (retry, circuit breaker, cost caps), strict `json_schema`, one repair retry, rejection taxonomy, then deterministic fallback. Prompt A/B by version is advisory. **LLM-as-judge is always-on** for Lab topic candidate runs (advisory; never blocks). No human evaluation checklist UI. Lab also builds/shows the Content Atom after selection (select→atom). Directions: always `deterministic-v1` via shared `generateAndRecordContentDirections`. Structured handoff: [`IDEA_LAB_DIRECTION_HARDENING.md`](./IDEA_LAB_DIRECTION_HARDENING.md), ADR 0003 / 0005.

**Topic-title-hook:** deterministic templates by default; shell families are **subject-kind-conditioned** (retail buy/check shells only for buyer-comparable kinds). `TOPIC_TITLE_HOOK_PROVIDER=openai` is **remapped to deterministic** (OpenAI path not live). Hook-enrichment OpenAI is a separate opt-in flag (`HOOK_ENRICHMENT_PROVIDER=openai`).

**Two-generator policy:** Idea Lab = LLM + deterministic fallback. Product Marketing Topic / `content-directions` = deterministic `generateTopicCandidates` only. Do not claim they are the same pipeline. Full remediation record: [`docs/audits/topic-generator-architecture-health-audit.md`](../docs/audits/topic-generator-architecture-health-audit.md).

## APIs

| Route | Role |
|-------|------|
| `POST /api/brain/content-directions` | → `generateAndRecordContentDirections` (session + rate limit + tenant; may persist `content_run_traces`) |
| `POST /api/brain/topic-candidates` | Deterministic topic candidates (session + rate limit + tenant; product path) |
| `POST /api/brain/topic-generation` | History status (session + rate limit + tenant; prod store = `topic_generations`) |
| `POST /api/brain/content-atom` | → `buildContentAtomFromHandoff` (session + rate limit + tenant) |
| `GET /api/brain/content-atom?atomId=` | Load atom + validation; auth via stored owner `companyId` |
| `POST /api/brain/content-atom/review` | → `reviewContentAtom` (approve / request_changes / reject / revise; limitations ack; lock) |
| `POST /api/brain/content/production` | → `produceContentBundle` (default YouTube Short + Video; idempotent; no Studio DTO compat) |
| `GET /api/brain/content/production?atomId=` | Return existing production bundle (no regenerate) |

Product Studio entry is **atomId-only**. Legacy handoff Studio + `produce-content-from-atom/handoff` + `package-store` removed.
| `POST/GET /api/brain/session` | Dev handoff by `generationId` |

## Content Atom rules (v2 — Live)

- Channel-neutral — no platform formatting or provider payloads
- Hook-first `hook_strategy` with `opening_intent`
- Structured `central_claim` + `supporting_proof` with IDs + claim ledger container (`claims[]` + boundary lists)
- Evidence admission (relevance + quality floor); claim capability records on the envelope; application-owned `buildStatus` (model may only demote)
- **Two-pass craft (opt-in):** Pass 1 = grounded generate (unchanged closed-world). Pass 2 = fact-locked craft polish (`src/brain/atom/craft-polish/`) using `buildCraftClause("atom_polish")`; creative-safety verifier rejects new numbers/entities/medical claims; **fail-closed** to pass-1 atom. Enable via `ATOM_CRAFT_POLISH_PROVIDER=openai|auto` or experiment `PROMPT_EXPERIMENT_ATOM_CORE_LLM=b`. Grounding beats style.
- Validation extras: numbered framework-promise gate → limited; craft scores + brand-in-hook warn on `AtomValidationReport`; plain-language `deriveLimitations` / limitation buckets; display-only `SpecialtyResearchHandoff`
- Shared craft clauses also pre-conform Idea Lab topic LLM playbook + hook-enrichment and Discovery strategy/display-copy polish (profile extraction stays temperature 0)
- Central token budgets in `src/brain/policy/token-budgets.ts` (atom max output 40k; craft polish / topic / hook / discovery stages explicit)
- Numeric targets (words / claims / proofs) are generation aims — never validity gates
- Build statuses: `draft` | `complete` | `limited` | `insufficient` | `invalid`; thin evidence → honest limited/insufficient
- Limited approval requires `limitationsAcknowledgement` covering pipeline-derived limitations; insufficient/invalid never approvable
- Locked atoms freeze kernel + claim ledger + narrative + engagement.strategy + distribution; presentation fields stay mutable
- Build trace = refs/metadata only (no second atom copy)
- Specialists / Studio production require approve/lock (specialist-ready) — not a human claims checklist
- **Dual registries:** `channelRegistry` (Short enabled; Long not_connected) vs content-studio format registry (Short + Video Live). Studio reads format registry only (ADR 0006).
- **Short duration policy:** `duration-policy.ts` — default 60s (product default), max 180s; shared by channel + Studio Short schemas
- **Durable edits SoT:** same production bundle package fields (not a parallel store); sessionStorage until Phase 2 PATCH
- Idea Lab surfaces Craft used + Craft tab (Test Inspector); approve must forward `limitationsAcknowledgement`
- Acceptance gate: `npm run verify:select-to-atom` (P0–P2); inspect: `npm run inspect:content-atom`; eng walkthrough: `npm run walkthrough:company-to-atom`

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
- ADR 0002 / 0003 / 0004 / 0005 under `DECISIONS/`
- Active brand spelling: **Zynava** / `https://zynava.com`
