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
  - src/brain/atom/content-atom.schema.ts
  - src/brain/content-studio/schemas/format-package.ts
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
| `content_atoms` | Content Atom v2 durable store (migration `0008`; `src/brain/store/db-atom-repository.ts`). When `DATABASE_URL` is unset, or the table is missing, `createAtomRepository()` falls back to JSON under `data/runtime/atoms/`. |

## Domain JSON contracts

Defined in `src/engine/discovery/brand-profile.ts` (Zod): businessName, audience, products/services, voice, colors, socialProfiles, seoSummary, competitors; strategy pillars/themes/channels/frequency/opportunities.

## Content Atom v2 (runtime contract — Live)

Neon table: `content_atoms` (migration `0008`). Canonical schema: `src/brain/atom/content-atom.schema.ts` (`schemaVersion: "content-atom-v2"`). Built via `buildContentAtom` / `POST /api/brain/content-atom`; reviewed via `POST /api/brain/content-atom/review`. Persistence: `createAtomRepository()` → Drizzle when `DATABASE_URL` is set (JSON fallback when the table is missing); includes `validation_report` + `build_key` for idempotency. Channel / Studio production consumes a locked `atomId` only (ADR 0005). Fields of record: lineage (incl. evidenceAdmissionPolicyVersion), kernel (claim + proof + hook_strategy), narrativeModules, engagementBlueprint (locked strategy + mutable presentation), distributionContract, claimLedger container (`claims[]` + boundary lists), buildStatus (`draft` \| `complete` \| `limited` \| `insufficient` \| `invalid`), approvalStatus, safety, missing_information. Build traces are refs/metadata only — not a second atom body.

## Content Production Bundle (runtime file store — Live)

Not a Neon table. Schema: `src/brain/content-studio/schemas/format-package.ts` (`ContentProductionBundle`, YouTube Short + Video format packages). Orchestration: `produceContentBundle` in `src/brain/use-cases/produce-content-bundle.ts`. Persistence: JSON under `data/runtime/production-bundles/` via `src/brain/content-studio/bundle-store.ts` (idempotent by atom). Export/render providers remain stubbed/Mocked — packages are structured drafts, not published media.

## Generated ownership

See `generated/maps/FILE_OWNERSHIP.md` for path owners. Do not invent tables here without matching migrations and CURRENT_STATE updates.
