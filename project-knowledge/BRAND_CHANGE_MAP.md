---
title: Brand Change Map
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-25
related_paths:
  - src/seo/config/product-identity.ts
  - src/seo/config/site-environment.ts
  - src/seo/verification/**
  - .env.example
---

# Brand / domain treatment runbook

Public naming and domain changes are **treatments**, not a repo-wide string hunt.

Two control planes:

1. **Automated application surfaces** — `PRODUCT_IDENTITY` + canonical origin (`SITE_ORIGIN`).
2. **Manual organizational / external surfaces** — docs, DNS, search consoles, OAuth, package metadata, legal, redirects.

Never assume one TypeScript file updates literally everything.

Canonical identity file: [`src/seo/config/product-identity.ts`](../src/seo/config/product-identity.ts).  
Origin resolution: [`src/seo/config/site-environment.ts`](../src/seo/config/site-environment.ts).

---

## 1. Choose a treatment

| Treatment | Scope | Risk |
|-----------|--------|------|
| **A — Brand name only** | Identity, copy, assets, listings, selected docs | Low domain risk |
| **B — Domain only** | Origin env, redirects, GSC/Bing, DNS/TLS, OAuth, cookies/CORS/CSP, analytics, email/webhooks | High migration risk |
| **C — Brand + domain** | A + B fully | Highest |

Record the choice before editing.

---

## 2. Identity checklist (Treatments A / C)

Edit [`product-identity.ts`](../src/seo/config/product-identity.ts) once:

- [ ] `displayName`
- [ ] `compactName`
- [ ] `formerNames` — add **retired** public strings (do not delete history; see §6)
- [ ] `legalName` (if any)
- [ ] `tagline` — review; remove stale brand wording
- [ ] `shortDescription` — keep **name-independent** unless a named sentence is intentional
- [ ] `namingStatus` — `working-name` → `final` when locked
- [ ] `logoPath` / `socialImagePath` if assets change

**Copy rule:** Do **not** require the brand name inside `shortDescription`. Metadata helpers compose `displayName` when a named title/description is needed.

---

## 3. Canonical origin (Treatments B / C)

Preferred model — one truth, derive the rest:

```text
SITE_ORIGIN=https://example.com
NEXT_PUBLIC_SITE_URL=https://example.com   # must match SITE_ORIGIN for public SEO
AUTH_URL=https://example.com               # must match unless documented exception
```

Resolution order in code: `SITE_ORIGIN` → `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_APP_URL` (legacy fallback only).

**Rule:** All public and authentication origins must intentionally match, or have a documented reason for differing.

`NEXT_PUBLIC_APP_URL` is a legacy alias unless it is a **genuinely different** application host. Do not maintain three independent values by habit.

### Build-time vs server-side

- Rebuild and redeploy after changing any `NEXT_PUBLIC_*` origin (embedded in browser bundles).
- Restart or redeploy all services that consume server-side origin and authentication variables (`SITE_ORIGIN`, `AUTH_URL`, etc.).

Production hard-fails if no valid absolute origin is configured.

---

## 4. Automatically updated from PRODUCT_IDENTITY + origin

| Surface | Owner |
|---------|--------|
| Page titles and descriptions | `src/seo/foundation/metadata.ts` |
| JSON-LD Organization / WebSite / SoftwareApplication | `src/seo/foundation/structured-data.ts` |
| Open Graph / social preview image | `src/seo/foundation/social-images.ts`, `src/app/opengraph-image.tsx` |
| Generated `llms.txt` | `src/seo/foundation/llms-document.ts`, `src/app/llms.txt/route.ts` |
| Sitemap URLs | `src/seo/foundation/sitemap.ts` |
| Robots sitemap / host | `src/seo/foundation/robots.ts` |
| Canonical URL generation | `src/seo/foundation/canonical.ts` |
| Landing public chrome | `src/components/landing/*` |
| App sidebar product name | `src/components/layout/app-sidebar.tsx` |
| Discovery strategy prompts | `src/engine/discovery/build-strategy/prompts.ts` |
| Knowledge-ask agent framing | `src/app/api/project-knowledge/ask/route.ts` |

---

## 5. Manually updated (repo)

Brand CI **allowlists** many docs paths — they do **not** auto-update when identity changes.

### Knowledge / product prose (review on A / C)

- [ ] `project-knowledge/PRODUCT.md`
- [ ] `project-knowledge/CURRENT_STATE.md`
- [ ] `project-knowledge/PROJECT.md`
- [ ] `project-knowledge/ARCHITECTURE.md` (titles/prose as needed)
- [ ] `AGENTS.md`, root `README.md` if present
- [ ] `docs/ai/mcp.md` human-facing product naming (optional parity)

### Technical identity (optional)

- [ ] `package.json` `name` — **only** when internal project naming should follow the public brand. May affect lockfile, Docker, CI caches, deploy refs. Customer-facing name does **not** require npm-name parity.
- [ ] `public/brand/` logo assets if the mark changes

---

## 6. Historical names (allowed vs forbidden)

`formerNames` helps scans find leftovers. It does **not** mean every old string must disappear.

| Category | Meaning |
|----------|---------|
| Forbidden stale | User-facing hard-code of active/former public name outside allowlists |
| Allowed historical | Approved migration/history contexts |
| Required migration reference | Redirect docs, “formerly known as”, decision logs, search-migration records |

**Allowed historical prefixes (verifier + impact scan):**

- `project-knowledge/DECISIONS/`
- `project-knowledge/KNOWLEDGE_CHANGELOG.md`
- `project-knowledge/BRAND_CHANGE_MAP.md` (this file — migration sections)
- `project-knowledge/generated/` (regenerated maps may retain prior prose until refresh)

---

## 7. External / ops checklist

### Always review when relevant

- [ ] Domain registration and DNS (B/C)
- [ ] TLS certificates (B/C)
- [ ] Google Search Console property (B/C)
- [ ] Bing Webmaster Tools (B/C)
- [ ] Analytics properties / host filters (B/C)
- [ ] OAuth callback domains (`AUTH_URL`, Google Cloud console) (B/C)
- [ ] Cookie domain / CORS / CSP host allowlists (B/C)
- [ ] Transactional email domains, from-addresses, link bases (B/C)
- [ ] Webhooks pointing at the public origin (B/C)
- [ ] Social account names and bio links (A/C)
- [ ] App marketplace listings (A/C)
- [ ] Legal documents (ToS, privacy, DPA) (A/C)
- [ ] Trademark records (A/C)

### Domain migration extras (B/C — mandatory)

- [ ] Old → new **301 or 308** redirects (path + query preserved where appropriate)
- [ ] No redirect loops or long chains
- [ ] Old sitemap URLs redirect correctly
- [ ] New HTML has no old canonicals
- [ ] Old domain remains operational for the migration window
- [ ] Monitor old-domain traffic and errors until cutover is complete

Redirect check shape:

```text
https://old-domain.example/path?x=1
  → 301 or 308
  → https://new-domain.example/path?x=1
```

---

## 8. Commands

```bash
npm run brand:impact       # categorized occurrence report (planning)
npm run seo:verify-brand   # enforcement — forbidden stale hard-codes
npm run seo:verify         # foundation builders
npm run seo:readiness      # origin hard-fail, persistence, MCP minimization
```

---

## 9. Execution sequence

1. Choose treatment: **A** / **B** / **C**
2. Record old identity and origins
3. Update `PRODUCT_IDENTITY` (incl. `formerNames`; review tagline / shortDescription)
4. Update canonical environment (`SITE_ORIGIN` + matching `NEXT_PUBLIC_SITE_URL` / `AUTH_URL`)
5. Ensure retired strings are in `formerNames`
6. Update selected brand assets
7. Run `npm run brand:impact`
8. Update manual docs and **selected** technical identifiers
9. Update external systems
10. Rebuild and redeploy (`NEXT_PUBLIC_*`); restart/redeploy server auth/origin consumers
11. Verify **new** origin rendered outputs (`/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/opengraph-image`; app routes still `noindex`)
12. Verify **old-domain** redirects (B/C only)
13. `npm run seo:verify-brand`
14. `npm run seo:verify`
15. `npm run seo:readiness`
16. Record completion and rollback details (date, old/new identity, old/new origin, treatment)

---

## 10. Definition of done

A rename/migration is complete when:

- Active identity, public origin, rendered SEO outputs, user-facing application surfaces, manually maintained knowledge, technical identifiers **selected for parity**, and external services consistently reflect the new identity
- Old domains redirect correctly (if domain changed)
- Historical names appear only in approved migration contexts
- `brand:impact`, `seo:verify-brand`, `seo:verify`, `seo:readiness`, and production smoke tests pass

---

## Migration log (required historical references)

| Date | Treatment | Old identity | New identity | Old origin | New origin | Notes |
|------|-----------|--------------|--------------|------------|------------|-------|
| — | — | — | — | — | — | Working name still in use; no cutover yet |
