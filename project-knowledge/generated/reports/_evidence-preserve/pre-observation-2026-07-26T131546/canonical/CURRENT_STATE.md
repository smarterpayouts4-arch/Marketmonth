---
title: MarketMonth Current State
status: active
authority: canonical
owner: engineering
last_verified: 2026-07-25
related_paths:
  - src/**
---

# CURRENT_STATE

What is **actually functional today** — not the long-term vision in PRODUCT.md.

## Status

Discovery Phase 1 **Partial** (live crawl → brand profile → strategy preview + stream API). Content Brain + Strategy topic workspace **Partial** (fixture-backed master → six directions → one radio selection). Rest of product loop is **Prototype / Mocked**. Auth + Neon schema **Partial**.

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
- Content Brain (`src/brain/content/`): master topic + six directions, readiness/safety, `extraContext` → owner-confirmed, fixture repository, `POST /api/brain/content-directions` (deterministic provider)
- Content Production Studio (`src/brain/content-production/` + `src/components/dashboard/content/`): handoff → Brand Core → Content Atom → Studio channels Threads/Facebook/Instagram/Reddit/YouTube Long/YouTube Shorts (LinkedIn adapter retained in domain, not in Studio nav) → Production Packages; `POST /api/brain/content/production`; Prompt Inspector on by default in development (hide with `CONTENT_PROMPT_INSPECTOR=false`)
- Connected content system modules also present (`src/brain/core|atom|pipeline|channels/facebook|render|qa/` + atom/facebook APIs) for deeper FB/render experiments — studio UI uses content-production
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

- 2026-07-24

---

## Area detail

Status values: `Live` | `Partial` | `Prototype` | `Mocked` | `Planned` | `Blocked` | `Deprecated`

### Discovery

Status: Partial

Implemented: crawl, extractors, strategy draft, streaming analyze API, landing discovery card  
Mocked: persistent human approval for strategy  
Missing: engine unit tests, production observability  
Last verified: 2026-07-24

### Landing

Status: Prototype — public landing + tokens; demo theater data illustrative  
Last verified: 2026-07-24

### Site SEO

Status: Partial — foundation Live (metadata/robots/sitemap/llms/JSON-LD/identity); intelligence Partial (research jobs + status UI); search-console feedback Planned  
Last verified: 2026-07-24

### Content Brain

Status: Partial — fixture-backed directions; Content Production Studio (deterministic atom + 4 channel adapters); connected FB/render modules also present; OpenAI stub/fallback for directions  
Last verified: 2026-07-25

### Brand / Strategy / Content / Review / Calendar

Status: Partial — Marketing Topic workspace + Content Production Studio; review/calendar still shells  
Last verified: 2026-07-25

### Publish + Learn (Analytics)

Status: Planned — route shell only  
Last verified: 2026-07-24

### Auth + Data

Status: Partial — Auth.js + Neon schema + discovery persist when `DATABASE_URL` set  
Last verified: 2026-07-24
