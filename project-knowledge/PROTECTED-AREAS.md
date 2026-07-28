---
title: MarketMonth Protected Areas
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
---

# PROTECTED-AREAS

## Do not treat as product SoT

- **`reference-library/`** — noncanonical research library (deliberate human-directed reading only). Never copy host-product doctrine into MarketMonth or `PRODUCT.md`. Promotion only via [`reference-library/PROMOTION.md`](../reference-library/PROMOTION.md). Legacy path `Refrence folder/` remains blocked if present.
- **RepoBrain** — advisory vault only; never overrides `project-knowledge/`.

## Structural protections

- **Landing** — `src/components/landing/`; thin `src/app/page.tsx`
- **Discovery Engine** — `src/engine/discovery/`; UI under `src/components/discovery/` must not import the engine
- **Generated knowledge** — `project-knowledge/generated/` — scripts only
- **Product identity** — do not encode a single customer brand as MarketMonth
- **Colors** — `src/app/globals.css` tokens only

## Generated Cursor bridge

- `.cursor/rules/agent-prompt-router.mdc` via `agent-prompt-system/scripts/install.mjs`
