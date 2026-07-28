---
title: Data Model
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
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
| `brands` | Brand records (optional `userId`) |
| `website_analyses` | Crawl/analysis by unique `normalizedUrl` |
| `brand_profiles` | JSONB `BrandProfile` per analysis |
| `strategy_previews` | JSONB `StrategyPreview` per analysis |

## Domain JSON contracts

Defined in `src/engine/discovery/brand-profile.ts` (Zod): businessName, audience, products/services, voice, colors, socialProfiles, seoSummary, competitors; strategy pillars/themes/channels/frequency/opportunities.

## Generated ownership

See `generated/maps/FILE_OWNERSHIP.md` for path owners. Do not invent tables here without matching migrations and CURRENT_STATE updates.
