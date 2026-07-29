---
title: MarketMonth Current State
status: active
authority: canonical
owner: engineering
last_verified: 2026-07-29
verified_against_commit: 4a2dc0a
related_paths:
  - project-knowledge/CURRENT_STATE.md
  - project-knowledge/CONTENT_BRAIN.md
  - project-knowledge/FEATURES/website-best-practice-auditor.md
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

Discovery Phase 1 **Partial** (live crawl → brand profile → **3-section social discovery narrative** → strategy preview + stream API). Discovery narrative is **Partial** (What You’re Doing Well / Where You Can Win / Your Content Play + investment after all three rewards: cadence / channels / pillar; approved.csv preferred; extract hygiene + grounded `SocialDiscoveryProfile`); not habit-complete. Content Brain + Strategy topic workspace **Partial** (fixture-backed master → six directions → one radio selection). Rest of product loop is **Prototype / Mocked**. Auth + Neon schema **Partial**.

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
- Feature tests via `npm test` (discovery stages, narrative goldens, URL normalize, card summary)
- Read-only `POST /api/project-knowledge/ask` (retrieval + OpenAI; no doctrine writes)
- Discovery MCP stdio (`mm_*` context + LEARN tools; allowlisted reads; no knowledge/code writes)
- Docker MCP profile `marketmonth_development` (YouTube Transcripts, Playwright, Context7) for agent research/eng — see [`docs/ai/agent-toolchain.md`](../docs/ai/agent-toolchain.md)
- Site SEO subsystem (`src/seo/`) Phase 1A foundation: identity-driven metadata, robots, sitemap, JSON-LD, generated `llms.txt`, brand-change map + verify scripts; Phase 1B intelligence (research/recommend) Partial
- Content Brain (`src/brain/**` + policy/contracts/observability): **Brand Core** sole runtime brand SoT via `getBrandCore` / `getBrandCoreAsync` (disk-then-DB via `company_profile_artifacts`, hash-keyed cache). Lean contracts + prompt registry + `ContentRunTrace` / `RunContext` + draft-eval. Brain routes (`topic-candidates`, `content-directions`, `content-atom`, `topic-generation`): session + durable rate limit + tenant check (`requireCompanyAccess`). Shared OpenAI client: retry/backoff, circuit breaker, concurrency semaphore, per-tenant daily token caps (`llm_usage_daily`). `npm run validate:stabilization` is the health gate. Doctrine: [`CONTENT_BRAIN.md`](./CONTENT_BRAIN.md); audit record: [`docs/audits/topic-generator-architecture-health-audit.md`](../docs/audits/topic-generator-architecture-health-audit.md). Gate 2 remains **Partial**. Directions **`deterministic-v1`** default; product Atom `preferLlm: false`. **Two-generator policy (documented):** Idea Lab = LLM candidates + deterministic fallback; product Marketing Topic / `content-directions` = deterministic `generateTopicCandidates` only (honest provenance; not the same as Idea Lab).
- **Idea Lab** (dev only, `/dev/brain/idea-lab`): Sandboxed Marketing Topic–style UI. Isolated Lab topic history CSV (never mutates product history). Production page + APIs return 404/403. Stage 1: four **TopicCategoryId** chips; LLM candidates (`topicLlmCandidates` / `gpt-5.4-nano`) with strict `json_schema`, repair retry, rejection taxonomy, field/number provenance; deterministic fallback; subject-kind-conditioned title-hook shells (no retail "check" shells on trust/FAQ/brand kinds); prompt A/B by version (`PROMPT_EXPERIMENT_TOPIC_LLM_CANDIDATES`); optional LLM-as-judge sampling (`BRAIN_JUDGE_SAMPLE_RATE`); quality-drop alerts. Golden harness (Zynava + ClearFlow × 4 categories) + baseline CI gate. See [`IDEA_LAB_TOPIC_STRATEGY.md`](./IDEA_LAB_TOPIC_STRATEGY.md), ADR 0003/0004, `SANDBOX.md`.
- Discovery collection quality (Zynava): main-content cleaning; evidence-grounded narrative; FAQ glue rejection; acceptance gate. Clean-slate path: draft → publish → `company_publications` + approved CSV. Dual DB markers. Idea Lab loads via `BrandCoreRepository` only.
- Unified content pipeline: Company CSV → `compileBrandCore()` → Directions → human selects ONE idea → Content Atom → channel specialists. Only **YouTube Short** enabled. Canonical identity **`generation_id` only**. Topic history: repository port — **production** uses Neon `topic_generations` (+ durable `content_run_traces`); **dev** defaults to CSV `data/runtime/topic-generation-history.csv` (`BRAIN_HISTORY_STORE=db` forces DB in non-prod). Optimistic concurrency via `record_revision`. Studio Prompt Inspector stages Directions | Atom | YouTube Short | Prompt (dev default); Overview no longer hardcodes fake provider labels.
- Dashboard workflow: Marketing Topic → Content → Review → Results (Learn removed). Selecting a direction saves handoff and routes to `/content`; `/strategy` and legacy `?phase=strategy|learn` → `/dashboard?phase=marketing-topic`; `?phase=content` → `/content`

