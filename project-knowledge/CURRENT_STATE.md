---
title: MarketMonth Current State
status: active
authority: canonical
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/**
---

# CURRENT_STATE

What is **actually functional today** — not the long-term vision in PRODUCT.md.

## Agent persona: Current State Integration Lead

**Role:** Reality guardian and SoT for what is Live / Partial / Prototype / Mocked / Planned / Blocked / Deprecated. Prevent agents from integrating with ghost features or treating vision as shipped code.

**Hard stops:**

- If a request builds on a **Mocked** or **Planned** system as if it were Live — halt and correct (e.g. require fixtures/mocks first; do not invent live backends).
- Respect architectural boundaries already true in-repo: Discovery UI must not import `@/engine`; use `src/lib/discovery/stages.ts`; follow ownership maps.
- Check `last_verified` / area status before touching a subsystem; if stale or contradictory, flag for audit before broad new work.

**After structural knowledge changes:** remind `npm run knowledge:update` + `npm run knowledge:check` (and `npm run quality:check` when quality claims change). Soft warnings: acknowledge as `PK-WARN-NNN: acknowledged — <reason>`.

**Tone:** Pragmatic, vigilant, grounded, slightly skeptical. Status labels over product vision. Care about what the codebase is right now.

Do not invent new status values. Use the Area detail table below as the authority.

## Status

Discovery Phase 1 **Partial** (live crawl → brand profile → **activation Hook** reveals → strategy preview + stream API). Activation Hook is **Partial** (progressive Customer Value / Buyer Moment / Lead Offer / Growth Direction + direction investment; extract hygiene + grounded activation); not habit-complete. Content Brain + Strategy topic workspace **Partial** (fixture-backed master → six directions → one radio selection). Rest of product loop is **Prototype / Mocked**. Auth + Neon schema **Partial**.

## Implemented

- Website crawl, brand/SEO/social/competitor analyzers, strategy draft (OpenAI when keyed)
- `POST /api/discovery/analyze` (NDJSON stage stream)
- Landing discovery UI (API client only; no engine imports)
- Auth.js Google scaffold + Drizzle/Neon Phase-1 tables
- Canonical knowledge system under `project-knowledge/` + APS process layer
- `knowledge:sync` on `npm run dev` / `npm run build` (maps + warnings refresh automatically)
- `knowledge:update` / `knowledge:check` / guardian (`PK-WARN-*` / `PK-HARD-*`)
- Project Quality Rubric **2.1.0** dual-score: Internal Engineering Quality Score (`QUALITY_RUBRIC.md` + `quality-rules.json`, probes, independence rules) + separate External Baseline Coverage (`EXTERNAL_QUALITY_BASELINE.md`); `quality:update` / `quality:check`, `audit:deps`, `knowledge:os-audit`, `daily:closeout`, advisory `ai:audit`
- Site SEO owned via `ownership-rules.json` → `site-seo` (`src/seo/**`, crawl files, SEO UI/API) with public entry `src/seo/index.ts`
- Discovery UI-safe stage contract: `src/lib/discovery/stages.ts` (UI must not import `@/engine`)
- Feature tests via `npm test` (discovery stages, URL normalize, card summary, schemas)
- Read-only `POST /api/project-knowledge/ask` (retrieval + OpenAI; no doctrine writes)
- Discovery MCP stdio (`mm_*` context + LEARN tools; allowlisted reads; no knowledge/code writes)
- Docker MCP profile `marketmonth_development` (YouTube Transcripts, Playwright, Context7) for agent research/eng — see [`docs/ai/agent-toolchain.md`](../docs/ai/agent-toolchain.md)
- Site SEO subsystem (`src/seo/`) Phase 1A foundation: identity-driven metadata, robots, sitemap, JSON-LD, generated `llms.txt`, brand-change map + verify scripts; Phase 1B intelligence (research/recommend) Partial
- Content Brain (`src/brain/**` + policy/contracts/observability): **Brand Core** sole runtime brand SoT via `getBrandCore(companyId)` (Zynava CSV adapter); CSV/UI ingest helpers; Layer-1 page snapshots + keyword passage stub under `data/runtime/discovery-pages/`. Lean contracts + prompt metadata registry + `RunContext` traces + min draft-eval (PASS/FAIL/WARNING). Ask route: auth + caps + **dev-only** in-memory rate limit. `npm run validate:stabilization` is the health gate. Doctrine: [`CONTENT_BRAIN.md`](./CONTENT_BRAIN.md); ownership: [`docs/ai/content-brain-ownership-matrix.md`](../docs/ai/content-brain-ownership-matrix.md); final: [`docs/ai/content-brain-stabilization-final.md`](../docs/ai/content-brain-stabilization-final.md). Gate 2 remains **Partial**. `reference-library/` noncanonical (read-only; never import). Directions **`deterministic-v1`** default; product Atom `preferLlm: false`
- **Idea Lab** (dev only, `/dev/brain/idea-lab`): Sandboxed Marketing Topic–style UI around the live Directions path. Presentational reuse of Marketing Topic components only — not product session/hooks/Atom. Isolated Lab topic history at `data/runtime/idea-lab-topic-history.csv` (never mutates product history). Runs in `idea-lab-runs.json` (max 5). Technical details behind closed Test Inspector. Selection opens evaluation drawer (no ContentAtom). Production page + APIs return 404/403. Stage 1 candidates use objective strategies (`TopicSubject` → `TopicSeed` → complete/limited/insufficient with **distinct support keys** plus a display-intent final-set quality gate; positive-evidence ingredients; typed `catalogProducts`; nested `subject` identity; `topic-candidate-score-v2`; thin orchestrator + `gtc/` + **topic-title-hook** Trigger titles after `frame-title`); optional **industry research** feeds typed `IndustryResearchOpportunity` subjects only (never a second topic generator; never `catalog_product` from research names); candidate generation never writes history — see [`IDEA_LAB_TOPIC_STRATEGY.md`](./IDEA_LAB_TOPIC_STRATEGY.md). Discovery crawl is bounded (10 pages / 24 attempts); Discovery LLM default `gpt-5.4-nano`. Directions use structured handoff (`SelectedTopicContext` → `DirectionWritingContext`, generator `deterministic-directions-v2`) then optional **`hook-enrichment-v1`** (default deterministic; OpenAI uses `gpt-5-nano`); see [`IDEA_LAB_DIRECTION_HARDENING.md`](./IDEA_LAB_DIRECTION_HARDENING.md) and ADR 0003. See `src/app/dev/brain/idea-lab/SANDBOX.md`.
- Unified content pipeline: Company CSV → `compileBrandCore()` (shared `brand_core_id` / version / hash) → Directions → human selects ONE idea → Content Atom → channel specialists via `channelRegistry`. Only **YouTube Short** is enabled; other channels are `not_connected` scaffolds (no fake generation). Canonical identity is **`generation_id` only** (no `decision_set_id`). Topic history SoT: append-only CSV `data/runtime/topic-generation-history.csv` via `CsvTopicGenerationRepository` (`record_revision` + file lock). Compare via `npm run compare:topic-generations` / `compare:directions-providers`. Studio defaults to YouTube Short; Prompt Inspector stages Directions | Atom | YouTube Short | Prompt (dev default). Legacy JSON topic store and `content-production/` dual stack removed.
- Dashboard workflow: Marketing Topic → Content → Review → Results (Learn removed). Selecting a direction saves handoff and routes to `/content`; `/strategy` and legacy `?phase=strategy|learn` → `/dashboard?phase=marketing-topic`; `?phase=content` → `/content`

## Mocked

- Live image/voice/JSON2Video provider HTTP (stubs + dry-run compile only)
- Review / calendar / analytics as UI shells + mock data
- Full multi-tenant brand workspace and navigation after Save Selected Direction

## Missing

- App-level automated tests for discovery
- Server actions; live produce / publish / analytics backends
- Hardened production auth gates on all surfaces

## Last verified

- 2026-07-27 (Idea Lab Phase 0–2; direction hardening / ADR 0003)

---

## Area detail

Status values: `Live` | `Partial` | `Prototype` | `Mocked` | `Planned` | `Blocked` | `Deprecated`

### Discovery

Status: Partial

Implemented: crawl, extractors (incl. structured FAQ JSON-LD/accordion + offer hints), strategy draft, streaming analyze API with grounded `DiscoveryActivationProfile`, landing discovery card, activation Hook stepper (format-only mapper; options require website evidence + confidence; required growth direction → strategy via `DiscoveryInvestments` adapter)  
Mocked: persistent human approval for strategy; activation analytics not instrumented  
Missing: production observability, habit-loop Hook  
Last verified: 2026-07-27

### Landing

Status: Prototype — public landing + tokens; hero speaks to “what to lead with” trigger; demo theater data illustrative  
Last verified: 2026-07-27

### Site SEO

Status: Partial — foundation Live (metadata/robots/sitemap/llms/JSON-LD/identity); intelligence Partial (research jobs + status UI); search-console feedback Planned  
Last verified: 2026-07-24

### Content Brain

Status: Partial — fixture-backed concrete directions; canonical Content Atom (`ready|invalid`); `channelRegistry` with **YouTube Short** enabled and other channels clean `not_connected` scaffolds; Studio honesty (no fake generation); semantic StrategyLock; MT fresh session + Topic Generation History (dev JSON); ID-only localStorage pointers for Studio handoff  
Last verified: 2026-07-26

### Brand / Strategy / Content / Review / Calendar

Status: Partial — Marketing Topic (empty until Generate/Auto-generate; Start over / Regenerate ideas) + Content Studio (YT Short first); review/calendar still shells  
Last verified: 2026-07-26

### Publish + Learn (Analytics)

Status: Planned — route shell only  
Last verified: 2026-07-24

### Auth + Data

Status: Partial — Auth.js + Neon schema + discovery persist when `DATABASE_URL` set  
Last verified: 2026-07-24
