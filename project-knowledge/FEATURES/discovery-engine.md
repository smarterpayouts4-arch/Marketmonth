---
title: Discovery Engine
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/engine/discovery/**
  - src/app/api/discovery/**
  - src/components/discovery/**
related_features:
  - discovery-engine
---

# FEATURE: Discovery Engine

## Purpose

LEARN-stage pipeline: website → crawl → brand/SEO/social/competitor signals → Brand Profile + evidence-grounded social discovery narrative + strategy draft.

## Discovery narrative (UI)

Market Month’s **discovery activation Hook** (not the finished habit loop):

1. **Trigger** — uncertainty about what the brand should lead with on social  
2. **Action** — paste one URL → Analyze  
3. **Variable reward** — three progressive sections (owner-facing): **What You’re Doing Well** → **Where You Can Win** → **Your Content Play** (ids: `doing-well` / `win` / `content-play`)  
4. **Investment** — only after all three sections are viewed: cadence level, channels, and content pillar. Choices improve the plan; navigation / view alone ≠ investment.

**Grounded pipeline:** crawl → company profile artifact (`approved.csv` preferred over `draft.csv`) → `CompanyProfileProjection` via `parseCompanyCsv` → engine `buildDiscoveryNarrative` (`src/lib/discovery/discovery-narrative.schema.ts` → `SocialDiscoveryProfile`) → UI formats only via `toDiscoveryActivation`. Evidence is classified `observed` | `inferred` | `recommended`. Cadence is always a Market Month **recommendation**, never website evidence. Social wording is **link detected** / **link not detected** only (never “no account” / performance claims). Low evidence → clarification copy + light cadence rather than fabricated strength.

Presentation models live under `src/components/discovery/activation/` (`DiscoveryReveal`, `DiscoveryInvestments`, additive adapter to `StrategyIntentAnswers`). UI must not import `@/engine`. Progress is header-only (`YOUR DISCOVERY · n OF 3`). Row copy is derived in `src/lib/discovery/card-copy.ts` so the engine and the UI share one implementation.

### Display copy polish (sanctioned exception to "UI formats only")

An LLM may rewrite **only** a card row's `title` and `summary`, stored as the optional `display` field on a bullet (`discoveryDisplayCopySchema`). Everything else stays deterministic: bullet `text`, `classification`, `evidence`, cadence copy, pillars, platform guidance, insights, takeaways, and social wording are never model-generated. A polished row must make the *same* claim as the deterministic row — only more readable.

Constraints, all enforced in `src/engine/discovery/discovery-narrative/polish/polish-display-copy.ts`:

- `buildDiscoveryNarrative` stays pure and synchronous. Polish runs as an awaited post-step in `src/app/api/discovery/analyze/route.ts`, so the golden fixtures keep asserting deterministic output.
- Fail-closed: no API key, transport error, schema mismatch, or any failed validator leaves the deterministic copy in place. Absent `display` always renders a valid card.
- Validators reject new numbers, novel proper nouns not present in the grounded source, medical or study claims, forbidden social phrasing ("no account" / "not active" / "unused" / "inactive"), junk leakage, out-of-range lengths, and duplicate titles.
- On whenever `OPENAI_API_KEY` is present; force off with `DISCOVERY_COPY_POLISH_PROVIDER=deterministic-only`. Model via `discoveryCopyPolish` in the model registry (`OPENAI_DISCOVERY_POLISH_MODEL`).
- Polish improves wording, never data quality. A row whose *content* is wrong is an engine defect and must be fixed in the engine, not masked by better prose.

`scripts/compare-discovery-copy.ts` renders both arms side by side against the same engine module for regression review.

Honest evidence groups: Observed / Inferred / Recommended by Market Month. Product crawl Playwright is in-process (`src/lib/discovery/browser/`); Docker MCP Playwright is agent-only.

### Activation funnel metrics (instrument when analytics land)

- Analyze completion rate  
- Time until first dominant insight visible  
- Section progression rate (3 of 3)  
- Revisit rate for completed sections  
- Cadence selection rate  
- Channel toggle rate  
- Pillar selection rate  
- Plan-generation conversion  
- Later edit of selected direction  
- Strategy acceptance / approval after generation  

## Ownership

| Layer | Path |
|-------|------|
| Engine | `src/engine/discovery/` (narrative under `discovery-narrative/`) |
| API | `src/app/api/discovery/` |
| UI card | `src/components/discovery/` (HTTP client only) |
| Activation presentation | `src/components/discovery/activation/` |
| Contract | `src/lib/discovery/discovery-narrative.schema.ts` |

## Boundaries

- UI must not import engine modules.
- Engine must not import React / Next UI.
- Strategy output is a **draft** requiring human review (see PRODUCT invariant).
- Do not declare discovery “Hook-complete” — recurring publish/learn habit is separate.
- Prefer `approved.csv` when present; never use draft when approved is available.

## Status

See [`CURRENT_STATE.md`](../CURRENT_STATE.md) → Discovery.
