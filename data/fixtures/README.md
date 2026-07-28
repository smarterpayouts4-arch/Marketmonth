# Discovery fixtures

## `zynava-discovery.csv`

Checked-in **Zynava** development snapshot for local Create Plan / dashboard bootstrap / Content Brain / Idea Lab when Neon has no owned research yet.

The Discovery **UI** stays pointed (Activation Hook summary). This CSV is the **backend company truth** — brand profile fields plus dense website evidence for topic generation.

| Rule | Detail |
|------|--------|
| Spelling | **Zynava** / `zynava.com` only — never “Zyneva” |
| Runtime | Application code **reads** this file only |
| Writes | Never write from API routes or Create Plan |
| Source of truth | Prefer a live site refresh into this CSV; Neon export when MarketMonth DB is ready |
| Catalog vs products | `products[]` = platform capabilities; `catalogProducts` = ingredient/filter nouns from the site — never tools/builders/advisors |

### Refresh from public site (DB-free)

```bash
# Crawl zynava.com → scrub catalog → write via discovery-csv-rows
npm run refresh:zynava-fixture
```

### Refresh from Neon (deferred until MarketMonth schema)

```bash
# After analyzing https://zynava.com and Create Plan (DEV_AUTH_BYPASS=true)
# Requires MarketMonth users/brands tables — not the current mismatched Neon schema
npm run export:zynava-fixture
```

### Seed Neon from CSV

```bash
npm run seed:zynava-dev
```

### Columns

`record_type, field, value, source_url, evidence_type, confidence, source_snippet, notes, retrieved_at`

Evidence types: `observed` | `inferred` | `user_confirmed` | `recommended`

### Record types

| `record_type` | Purpose |
|---------------|---------|
| `brand_profile` | Core BrandProfile fields (incl. `socialProfiles`, `competitors`, SEO) |
| `evidence` | Website-grounded facts (emails, phones, FAQs, CTAs, org JSON-LD, social URLs, …) |
| `location` | Detected locations from crawl meta |
| `strategy_preview` | Optional grounded strategy JSON |

No credentials or raw HTML dumps belong in this file.
