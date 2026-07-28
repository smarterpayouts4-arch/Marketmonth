<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/update.mjs -->
# AI_AUDIT (advisory)

## Provenance

- Review type: `Advisory AI review`
- Provider: `openai`
- Requested model: `gpt-5-mini`
- Actual returned model: `gpt-5-mini-2025-08-07`
- API execution status: `ok`
- HTTP status: `200`
- Context files supplied: `project-knowledge/QUALITY_RUBRIC.md`, `project-knowledge/ARCHITECTURE.md`, `project-knowledge/CURRENT_STATE.md`, `project-knowledge/generated/reports/QUALITY_SCORE.md`, `project-knowledge/generated/reports/STRUCTURE_WARNINGS.md`
- Context size: `14953` bytes
- Response generated from live API: `yes`
- AI affects official score: `no`
- Secrets in context: `excluded` (.env.local never sent; only sanitized docs)

> This report does **not** change the Internal Engineering Quality Score.

## Observations

Below are concise, evidence-backed observations and actionable recommendations based only on the supplied MarketMonth project knowledge.

1) Top architecture risks
- Partial-critical surface risk — Discovery engine is “Partial” (CURRENT_STATE). Missing engine unit tests and production observability increase risk of regressions and blind failures when Discovery is relied on by other surfaces.
  - Impact: data/streaming regressions, broken LEARN pipeline in production.
- Auth & production-hardening gap — “Hardened production auth gates on all surfaces” is listed as Missing. Partial Auth.js + Neon schema means endpoints could be accessible without full role/tenant controls.
  - Impact: data exposure, unauthorized operations, multi-tenant leakage.
- Mocked downstream surfaces — Major loop stages (Strategy, Content, Review, Calendar, Analytics) are Prototype/Mocked. Orchestration surfaces may assume behavior that the mocked services won’t enforce.
  - Impact: integration surprises and coupling issues once backends are implemented.
- Provenance / auditability gap — repo commit SHA is “unavailable” (QUALITY_SCORE provenance). This reduces traceability of evaluation artifacts.
  - Impact: harder forensic / audit workflows, CI reproducibility.
- Single point: knowledge sync on dev/build — automatic `knowledge:sync` during dev/build could surface stale or environment-dependent behavior if not isolated from CI/production secrets.
  - Impact: accidental dependence on developer machine state or leaking environment specifics.

2) Independence / coupling concerns
- Public API surface not yet fully realized — docs reference future `src/domain/*` and `publicApiEntrypoints` rules; absence of established domain contracts risks features importing each other’s internals.
  - Evidence: ARCHITECTURE.md prescribes contracts but CURRENT_STATE notes “future `src/domain/*`”.
- UI ↔ Engine boundary risk — rules forbid UI importing engine; enforcement appears convention-based. Without automated enforcement (lint rules / CI checks), accidental imports could appear.
- Shared code placement ambiguity — shared primitives are defined (src/components/ui, src/lib), but with several prototype/partial surfaces, developers may be tempted to place cross-feature logic inside a feature, increasing coupling.
- Orchestration (Dashboard) temptation — an orchestration surface is permitted to compose interfaces but must not mutate internals; there’s risk developers will implement cross-feature mutations in orchestration rather than through explicit APIs.

3) Documentation gaps (concrete)
- Missing explicit domain contracts / shared types:
  - File/area: intended `src/domain/*` is noted as “future” — no authoritative domain contract files listed.
- Missing public API manifest:
  - Ensure `ownership-rules.json` enumerates `publicApiEntrypoints` for each feature; if present, not surfaced in these docs.
- Observability & runbooks:
  - No docs for production observability, metrics, alerts, or SLOs for Discovery/engine.
- Security config example:
  - `.env.example` omission: `DISCOVERY_PLAYWRIGHT` referenced in code but not documented (QUALITY_SCORE deduction PK-QUALITY-051).
- Provenance / repo policy:
  - Guidance missing about repo root policy (why commit SHA is unavailable) and required CI provenance steps.
- Integration / contract tests:
  - No documented plan or tests for NDJSON streaming API integration, or for producer/consumer contract verification between engine and UI.

4) Recommended next priorities (ranked, concrete actions)
High
- Add engine unit tests and CI coverage for Discovery (owner: engine team).
  - Implement tests around NDJSON streaming API, stage transitions, and failure modes.
- Harden auth & production gating (owner: infra/security).
  - Complete Auth.js integration, enforce auth checks on all server routes, add role/tenant tests.
- Fix documented env omission (owner: devops/dev).
  - Add `DISCOVERY_PLAYWRIGHT` to `.env.example` and document its purpose and safe default; re-run `npm run audit:deps` / `quality:update`.
- Add lint/CI enforcement for import boundaries (owner: platform/engineering).
  - Implement ESLint no-restricted-imports or a custom rule to block feature → feature internal imports; fail CI on violations.

Medium
- Create explicit domain contracts and public API entrypoints (owner: architecture/feature owners).
  - Add `src/domain/*` for shared types and list `index.ts` public entrypoints for every feature that other surfaces may consume.
- Add production observability and runbooks (owner: SRE/engine).
  - Define metrics, alerting, dashboards for Discovery pipeline; document runbook for streaming failures and retry behavior.
- Capture provenance in CI (owner: CI/platform).
  - Ensure CI stores commit SHA for quality reports or make the project a dedicated repo/package with explicit root so provenance is available.

Low / Tactical
- Add integration tests for Discovery → UI interactions (app-level automated tests noted Missing).
  - Simulate NDJSON streams and verify UI-safe contract (src/lib/discovery/stages.ts) compatibility.
- Formalize ownership publicApiEntrypoints in ownership-rules.json and enforce in guardian collectors (owner: knowledge/engineering).
- Prepare a deliberate rollout plan for moving Mocked surfaces to live backends; create feature toggles/flags to reduce blast radius.

Closing note
- Do not change or claim the official deterministic score in the repo; the above are advisory, implementation-focused recommendations to reduce operational and coupling risk based on the supplied documents.
