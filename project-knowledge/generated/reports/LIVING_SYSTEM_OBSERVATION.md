<!-- GENERATED FILE: Living System Observation Audit — 2026-07-26 -->
<!-- Source: manual audit per Knowledge OS Living-System Observation plan -->
<!-- Evidence archive: project-knowledge/generated/reports/_evidence-preserve/pre-observation-2026-07-26T131546/ -->

# Living System Observation — MarketMonth Knowledge OS

**Evaluated:** 2026-07-26  
**Audit type:** Findings-only living observer audit (no product fixes, no rule changes)  
**Evidence preserve:** `project-knowledge/generated/reports/_evidence-preserve/pre-observation-2026-07-26T131546/`

---

## Executive status

| Axis | Status |
|------|--------|
| Knowledge OS operational status | **DEGRADED** (per `knowledge:os-audit` mid-window run; structure/MCP still PASS) |
| Project closeout readiness | **NOT READY** during OS-audit window; later standalone `daily:closeout` reported **READY WITH WARNINGS** — see trust note |
| Internal Engineering Quality Score | **9.1/10** (latest after final closeout); mid-window **8.1/10**; pre-audit archive **9.9/10** |
| External Baseline Coverage | **52%** (latest); mid-window **45%**; pre-audit **55%** |
| External certification | **None** |
| AI audit status | **completed** (live OpenAI API; advisory only; does not affect official score) |
| Historical evidence available | **Partial** — dated daily closeouts for 2026-07-24, 2026-07-25, 2026-07-26; most other reports latest-only |

**Trust note (critical):** During this audit’s Phase 8 window, `typecheck` and `test` failed repeatedly (attempts logged), then later passed without this audit modifying product code. Working-tree contents for brain atom/hash exports changed mid-session (external concurrent edit or parallel agent). Latest-only reports were overwritten. Mid-window truth is preserved in the evidence archive + `KNOWLEDGE_OS_AUDIT.md` (run `14b0ce61-49ea-4ef7-badb-31ac3805d30a`) + `fresh-command-log.jsonl`.

**Mandated conclusion wording (accurate):**

> The MarketMonth Knowledge OS is operating within its documented synchronization model. It is not a continuous watcher. Its conclusions are limited to the checks that executed and the history that was actually retained.

---

## What the system has collected

| Category | Classification | Evidence |
|----------|----------------|----------|
| Application routes | COLLECTED AND ENFORCED | `update.mjs` → `ROUTE_MAP.md`; `knowledge:check` stale compare; `living-detection.test.mjs` |
| API routes | COLLECTED AND ENFORCED | `API_MAP.md`; stale compare; living-detection fixture |
| Environment-variable references | COLLECTED AND ENFORCED | `ENV_MAP.md`; `PK-QUALITY-051/052`; living-detection |
| Ownership / unowned paths | COLLECTED AND ENFORCED | `FILE_OWNERSHIP.md`; `PK-QUALITY-004`; `PK-WARN-003` if unowned>50 |
| Architecture-boundary violations | COLLECTED AND ENFORCED | Guardian `PK-HARD-006/007/008`; `PK-QUALITY-002` |
| Cross-feature deep imports | COLLECTED AND ENFORCED | `PK-QUALITY-063` (`scan-src.mjs`) |
| Deep imports bypassing public APIs | COLLECTED AND ENFORCED | `PK-QUALITY-063/064`; note: guardian `PK-WARN-007` / `disallowDeepFromOtherFeatures` **DEFINED BUT NOT EXECUTED** by guardian |
| Client/server boundary violations | COLLECTED AND ENFORCED | `PK-QUALITY-053` |
| Duplicate routes | COLLECTED AND ENFORCED | `PK-HARD-005`; `PK-QUALITY-001`; living-detection |
| Generated-document freshness | COLLECTED AND ENFORCED | `check.mjs` exact compare; `PK-QUALITY-020`; stop hook |
| Documentation coverage | COLLECTED AND ENFORCED | `PK-QUALITY-021/022`; `PK-WARN-001` |
| TypeScript results | COLLECTED AND ENFORCED | probes → `PK-QUALITY-033`; CI typecheck |
| Lint results | COLLECTED AND ENFORCED | probes → `PK-QUALITY-034`; CI lint |
| Test results | COLLECTED AND ENFORCED | probes → `PK-QUALITY-043`; CI test |
| Build results (`next build`) | NOT IMPLEMENTED | `package.json` has `build`; no probe; not in CI knowledge-check |
| Dependency vulnerabilities | COLLECTED AND ENFORCED | `audit:deps`; CI; OS-audit/closeout gate |
| Secret-scanning results | COLLECTED AND ENFORCED | CI Gitleaks; OS-audit secretLeak; living-detection pattern test (not full scan) |
| File size / export counts | COLLECTED AND ENFORCED | `PK-QUALITY-060/062/032` on `src/**` |
| Monolithic-file warnings | COLLECTED AND ENFORCED | Score via oversized; OS-audit `monolithicFiles` advisory for PK scripts |
| Mixed-responsibility warnings | COLLECTED AND ENFORCED | `PK-QUALITY-061`; OS-audit advisory for `daily-closeout.mjs` |
| Circular dependencies | COLLECTED AND ENFORCED | `PK-QUALITY-065` (`cycles.mjs`) |
| Dead / unused files and exports | NOT IMPLEMENTED | external-baseline `dead_code` = absent |
| Feature-level test presence | COLLECTED AND ENFORCED | `PK-QUALITY-042` |
| Security findings (rubric + CI) | COLLECTED AND ENFORCED | `PK-QUALITY-050..053` + deps + gitleaks; SAST absent |
| AI advisory findings | AI ADVISORY ONLY | `ai-audit.mjs`; never merges into official score |
| Internal quality score | COLLECTED AND ENFORCED | `quality.mjs` → `QUALITY_SCORE.*`; CI `quality:check` |
| External baseline coverage | COLLECTED FOR INFORMATION ONLY | `external-baseline.mjs`; not a fail gate on low % |
| Daily closeout status | COLLECTED AND ENFORCED | `daily-closeout.mjs`; not a CI job step |
| Git provenance | COLLECTED FOR INFORMATION ONLY | `provenance.mjs`; currently `unavailable` / `parent-repo-outside-project` |