## Mocked

- Live image/voice/JSON2Video provider HTTP (stubs + dry-run compile only)
- Review / calendar / analytics as UI shells + mock data
- Full multi-tenant brand workspace and navigation after Save Selected Direction

## Missing

- App-level automated tests for discovery
- Server actions; live produce / publish / analytics backends
- Hardened production auth gates on **non-brain** surfaces (brain topic/directions/atom/topic-generation routes are gated)
- Production Neon apply of migrations `0006`/`0007` (`topic_generations`, `content_run_traces`, `rate_limit_windows`, `llm_usage_daily`) — code Live; deploy smoke **Not verified** in this session
- Product Marketing Topic UI still does not call the Idea Lab LLM candidate path (by policy; not a defect)

## Last verified

- 2026-07-29 (Topic Generator P0–P3 remediation: auth/tenant, DB history+traces, resilience, classifier generalization, quality ops; typecheck/lint green; 536/537 tests — sole failure is unrelated landing `month-plan.test.ts`)
- 2026-07-28 (Discovery three-section narrative: approved-first artifact, SocialDiscoveryProfile, cadence/channel/pillar investment)

---

## Area detail

Status values: `Live` | `Partial` | `Prototype` | `Mocked` | `Planned` | `Blocked` | `Deprecated`

### Discovery

Status: Partial

Implemented: crawl (extras seed + retry/delay/telemetry), extractors (structured FAQ + main-content clean), evidence-grounded `buildDiscoveryNarrative` → `SocialDiscoveryProfile` (3 sections + cadence + content universe + platform mapping), quality gate, strategy draft, streaming analyze API preferring approved.csv over draft + Layer-1 snapshots + gate diagnostics, Neon draft persist (brand upsert) + `publish:company-profile` materialize CSV, landing discovery card with 3-section stepper and gated investment, display-copy polish post-step (`gpt-5.4-nano`, card row title + summary only, fail-closed to deterministic copy, on when `OPENAI_API_KEY` is set)  
Mocked: persistent human approval for strategy; activation analytics not instrumented  
Missing: production observability, habit-loop Hook, Dev UI publish button  
Last verified: 2026-07-28

### Landing

Status: Prototype — public landing + tokens; hero speaks to “what to lead with” trigger; demo theater data illustrative  
Last verified: 2026-07-28 (reaffirmed Partial/Prototype; no landing status change)

### Site SEO

Status: Partial — foundation Live (metadata/robots/sitemap/llms/JSON-LD/identity); intelligence Partial (research jobs + status UI); search-console feedback Planned  
Last verified: 2026-07-28 (reaffirmed Partial; intelligence still not Live)

### Content Brain

Status: Partial — fixture-backed concrete directions; canonical Content Atom (`ready|invalid`); `channelRegistry` with **YouTube Short** enabled and other channels clean `not_connected` scaffolds; Studio honesty (no fake generation); semantic StrategyLock; MT fresh session + Topic Generation History (dev CSV default / prod `topic_generations`); Idea Lab LLM+fallback vs product deterministic-only (documented two-generator policy); ID-only localStorage pointers for Studio handoff  
Last verified: 2026-07-29 (Topic Generator P0–P3 remediation; Gate 2 remains Partial)

### Brand / Strategy / Content / Review / Calendar

Status: Partial — Marketing Topic (empty until Generate/Auto-generate; Start over / Regenerate ideas) + Content Studio (YT Short first); review/calendar still shells  
Last verified: 2026-07-28 (reaffirmed; review/calendar still shells)

### Publish + Learn (Analytics)

Status: Planned — route shell only  
Last verified: 2026-07-28 (reaffirmed Planned — not implemented)

### Auth + Data

Status: Partial — Auth.js + Neon schema + discovery persist when `DATABASE_URL` set; brain topic/directions/atom/topic-generation routes session + durable rate limit + tenant check; schema migrations through `0007` (`MARKETMONTH_SCHEMA_VERSION=7`) in-repo — production Neon apply still Missing  
Last verified: 2026-07-29
