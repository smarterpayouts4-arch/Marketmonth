---
title: Data Model
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/db/schema.ts
  - src/engine/discovery/brand-profile.ts
  - src/db/migrations/
---

# DATA_MODEL

Verified Phase-1 persistence (Drizzle + Neon). Expand only when migrations land.

## Tables (`src/db/schema.ts`)

| Table | Purpose |
|-------|---------|
| `users`, `accounts`, `sessions`, `verification_tokens` | Auth.js adapter |
| `brands` | Brand records (optional `userId`; tenant authorization maps `userId` ↔ companyId via normalized website/devKey — `src/lib/auth/company-access.ts`) |
| `website_analyses` | Crawl/analysis by unique `normalizedUrl` |
| `brand_profiles` | JSONB `BrandProfile` per analysis |
| `strategy_previews` | JSONB `StrategyPreview` per analysis |
| `app_metadata` | Dual DB marker (`MARKETMONTH_DB_MARKER` guard for mutate ops) |
| `company_publications` | Cross-store publish recovery (Neon pointer + filesystem CSV) |
| `company_profile_artifacts` | CSV v2 artifacts (draft/approved) — serverless-safe mirror of the disk store (`csv_text` + `artifact_hash`) |
| `topic_generations` | Topic history (production store; migration `0006`) — full record JSONB + mirrored query columns, `record_revision` optimistic concurrency. Dev default remains the runtime CSV; see `src/brain/store/create-topic-generation-repository.ts` |
| `content_run_traces` | Durable `ContentRunTrace` payloads per run (migration `0006`; best-effort persistence from the directions route) |
| `rate_limit_windows` | Durable fixed-window rate-limit counters (migration `0007`; `src/lib/http/durable-rate-limit.ts`) |
| `llm_usage_daily` | Per-tenant daily LLM token usage for cost caps (migration `0007`; `src/brain/llm/cost-caps.ts`) |

## Domain JSON contracts

Defined in `src/engine/discovery/brand-profile.ts` (Zod): businessName, audience, products/services, voice, colors, socialProfiles, seoSummary, competitors; strategy pillars/themes/channels/frequency/opportunities.

## Generated ownership

See `generated/maps/FILE_OWNERSHIP.md` for path owners. Do not invent tables here without matching migrations and CURRENT_STATE updates.