---

## What it has detected over time

**Historical evidence actually stored by the system**

| Date/run | Source | Internal score | External % | Closeout | Hard | Soft | Notes |
|----------|--------|----------------|------------|----------|------|------|-------|
| 2026-07-24 | `daily/2026-07-24.*` (stored) | 10/10 | (schema v1; not dual-score) | READY TO CLOSE | 0 | 0 | commit `unknown` |
| 2026-07-25 | `daily/2026-07-25.*` (stored) | 9.9/10 | 55% | READY WITH WARNINGS | 0 | 0 | `PK-QUALITY-051` DISCOVERY_PLAYWRIGHT; SHA unavailable |
| 2026-07-25 | archived `KNOWLEDGE_OS_AUDIT.*` | 9.9/10 | 55% | NOT READY (deps) | — | — | audit:deps exit 1; typecheck-flake noted |
| 2026-07-26 pre-audit | evidence archive maps | — | — | — | 0 | 0 | unowned=2 already on maps; STRUCTURE_WARNINGS empty |
| 2026-07-26 mid Phase 8 | `quality:update` + OS-audit | **8.1/10** | **45%** | NOT READY | 0 | 0 | typecheck+test+deps fail; run id `14b0ce61-…` |
| 2026-07-26 late Phase 8 | `daily/2026-07-26.*` + latest | **9.1/10** | **52%** | READY WITH WARNINGS | 0 | 0 | probes reported pass; deps still block OS closeout readiness semantics |

**Historical trend data is not currently retained for scores/maps/AI/OS-audit.** Only dated daily closeouts (and typecheck-reliability rolling log started by OS-audit) preserve multi-day history. Latest-only artifacts are overwritten.

**Do not invent trends from file mtimes alone.** Chronology above uses dated daily files, archived snapshots, and this audit’s command log.

**Resolved vs introduced (retained period)**

| Change | Evidence |
|--------|----------|
| Score 10 → 9.9 (Jul 24→25) | Daily files; env doc gap `DISCOVERY_PLAYWRIGHT` |
| Unowned onboarding routes appear | Maps 2026-07-26; OS-audit 2026-07-25 claimed unowned=0 → **STALE REPORT** vs later maps |
| Mid-window typecheck/test breakage | Phase 8 attempts 1–2 + OS-audit failed tails |
| Late-window typecheck/test green | Phase 8 attempts 3 / test attempt 2 + daily 2026-07-26 |
| Env undocumented expanded 1 → 9 keys | Quality deductions Jul 26 |
| Cross-feature deep import + oversized + mixed route | New Jul 26 quality deductions vs Jul 25 archive |

---

## Current unresolved findings

### Deterministic — ACTIVE

