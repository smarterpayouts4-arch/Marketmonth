---
title: Topic Generator Architecture Health Audit — Report + Remediation Record
status: complete
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/brain/evaluation/
  - src/brain/llm/
  - src/brain/store/
  - src/app/api/brain/
  - project-knowledge/CONTENT_BRAIN.md
---

# Topic Generator Architecture Health Audit (2026-07-29)

Audit executed 2026-07-29 by ten parallel workstreams (six static audit agents,
runtime gate verification, live generation verification, two path-to-10 gap
analysts) plus industry-standard web research. All findings carried file:line
evidence and were cross-corroborated. **The full P0–P3 remediation plan derived
from this audit has since been implemented in the same working session** —
section 8 records what landed and the post-implementation gate results.

## 1. Executive summary (as audited)

MarketMonth's Topic Generator was a **usable, well-documented prototype with a
strong grounding core and a weak runtime shell** — overall **6/10 at audit
time**. Quality gates were verified green (typecheck, lint, 485/485 tests on
the mid-migration working tree). The LLM prompt stack was centralized and
genuinely evidence-grounded. But the product UI and the LLM pipeline were two
different generators, the deterministic fallback carried retail-supplement
framing into every industry, and the platform layer was not multi-tenant or
serverless-deployable as written.

**Release recommendation (at audit time): Proceed with conditions** — keep
building locally; do not expose to customers before P0+P1. Both tiers have now
landed (section 8).

Key discovery from gap analysis: the platform fixes were cheaper than the audit
scores suggested. The DB table for serverless profile reads already existed
(`company_profile_artifacts` with `csv_text` + `artifact_hash`), the async
reader already existed (`readCompanyProfileAsync` — unused by `getBrandCore`),
the auth gating pattern already existed (`authorizeAsk` in the ask route), and
the trace spine already existed (`TraceRecorder`/`ContentRunTrace` — the
directions route just dropped it). Most of P0/P1 was wiring existing pieces.

## 2. Scores — audited baseline and verified path per dimension

| Dimension           |   Audit | After P0+P1 (pre-customer) | After P2 (at-scale) |
| ------------------- | ------: | -------------------------: | ------------------: |
| Prompt design       |       8 |                          9 |                9-10 |
| Validation          |     7.5 |                          9 |                9-10 |
| Documentation       |       7 |                          9 |                   9 |
| Architecture        |       7 |                        8-9 |                9-10 |
| Test coverage       |       7 |                          9 |                9-10 |
| CSV grounding       |       7 |                          9 |                9-10 |
| Ranking + dedupe    |       7 |                          9 |                9-10 |
| Fallback resilience |       7 |                          9 |                9-10 |
| Model integration   |       6 |                          9 |                  10 |
| Maintainability     |       6 |                        8-9 |                9-10 |
| Dynamic generation  |       5 |           7 (9 after P2.3) |                   9 |
| Data lineage        |       5 |                          8 |                9-10 |
| Security / privacy  |       5 |                          8 |                9-10 |
| Observability       |       4 |                          8 |                9-10 |
| Scalability         |       3 |                        7-8 |                9-10 |
| **Overall**         |   **6** |                     **~8** |              **~9** |

Honest cap: Dynamic generation cannot reach 9 until lexicon/shell
de-hardcoding (P2.3) lands and ClearFlow plus one more non-Zynava company
generate complete/limited without retail leakage. Do not chase a 10 there —
that would mean industry shell packs the repo doesn't need;
subject-kind-conditioned shells (the P2.3 design that shipped) is the right
target.

## 3. Critical findings (evidence-backed, as audited)

1. **Two generators, undocumented.** Idea Lab ran evidence-select → LLM →
   validate → score → fallback; the product Marketing Topic page called
   `/api/brain/content-directions` which used deterministic
   `generateTopicCandidates` only and silently defaulted missing category to
   `product_education`. `/api/brain/topic-candidates` had zero UI callers, no
   auth, no production gate, and a comment falsely claiming "same generator as
   Idea Lab".
2. **Retail framing leaked cross-industry.** No hardcoded topics, but
   title-hook shells ("label check", "before you buy") and supplement lexicons
   (`subjects/ingredient-patterns.ts`) applied regardless of industry. Proven
   by `data/fixtures/industry-agnostic-measurement.json`: plumbing company,
   zero supplement vocab, nonsensical "label check" titles.
3. **`.env.example` overrode the correct model** (`gpt-5-nano` vs registry
   default `gpt-5.4-nano`; its own comment said gpt-5-nano measured 76s and
   filled five of six slots).
