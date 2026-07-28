---
title: MarketMonth Data Flows
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
---

# DATA-FLOWS

## Today

- Discovery: website URL → crawl → analyzers → Brand Profile / strategy draft → optional DB persist
- Much of app shell still uses mock / prototype UI data (`src/data/*`, landing mocks)
- Prototype mode toggle may switch first-run vs completed-brand UI states

## Target product flow

```text
Website / inputs
  → LEARN (business context)
  → STRATEGIZE (pillars + topics)
  → Content Universe plan per topic
  → PRODUCE (assets + platform copy)
  → REVIEW + SCHEDULE (human approve → calendar)
  → PUBLISH (connected accounts)
  → LEARN (analytics → next cycle)
```

Strategy outputs must feed Content Universe — not orphan posts.