| Finding code | Severity | Category | Exact file/dependency | Evidence | First observed | Blocks closeout | Affects score | Recommended next action |
|--------------|----------|----------|----------------------|----------|----------------|-----------------|---------------|-------------------------|
| `PK-QUALITY-051` | high | security | 9 env keys (see QUALITY_SCORE) | QUALITY_SCORE deductions | 2026-07-25 (1 key); 2026-07-26 (9 keys) | no alone (deduction) | yes (−4) | Document keys in `.env.example` |
| `PK-QUALITY-004` | medium | ownership | `src/app/api/onboarding/create-plan/route.ts`, `workspace-context/route.ts` | FILE_OWNERSHIP + quality | maps 2026-07-26 | no alone | yes (−2) | Assign owners in `ownership-rules.json` |
| `PK-QUALITY-063` | low | architecture | `brand-approved.tsx` → dashboard `phase-query` | quality | 2026-07-26 | no | yes (−1) | Use public API / shared contract |
| `PK-QUALITY-060` | low | organization | `src/lib/dev/bootstrap-dev-workspace.ts` (532 lines) | quality | 2026-07-26 | no | yes (−1) | Split modules |
| `PK-QUALITY-061` | low | organization | `src/app/api/onboarding/workspace-context/route.ts` layers=[db,server,next,engine] | quality | 2026-07-26 | no | yes (−1) | Thin route; extract services |
| `dep-vulns-high` | high | dependency | sharp/next/eslint/minimatch family (11 high) | `audit:deps` exit 1; DEPENDENCY_BLOCKERS.md | 2026-07-25 | **yes** | no (not in rubric points) | Wait upstream / reviewed overrides only |
| `git-parent-scope` | low | provenance | MarketMonth nested under parent `.git` | QUALITY_SCORE / OS-audit | 2026-07-25 | no | no | Dedicated repo root for SHA |
| `typecheck-flake` / tree instability | high | reliability | brain atom/hash + connected-system surface | Phase 8 log: fail→pass same day | 2026-07-25 noted; 2026-07-26 reproduced | **yes when failing** | yes when failing (−5) | Stabilize exports; investigate concurrent writers |
| `build-not-gated` | medium | observer gap | `next build` | Phase 8 build exit 1 mid-window; no probe | 2026-07-26 audit | N/A (not in closeout) | no | Add build probe or accept NOT IMPLEMENTED |

### Deterministic — mid-window (captured then overwritten in latest QUALITY_SCORE)

| Finding | Status | Notes |
|---------|--------|-------|
| `PK-QUALITY-033` typecheck fail | **NOT REPRODUCED** at end of audit (attempt 3 pass); **ACTIVE** during OS-audit | Do not discard — logged in OS-audit + command log |
| `PK-QUALITY-043` test fail | Same as above | 2 failing connected-system tests mid-window |

### AI advisory (do not affect score)

| Theme | Status | Source |
|-------|--------|--------|
| Undocumented env / deploy risk | ACTIVE (mirrors PK-QUALITY-051) | AI_AUDIT 2026-07-26 |
| Cross-feature deep import | ACTIVE (mirrors PK-QUALITY-063) | AI_AUDIT |
| Mixed-layer onboarding route | ACTIVE (mirrors PK-QUALITY-061) | AI_AUDIT |
| Oversized bootstrap file | ACTIVE (mirrors PK-QUALITY-060) | AI_AUDIT |
| Auth / production gates incomplete | ACTIVE (product CURRENT_STATE) | AI_AUDIT / CURRENT_STATE |
| Engine unit tests / observability gaps | ACTIVE (product CURRENT_STATE) | AI_AUDIT / CURRENT_STATE |

### Exceptions

| Item | Status |
|------|--------|
| Reviewed dep overrides (`overrides.next.postcss`) | EXCEPTION — VALID until 2026-08-25 review |
| Blocked sharp / eslint-10 remediations | EXCEPTION — VALID (documented blockers; closeout remains blocked for deps) |

---

## Resolved findings

| Item | Evidence of resolution |
|------|------------------------|
| Pre-audit only `DISCOVERY_PLAYWRIGHT` as sole quality deduction at 9.9 | Superseded — not “resolved”; expanded to 9 undocumented keys |
| Mid-window typecheck/test failures | **Not confirmed resolved as a durable fix** — later probes passed after tree mutation; treat as unstable until consecutive green CI without concurrent writers |
| Guardian hard/soft structural warnings | Remain 0 across period (PASS) |

---

## Monolithic-file review

Oversized threshold (src): **500** lines (`PK-QUALITY-060`). Extreme: **1000** (`PK-QUALITY-032`). Mixed layers min **3** (`PK-QUALITY-061`).