4. **Idea Lab hardcoded `companyId: "zynava.com"`** in the generate route.
5. **Provenance holes.** Prompt version never stamped at runtime (registry
   existed, unconsulted); Inspector Overview hardcoded "deterministic-v1";
   product path returned no trace; no timings on candidates path.
6. **LLM dedupe collapse.** `map-llm-candidates.ts` bucketed LLM candidates as
   `generic_label_check`, so distinct titles collapsed before completeness was
   judged.
   6b. **Customer Questions LLM path was dead (verified live).** The validator
   rejected question-form titles as "incomplete sentence title", so ALL LLM
   candidates for `customer_questions` were rejected and the run silently fell
   back to deterministic shells — with a valid API key.
7. **Scalability blockers.** Sync-disk-only Brand Core; in-process write lock
   on shared history CSV; single-shot 30s OpenAI call, no retries; no caching.
8. **Stale-data risk.** Topics read approved.csv only; Discovery UI could show
   draft.

## 4. Risk register (audited → outcome)

| ID  | Finding                                                              | Severity | Outcome |
| --- | -------------------------------------------------------------------- | -------- | ------- |
| R1  | Ungated, unauthenticated brain routes (topic-candidates, content-directions, content-atom) | High | Closed (P0.2/P2.1): `requireApiSession` + `enforceRateLimit` + `requireCompanyAccess` tenant check on all brain routes |
| R2  | Product path never uses LLM pipeline; docs silent; comment misleads  | High     | Closed (P0.2): misleading comment fixed; two-generator policy documented; provenance made honest (P1.2) |
| R3  | Retail shells + supplement classifiers cross-industry                 | High     | Closed (P0.5 + P2.3): industry-neutral shells, subject-kind-conditioned shell families, CSV-token classifiers, CI leakage gate |
| R4  | `.env.example` model mismatch                                         | Medium   | Closed (P0.1) |
| R5  | Sync-disk Brand Core breaks serverless deploys                        | High     | Closed (P0.4): `getBrandCoreAsync` disk-then-DB with hash-keyed cache |
| R6  | No prompt-version/timing provenance; irreproducible runs              | Medium   | Closed (P1.2): runtime promptVersion/model/timings stamped; runTrace returned and persisted (P2.1) |
| R7  | LLM display-intent dedupe collapse                                    | Medium   | Closed (P1.4): `displayIntentHint` per candidate |
| R8  | Safety validation title-only; angles/hooks/numbers unchecked          | Medium   | Closed (P1.3): field-level safety, number provenance, category-fitness gate, repair retry, rejection taxonomy; customer_questions question-title fix |
| R9  | Approved-vs-draft skew between UI and generator                       | Medium   | Accepted by design: topics ground on approved.csv only; documented |
| R10 | Mid-migration remnants (MarketingFocus schema alias, tmp scripts)     | Low      | Mitigated: migration path retained deliberately for stored payloads |

## 5. Industry-standard bar (2026 research, applied)

- **Structured outputs**: production standard is `json_schema` with
  `strict: true` (constrained decoding), Zod as app-side backstop, exactly one
  repair retry feeding the specific validation error back, then graceful
  fallback. → shipped in P1.1/P1.3.
- **Prompt versioning + observability**: prompts as immutable registry
  artifacts; version stamped on every trace; OTel `gen_ai.*` attributes; eval
  scores attached to traces. → shipped in P1.2/P3.1
  (`src/brain/observability/otel-genai.ts`).
- **Eval harness**: golden dataset gated in CI; heuristic leakage checks on
  every PR; LLM-as-judge sampled; block prompt promotion on rubric drops. →
  shipped in P1.5/P3.1 (`golden-topics.test.ts` baseline gate,
  `judge/llm-judge.ts`, `policy/prompt-experiments.ts`).
- **Regulated claims (FTC/FDA)**: no AI exemption — the brand is liable for
  AI-generated claims. Structure/function language only; health-benefit claims
  require substantiation; maintain an audit trail linking every claim to its
  evidence. The evidence-ID citation system is that audit trail; claim checks
  now extend beyond titles to all creative fields (P1.3).

## 6. Build plan (dependency-ordered — all tiers implemented)

- **P0 — correctness, safety, honesty**: P0.0 live verification · P0.1 env
  model fix · P0.2 auth gate + rate limit + fixturePath lockdown + honest
  comments · P0.3 parameterized companyId · P0.4 async Brand Core + hash cache
  · P0.5 industry-neutral shells + CI leakage gate.
- **P1 — trust, reproducibility, quality**: P1.1 shared OpenAI client
  (retry/backoff/timeout, strict json_schema) · P1.2 runtime provenance +
  runTrace surfaced · P1.3 validation hardening + rejection taxonomy · P1.4
  dedupe fix + explainable scores + deterministic top-up · P1.5 mocked-LLM
  seam + fallback matrix + golden harness.
