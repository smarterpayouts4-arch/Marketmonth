---
id: daily-project-closeout
version: 1.0.0
title: Daily Project Closeout
description: End-of-day gates: typecheck, lint, tests, knowledge, quality, advisory AI audit, daily report.
categories:
  - verification
  - audit
tags:
  - closeout
  - daily
  - quality
  - wrap-up
risk_levels:
  - low
  - medium
  - high
use_when:
  - wrap up for today
  - finish for today
  - end the development day
  - close out today
  - daily project closeout
do_not_use_when:
  - Mid-feature implementation without closeout intent
  - Pure Q&A or single-file fixes
compatible_with:
  - test-and-verify
  - audit-existing-system
required_context:
  - PROJECT.md
  - COMMANDS.md
  - DEFINITION-OF-DONE.md
  - KNOWN-RISKS.md
---

# Daily Project Closeout

## Goal

End the development day with an evidence-backed closeout: deterministic gates first, advisory AI second. Never claim “wrapped up” when hard failures remain.

## Use when

The user asks to wrap up / finish / close out the day, or APS classifies intent as daily closeout.

## Do not use when

- Mid-feature implementation without closeout intent
- Pure Q&A or single-file fixes

## Required context

Resolve pointers from:

- PROJECT.md
- COMMANDS.md
- DEFINITION-OF-DONE.md
- KNOWN-RISKS.md

APS `project-context/` files are pointers, not doctrine. Resolve every pointer and read the canonical `project-knowledge/` document before reasoning from it.

## Steps

1. Refresh knowledge maps: `npm run knowledge:update`
2. Run blocking probes: `npm run typecheck`, `npm run lint`, `npm test`
3. Run `npm run daily:closeout` (or the equivalent script chain)
4. Read `project-knowledge/generated/reports/DAILY_LATEST.md`
5. Report STATUS exactly:
   - `NOT READY TO CLOSE` — hard failures remain
   - `READY WITH WARNINGS` — soft warnings or category score < 10
   - `READY TO CLOSE` — all categories 10/10 with complete evaluations
6. Do **not** claim 10/10 without evidence. Do **not** merge AI findings into the official score.
7. Official quality uses `npm run quality:update` with full probes — never treat `--fast` as the official score.

## Commands

```bash
npm run daily:closeout
```

## Evidence labels

Finish with Verified / Partially verified / Not verified / Blocked / Assumed against the daily report.