| Path | Lines | Classification | Mixed? | Detection |
|------|------:|----------------|--------|-----------|
| `project-knowledge/scripts/knowledge-os-audit.mjs` | ~1035 | **REFACTOR RECOMMENDED** | probes + scoring + report render | Manual + OS advisory size note (not src-scored) |
| `src/lib/dev/bootstrap-dev-workspace.ts` | 532 | **REFACTOR RECOMMENDED** | engine+db orchestration | **Detected by PK-QUALITY-060** |
| `src/app/api/onboarding/workspace-context/route.ts` | <500 | **REFACTOR RECOMMENDED** | db+server+next+engine | **Detected by PK-QUALITY-061** |
| `project-knowledge/scripts/daily-closeout.mjs` | ~284 | **REVIEW** | orchestration + report body | OS-audit mixedResponsibility advisory |
| `src/components/dashboard/content/hooks/use-content-production.ts` | ~390 | **REVIEW** | UI hook + brain + fetch | Manual audit only |
| `src/components/dashboard/marketing-topic/hooks/use-content-directions.ts` | ~287 | **REVIEW** | UI hook + brain + API | Manual audit only |
| `src/components/discovery/discovery-strategy-preview.tsx` | ~279 | **REVIEW** | UI + auth + handoff + fetch | Manual audit only |
| `src/components/discovery/discovery-intent.tsx` | ~346 | **WATCH** | mostly UI | Manual |
| Large `*.test.ts` suites | 200–340 | **WATCH** / PASS | test aggregation | Skipped by oversized src rule |

PASS examples (large but cohesive): `dropdown-menu.tsx`, `deterministic-provider.ts`, `create-content-atom.ts`, discovery extractors.

---

## Component independence

| Feature/module | Public entry | Independence status | Boundary notes |
|----------------|--------------|---------------------|----------------|
| discovery-ui | `src/components/discovery/index.ts` | MOSTLY INDEPENDENT | UI must not import engine (enforced) |
| discovery-engine | `src/engine/discovery/index.ts` | MOSTLY INDEPENDENT | Engine must not import React/Next (enforced) |
| discovery-stages-contract | `src/lib/discovery/stages.ts` | INDEPENDENT | Shared contract |
| site-seo | `src/seo/index.ts` | MOSTLY INDEPENDENT | — |
| brand | `src/components/brand/index.ts` | **BOUNDARY VIOLATION** | Deep import to dashboard `phase-query` (`PK-QUALITY-063`) |
| landing | `src/components/landing/index.tsx` | MOSTLY INDEPENDENT | — |
| content-brain / content-production | (ownership rules; public APIs vary) | MOSTLY INDEPENDENT | Studio hooks couple UI↔brain by design via APIs |
| onboarding API routes | **none / unowned** | **COUPLED** | Unowned + mixed layers |
| dashboard | (compose surface) | MOSTLY INDEPENDENT | Allowed orchestration surface |
| Knowledge OS scripts | n/a | COUPLED internally | large orchestrators |

Guardian hard import violations today: **0**. Quality deep-import: **1**. Unowned: **2**.

---

## Report and history coverage

| Capability | Preserved? |
|------------|------------|
| Latest state | Yes (overwritten) |
| Daily snapshots | Yes (`daily/YYYY-MM-DD.{md,json}`) — 3 days observed |
| Score trends time-series | **No** (only via daily files) |
| Finding first-seen dates | **Partial** (infer from daily diffs; not first-seen DB) |
| Resolution dates | **No** dedicated tracker |
| Command history | **Partial** (OS-audit embeds exits; this audit’s `fresh-command-log.jsonl`) |
| Typecheck reliability log | Started (`INSUFFICIENT_HISTORY` after first OS-audit append) |
| AI audit history | Latest-only |
| Maps/indexes history | Latest-only |

---

## Gaps in the observer itself

1. No continuous file watcher  
2. No `next build` probe / CI build gate in knowledge-check  
3. No dead-code / unused-export scanner (Knip/ts-prune)  
4. No SAST (Semgrep/CodeQL)  
5. No a11y / performance budget gates  
6. Guardian `PK-WARN-007` defined but not emitted  
7. `independenceRules.disallowDeepFromOtherFeatures` not executed by guardian (quality collects deep imports instead)  
8. Public cross-feature barrel imports not observed  
9. Score floor `failBelowOutOf10: null` — low score alone does not fail `quality:check`  
10. Latest-only overwrite erases mid-day score/probe failures unless archived  
11. Git SHA unavailable (parent-repo scope)  
12. No runtime / browser E2E observability gate  
13. Tree can change between probes in a single “day,” producing conflicting reports  

