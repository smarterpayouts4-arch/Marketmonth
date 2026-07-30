---
title: MarketMonth Architecture
status: active
authority: canonical
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/app/**
  - src/engine/**
  - src/brain/**
  - src/components/**
  - src/seo/**
---

# ARCHITECTURE (MarketMonth)

> Product loop authority: [`PRODUCT.md`](./PRODUCT.md).  
> Live routes: see `generated/maps/ROUTE_MAP.md` (do not infer live routes from this doc alone).

## Stack (current)

- Next.js App Router (see root `AGENTS.md` + `node_modules/next/dist/docs/`)
- React 19, TypeScript, Tailwind v4 + tokens in `src/app/globals.css`
- Discovery Engine under `src/engine/discovery/`; UI under `src/components/*`; Neon/Drizzle in `src/db/`

## Four categories (keep distinct)

| Category | Role |
|----------|------|
| **Feature ownership** | A surface owns its UI + business rules for one loop stage |
| **Shared domain contracts** | Explicit shared types/contracts (e.g. future `src/domain/*`) — not another feature’s internals |
| **Cross-stage orchestration** | Composes public interfaces from multiple stages; does **not** own their rules or mutate their internals |
| **Shared visual primitives** | `src/components/ui/`, `src/components/shared/`, `src/lib/utils.ts`, tokens from globals |

### Import rule

Feature modules must **not** import another feature module’s **internal implementation**.  
Cross-surface coordination goes through **explicit shared domain contracts**, application services, or orchestration modules.

- Forbidden: `features/content` → `features/strategy/internal-utils`
- Allowed: `features/content` → `domain/strategy-contracts` (when such contracts exist)
- Forbidden: `components/*` → `engine/*` and `engine/*` → `components/*` / React / `next/navigation`
- Forbidden: `components/*` → `db/*` / drizzle
- Allowed shared contract: UI-safe discovery stages live in `src/lib/discovery/stages.ts` (not under engine). Engine re-exports stream types from `src/engine/discovery/stages.ts`.
- Features expose a public entry (`index.ts` / `index.tsx`) when other surfaces must compose them (e.g. `@/components/discovery`, `@/components/brand`).

## Self-contained surfaces (breaking-point rule)

**Surface ownership is permanent.** Paths below are the **current convention** — preserve ownership even if physical layout evolves.

| Surface | Loop stage | Current owning module | App route |
|---------|------------|----------------------|-----------|
| Landing | Marketing entry | `src/components/landing/` | `/` via thin `src/app/page.tsx` |
| Site SEO | Public discoverability + SEO intelligence | `src/seo/` (thin adapters in `src/app/*`) | `/robots.txt`, `/sitemap.xml`, `/llms.txt`, OG |
| Discovery UI | Analyze card | `src/components/discovery/` | Mounted on landing (API client only) |
| Discovery Engine | LEARN pipeline | `src/engine/discovery/` | `POST /api/discovery/analyze` |
| Brand | LEARN | `src/components/brand/` (+ `src/app/(app)/brand/`) | `/brand` |
| Content Brain | STRATEGIZE (directions) | `src/brain/content/` | `POST /api/brain/content-directions` |
| Content Production | CONTENT UNIVERSE + PRODUCE | `src/brain/atom/`, `craft/`, `content-studio/`, `strategy-lock/`, `channels/` (Short enabled; Long not_connected) | `POST /api/brain/content-atom`, `POST /api/brain/content-atom/review`, `GET|POST /api/brain/content/production` |
| Marketing Topic (dashboard) | STRATEGIZE | `src/components/dashboard/marketing-topic/` | `/dashboard?phase=marketing-topic` (`/strategy` redirects) |
| Content | CONTENT UNIVERSE + PRODUCE (strategy-linked) | `src/components/dashboard/content/` + `/content` (`?atomId=` Live; bare path Partial) | `/content` (`?phase=content` redirects here) |
| Review | REVIEW | review route + components | `/review` |
| Calendar | SCHEDULE | calendar route | `/calendar` |
| Analytics | PUBLISH + LEARN | analytics route | `/analytics` |
| Dashboard | Orchestration UI | `src/components/dashboard/` | `/dashboard` |
| App shell | Chrome | `src/components/layout/` | `(app)/layout.tsx` |

### Orchestration (Dashboard)

An **orchestration surface** may compose public interfaces from multiple stages, but it does **not** own their business rules or mutate their internal state directly.

### Tab independence

- If Strategy breaks, fix the Strategy module — not a shared god-file.
- Prefer colocating new stage logic under `src/features/<surface>/` as surfaces grow.

## Route map vs PRODUCT loop (intent)

```text
/                    → Landing (public)
/(app)/brand         → LEARN
/(app)/strategy      → STRATEGIZE
/(app)/content       → CONTENT UNIVERSE + PRODUCE
/(app)/review        → REVIEW
/(app)/calendar      → SCHEDULE
/(app)/analytics     → PUBLISH + LEARN
/(app)/dashboard     → Orchestration / orientation across the loop
```

Live inventory: `generated/maps/ROUTE_MAP.md`.

## Prototype honesty

- Check [`CURRENT_STATE.md`](./CURRENT_STATE.md) before claiming a stage is live.
- `reference-library/` is not part of the app runtime (noncanonical research only).
