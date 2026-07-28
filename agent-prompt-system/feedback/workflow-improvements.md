# Workflow improvements

Record routing misses with Observed → Impact → Preventive → Promotion → Status.
Promote only the smallest intervention that would have prevented the mistake.

---

## 2026-07-24 — Stub treated as doctrine

Observed:
The agent loaded APS `project-context/PRODUCT.md` but did not follow its pointer into `project-knowledge/PRODUCT.md`.

Impact:
Implementation was planned without canonical product context.

Preventive change:
APS router skill, bridge `.mdc`, and `core/context-selection.md` require resolving pointer stubs into `project-knowledge/`. Install generates Cursor copies; validate checks sync.

Promotion:
Added to aps-router skill, agent-prompt-router.mdc, and context-selection guidance.

Status:
Promoted

---

## 2026-07-24 — CURRENT_STATE skipped

Observed:
Substantial work proceeded from PRODUCT/ARCHITECTURE without reading CURRENT_STATE for live vs mocked status.

Impact:
Agents treated prototype/mock surfaces as live backends.

Preventive change:
AGENTS.md and toolchain docs keep CURRENT_STATE in the always-read list; ask system prompt prefers CURRENT_STATE for live status.

Promotion:
Reinforced in AGENTS.md authority hierarchy.

Status:
Promoted

---

## 2026-07-24 — UI importing engine internals

Observed:
Discovery UI risked importing `@/engine/discovery` instead of UI-safe contracts / API clients.

Impact:
Boundary violation between presentation and engine.

Preventive change:
AGENTS.md invariant: Discovery UI never imports `src/engine/discovery/`. Use `src/lib/discovery/stages.ts` for stage contracts.

Promotion:
Kept as AGENTS.md invariant (already present); reinforced in feedback log.

Status:
Promoted

---

## 2026-07-24 — Mock and engine BrandProfile confused

Observed:
Agents treated `@/data/mock-brand` BrandProfile and `@/engine/discovery/brand-profile` BrandProfile as one type.

Impact:
Wrong fields assumed when wiring LEARN UI to live discovery.

Preventive change:
Routing fixture `brand-profile-type` requires distinguishing mock vs engine; must not stop at a single type.

Promotion:
Documented in routing smoke fixtures; mapper remains a separate product plan.

Status:
Pending (fixture + awareness; mapper not in this pack)

---

## 2026-07-24 — `--fast` treated as full quality run

Observed:
`quality:update --fast` was treated as the official quality score even though probes were NOT_EVALUATED.

Impact:
False confidence on typecheck/lint/test categories.

Preventive change:
AGENTS.md and daily-closeout workflow state official score requires full `npm run quality:update`.

Promotion:
Added command note in AGENTS.md and daily-project-closeout WORKFLOW.

Status:
Promoted
