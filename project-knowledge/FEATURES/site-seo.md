---
title: Site SEO Subsystem
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/seo/**
  - src/seo/config/public-positioning.ts
  - src/components/landing/landing-copy.ts
  - src/app/robots.ts
  - src/app/sitemap.ts
  - src/app/llms.txt/**
  - src/app/opengraph-image.tsx
  - project-knowledge/BRAND_CHANGE_MAP.md
---

# FEATURE: Site SEO (`src/seo/`)

Bounded subsystem for **this product’s** public discoverability (Google + AI crawlers) and recommend-only SEO intelligence.

Distinct from Discovery **customer** SEO analysis (`src/engine/discovery/analyze-seo.ts` / `mm_analyze_seo`).

## Layers

| Layer | Role |
|-------|------|
| `config/` | `PRODUCT_IDENTITY`, `PUBLIC_POSITIONING` / claim ledger, `APPROVED_CAPABILITIES`, origin, crawler policy, earn-to-index routes |
| `foundation/` | Deterministic metadata, robots, sitemap, JSON-LD, llms.txt, OG - consume identity + public positioning |
| `intelligence/` | Research → Change Brief → approval (no silent doctrine writes) |
| `jobs/` | Weekly / on-demand / site-change reviews |
| `verification/` | Brand consistency + crawl/metadata + claim-parity checks |

Public visitor-facing product claims for the landing page and SEO surfaces must come from `src/seo/config/public-positioning.ts` (plus identity/capabilities). Do not hardcode competing promises in landing components or schema.

## Index policy

- `/` - allow + index + sitemap
- App HTML (`/dashboard`, …) - allow crawl + **noindex** + not in sitemap
- `/api/` - disallow

## Commands

```bash
npm run seo:verify
npm run seo:verify-brand
npm run brand:impact          # categorized rename impact (planning)
npm run seo:review            # on-demand intelligence refresh
npm run seo:readiness
```

## Rename / domain treatments

Do **not** assume one TypeScript file updates everything. Follow the full runbook:

[`BRAND_CHANGE_MAP.md`](../BRAND_CHANGE_MAP.md)

- **A** brand name only · **B** domain only · **C** both  
- Canonical origin: `SITE_ORIGIN` (derive / align `NEXT_PUBLIC_SITE_URL` + `AUTH_URL`)  
- `shortDescription` stays name-independent; compose with `displayName` in metadata  
- `package.json` name is optional technical identity, not required public-brand parity  
- Historical names allowed only in approved migration contexts  
- B/C require old-domain 301/308 redirect verification  
