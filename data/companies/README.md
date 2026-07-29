# Company profile artifacts

One directory per company. This is the **only** on-disk home for a company CSV — nothing is mirrored into `data/fixtures/`.

```text
data/companies/<companyId>/
  draft.csv      # written by analyze
  approved.csv   # written by the publish gate
  proposed.csv   # refresh-from-site output, awaiting review
  overrides.json # manual approved-field overrides
```

Paths are produced by `artifactRelativePath()` / `artifactDiskPath()` in
`src/lib/company-profile/artifact-store.ts`. Do not hard-code them elsewhere;
Brand Core callers go through `DEFAULT_FIXTURE_RELATIVE` or `readCompanyProfile()`.

When `DATABASE_URL` is set, `writeArtifact` also mirrors the CSV into the
`company_profile_artifacts` table so serverless reads work without disk.

## `zynava.com`

Checked-in **Zynava** development snapshot for local Create Plan / dashboard bootstrap / Content Brain / Idea Lab when Neon has no owned research yet.

The Discovery **UI** stays pointed (Activation Hook summary). This CSV is the **backend company truth** — brand profile fields plus dense website evidence for topic generation.

| Rule | Detail |
|------|--------|
| Spelling | **Zynava** / `zynava.com` only — never "Zyneva" |
| Runtime | Application code **reads** this file only |
| Writes | Only the publish gate writes `approved.csv` |
| Source of truth | Prefer a live site refresh; Neon export when MarketMonth DB is ready |
| Catalog vs products | `products[]` = platform capabilities; `catalogProducts` = ingredient/filter nouns from the site — never tools/builders/advisors |

### Refresh from public site (DB-free)

```bash
# Crawl zynava.com → scrub catalog → write proposed.csv
npm run refresh:zynava-fixture
```

### Seed Neon from CSV

```bash
npm run seed:zynava-dev
```

## CSV contract

Schema version **2.0**. Columns:

`record_type, field, value, source_url, evidence_type, confidence, source_snippet, notes, retrieved_at`

Evidence types: `observed` | `inferred` | `user_confirmed` | `recommended`

| `record_type` | Purpose |
|---------------|---------|
| `brand_profile` | Core BrandProfile fields (incl. `socialProfiles`, `competitors`, SEO) |
| `evidence` | Website-grounded facts (emails, phones, CTAs, org JSON-LD, social URLs, …) |
| `faq` | Structured question/answer rows |
| `offer` | Lead offers with page-level source URLs |
| `signal` | Headings, CTAs, and other raw crawl signals |
| `crawl_meta` | Crawl metadata, including detected locations |
| `strategy_preview` | Optional grounded strategy JSON |

`brand_profile` rows are **not** citable evidence — only `evidence` and `faq` rows are.

No credentials or raw HTML dumps belong in these files.