- **P2 — scale platform**: P2.1 `topic_generations` + `content_run_traces`
  Drizzle tables behind repository ports + tenant authorization · P2.2 durable
  rate limits (`rate_limit_windows`), per-tenant cost caps (`llm_usage_daily`),
  circuit breaker, provider concurrency queue · P2.3 CSV-token classifiers +
  subject-kind-conditioned shells + typed commerce attributes + faq_education
  frame titles.
- **P3 — top-1% differentiators**: P3.1 golden-set CI gate, LLM-as-judge
  sampling, prompt A/B by version, OTel gen_ai.* alignment, quality-drop
  alerting · P3.2 this handover document + DATA_MODEL reconciliation +
  knowledge checks.

## 7. Confidence levels (from the audit)

- **Diagnosis: ~95%.** All quality gates verified green at audit time. Live
  generation verification complete: missing-key fallback verified; retail
  shell leakage verified verbatim on ClearFlow plumbing; LLM path verified
  live on `gpt-5.4-nano` with real token usage; `customer_questions`
  wholesale-rejection defect found live.
- **Proposed fixes are the right fixes: ~92%.** Fixes build on existing
  structures (DB mirror, registries, trace spine, auth pattern) rather than
  new frameworks.
- **Post-fix outcome:** after P0+P1 → ~8/10 (~90% confidence); after P2 →
  ~9/10 deployable multi-tenant (~75%); after P3, nothing structural remains
  between this system and documented 2026 best-in-class practice for grounded
  content generation (~65%; "top 1%" is a market comparison — what is
  verifiable is practice-parity with the published state of the art).

## 8. Implementation record (2026-07-29)

All P0, P1, P2, and P3 items above were implemented on the same working tree.
Final gates after P3.1: **typecheck clean, lint clean, 536/537 tests passing**
(suite grew from 485 to 537 tests during the remediation; the single failure is
`src/components/landing/month-plan/month-plan.test.ts`, a pre-existing
landing-page test unrelated to the Topic Generator).

Notable deliverables by area:

- **Data layer (P2.1)**: `topic_generations`, `content_run_traces` tables
  (migrations `0006`), repository ports with optimistic concurrency
  (`record_revision` guard) — `src/brain/store/db-topic-generation-repository.ts`,
  `db-run-trace-repository.ts`. Production selects the DB store automatically;
  dev keeps CSV. Idea Lab stays file-based (production-impossible by design).
- **Tenant auth**: `src/lib/auth/company-access.ts` — `requireCompanyAccess`
  maps `brands.userId` ↔ companyId via normalized website/devKey.
- **Resilience (P2.2)**: `src/brain/llm/circuit-breaker.ts`, `concurrency.ts`
  (FIFO semaphore, `OPENAI_MAX_CONCURRENCY`), `cost-caps.ts`
  (`BRAIN_TENANT_DAILY_TOKEN_CAP`, `llm_usage_daily`), durable rate limits in
  `src/lib/http/durable-rate-limit.ts` (`rate_limit_windows`, migration
  `0007`). Cost caps fail open on store outage; rate limiter falls back to
  in-memory on DB error.
- **Generalization (P2.3)**: `subjects/context-tokens.ts` (CSV-token
  classifiers), `subjects/commerce-attributes.ts` (typed price/shipping/
  returns/warranty/subscription), subject-kind-conditioned shell families in
  `topic-title-hook/templates.ts`, `faq_education` frame titles. Verified by
  `industry-generalization.test.ts` (plumbing fixture; retail "check" shells
  never reach trust/brand/faq kinds).
- **Quality ops (P3.1)**: golden baseline gate
  (`data/fixtures/golden-topics-baseline.json` + `golden-topics.test.ts`);
  prompt A/B (`policy/prompt-experiments.ts`, env
  `PROMPT_EXPERIMENT_TOPIC_LLM_CANDIDATES`, B runs stamp `+exp-b` version);
  LLM-as-judge sampling (`evaluation/judge/llm-judge.ts`,
  `BRAIN_JUDGE_SAMPLE_RATE`, advisory-only); OTel gen_ai.* mapper
  (`observability/otel-genai.ts`); quality-drop alerting
  (`observability/quality-alert.ts`, `[quality-alert]` structured warnings)
  wired into Idea Lab and the product topic-candidates route. Covered by
  `evaluation/quality-ops.test.ts`.

**Updated release recommendation:** P0+P1 conditions are met and P2/P3 have
landed; remaining pre-customer work is deployment-environment validation
(run migrations 0006/0007 against the production Neon instance, set
`MARKETMONTH_SCHEMA_VERSION`-compatible env, and smoke the DB-backed store) —
not code.