---

## Commands run and exit codes (Phase 8)

Log: `_evidence-preserve/pre-observation-2026-07-26T131546/fresh-command-log.jsonl`

| Command | Attempt | Exit | OK |
|---------|--------:|-----:|:--:|
| `npm run typecheck` | 1 | 2 | no |
| `npm run typecheck` | 2 | 2 | no |
| `npm run typecheck` | 3 (post-closeout) | 0 | yes |
| `npm run lint` | 1 | 0 | yes |
| `npm test` | 1 | 1 | no |
| `npm test` | 2 (post-closeout) | 0 | yes |
| `npm run build` | 1 | 1 | no |
| `npm run knowledge:update` | 1 | 0 | yes |
| `npm run knowledge:check` | 1 | 0 | yes |
| `npm run quality:update` | 1 | 0 | yes (wrote 8.1 mid-window) |
| `npm run quality:check` | 1 | 0 | yes |
| `npm run audit:deps` | 1 | 1 | no |
| `npm run ai:audit` | 1 | 0 | yes (live API) |
| `npm run project:audit` | 1 | 0 | yes |
| `npm run knowledge:os-audit` | 1 | 1 | no (OS=DEGRADED, closeout=NOT READY) |
| `npm run daily:closeout` | 1 (standalone after OS-audit) | 0 | yes (READY WITH WARNINGS, 9.1) |
| Nested `daily:closeout` inside OS-audit | — | 1 | no (NOT READY, 8.1) |

**Do not treat the final green probes as erasing earlier failures.**

---

## Final conclusion

| Question | Answer |
|----------|--------|
| Is the Knowledge OS operating? | **Yes**, within its documented sync model (startup sync, structural stop-hook, CI, manual/daily). **Not** a continuous watcher. |
| Collecting meaningful evidence? | **Yes** — routes, APIs, env, ownership, boundaries, probes, deps, dual scores, AI advisory. |
| Detecting real problems? | **Yes** — unowned paths, deep imports, oversized/mixed files, undocumented env, dep highs, and (when present) typecheck/test failures. |
| Are reports trustworthy? | **Conditionally.** Per-run provenance and anti-gaming (NOT_EVALUATED ≠ full credit; AI excluded) work. Latest-only overwrite + mid-day tree mutation make a single “latest” file insufficient for the day’s full truth. |
| Preserving enough history? | **Partial.** Daily closeouts retain a thin multi-day trail; score/maps/AI/OS-audit history is mostly latest-only. |
| Monolithic files detected? | **Partially.** Src oversized/mixed rules fire; PK script monoliths are advisory; cohesion issues in hooks/UI often need manual review. |
| Ready to proceed? | **Not for clean closeout** while high deps remain and mid-day probe instability is unexplained. Product work may continue under **READY WITH WARNINGS** semantics only when probes are green **and** deps policy is accepted as documented blockers — OS-audit still marks project closeout **NOT READY** when deps fail. |

---

## Generated report locations

- This report: `project-knowledge/generated/reports/LIVING_SYSTEM_OBSERVATION.md`
- Machine JSON: `project-knowledge/generated/reports/living-system-observation.json`
- Evidence archive: `project-knowledge/generated/reports/_evidence-preserve/pre-observation-2026-07-26T131546/`
- Related latest: `QUALITY_SCORE.md`, `KNOWLEDGE_OS_AUDIT.md`, `DAILY_LATEST.md`, `AI_AUDIT.md`, `daily/2026-07-26.*`

## Remediation (separate plan — not executed)

A separate remediation plan should be approved before any fixes. Suggested priority order:

1. Stabilize brain atom/hash public exports and ban concurrent writers during closeout  
2. Document the 9 env keys in `.env.example`  
3. Own onboarding API routes; thin mixed-layer handler  
4. Fix brand→dashboard deep import via public API  
5. Split `bootstrap-dev-workspace.ts` and consider splitting `knowledge-os-audit.mjs` / `daily-closeout.mjs`  
6. Continue dep remediations only via reviewed upstream/overrides (no `--force`)  
7. Optionally: build probe, score history retention, emit `PK-WARN-007`, first-seen finding tracker  

**Evidence labels:** Phase 0–9 execution **Verified** via archive + command log + regenerated reports. Concurrent tree mutation source **Not verified**. Continuous watcher absence **Verified** from scripts/hooks/docs.
