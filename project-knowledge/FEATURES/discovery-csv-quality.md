---
title: Discovery CSV quality (Zynava)
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/engine/discovery/**
  - scripts/publish-company-profile.ts
  - data/companies/zynava.com/approved.csv
related_features:
  - discovery-engine
  - discovery-csv-quality
---

# Discovery CSV quality (Zynava)

**Status:** Strong path (2026-07-28)

## Runtime path

```text
Crawl → Neon draft → quality gate → publish → materialize rich CSV → Idea Lab
```

| Layer | Role |
|-------|------|
| Neon `brand_profiles` | Durable draft / published collection SoT |
| `brands.publishedBrandProfileId` | Publish pointer |
| `data/companies/zynava.com/approved.csv` | Idea Lab generation read cache (no per-topic Neon) |

## Commands

- `npm run publish:company-profile` — **sole writer** of Idea Lab approved CSV (gate + publish pointer + materialize)
- `npm run refresh:zynava-fixture` — proposed CSV only (locked write; never touches approved)
- `npm run approve:zynava-fixture` — **validate-only** (gate / reconcile / Brand Core); does not promote CSV
- `npm run smoke:zynava-idealab` — Idea Lab smoke on approved CSV → `data/runtime/discovery-reconcile/idea-lab-smoke.json`

## Scorecard (Strong)

| Dimension | Target | Evidence |
|-----------|--------|----------|
| Cleaning | Strong | `html-clean` / `mainContentText` |
| Narrative | Strong | `deriveNarrative` (no generic fallbacks) |
| FAQ | Strong | Structured FAQs; skip bulk `customerProblems` when FAQs exist |
| Catalog + extras | Strong/Exceptional | EXTRA_URLS in BFS; Calcium + Omega-3 + Creatine CI |
| Gate before publish | Strong | `approval_ready` required |
| Idea Lab lift | Strong | Smoke `measuredLift` (indexed products on Core, **catalog disjoint from offers**, FAQ proofs, topics cite indexed or FAQ) |
| Reliability | Strong | Brand upsert, retry/delay, telemetry, hash-gated publish, schema reject, CSV locks |

## Smoke artifact

`npm run smoke:zynava-idealab` writes JSON with:

- `indexedOnCoreOk`, `indexedSeparatedOk`, `faqProofOk`, `topicOk`, `indexedCitedInTopics`, `faqCitedInTopics`

See also [`discovery-engine.md`](./discovery-engine.md) and [`CURRENT_STATE.md`](../CURRENT_STATE.md) Discovery area.
