---
title: Content Brain Ownership Matrix
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/brain/**
  - src/brain/content-studio/**
  - src/brain/craft/**
  - project-knowledge/CONTENT_BRAIN.md
  - project-knowledge/DOMAIN_GLOSSARY.md
  - project-knowledge/DECISIONS/0005-content-atom-v2.md
  - docs/ai/content-brain-stabilization.md
  - mcp/src/security/docs-registry.ts
  - src/lib/project-knowledge/retrieve.ts
  - reference-library/
---

# Content Brain Ownership Matrix

Supporting engineering map for Content Brain stabilization. Doctrine SoT remains [`project-knowledge/CONTENT_BRAIN.md`](../../project-knowledge/CONTENT_BRAIN.md). Terminology SoT: [`DOMAIN_GLOSSARY.md`](../../project-knowledge/DOMAIN_GLOSSARY.md). Stabilization log: [`content-brain-stabilization.md`](./content-brain-stabilization.md).

**Classification legend**

| Label | Meaning |
| ----- | ------- |
| Present debt | Known duplication / incomplete ownership; track and burn down |
| Immediate regression | Wrong owner or dual SoT would break live product path |
| Maturity | Correct enough for Zynava CSV-dev; formalize when multi-tenant |
| Deferral | Explicitly out of current slice; do not “fix” by inventing |

---

## Ownership matrix

| Concept | Canonical owner | Canonical file | Other definitions | Active consumers | Duplicate risk | Required action | Classification |
| ------- | --------------- | -------------- | ----------------- | ---------------- | -------------- | --------------- | -------------- |
| Brand Core | `src/brain/core/` | `src/brain/core/brand-core.schema.ts` + `src/brain/core/compile-brand-core.ts` | Doctrine summary in `CONTENT_BRAIN.md`; slice in `directions-brand-core-slice.ts` | Directions (`gcu/load-brand-context.ts`, `generate-content-directions.ts`), Idea Lab (`ild/load-and-parse.ts`), Atom/pipeline, Marketing Topic tests | Treating CSV / Discovery JSON as peer SoT | Keep compile pure; ingest helpers only feed `ContentBrainContext` → `compileBrandCore()` | Immediate regression |
| Company discovery input | Discovery engine (ingest helper) | `src/engine/discovery/` (+ API `src/app/api/discovery/**`) | Product brand UI `src/components/brand/**`; onboarding workspace stubs | LEARN / MCP wrappers; future Brand Core compile from live domain | Inventing a second brand SoT beside Brand Core | Live `BrandContextRepository` remains stub (`create-brand-context-repository.ts`); Discovery → Brand Core compile is future ingest, not doctrine | Maturity |
| CSV fixture input | Content Brain repository | `src/brain/content/repository/default-fixture.ts` → `data/companies/zynava.com/approved.csv` | `parse-fixture-csv.ts`, `fixture-repository.ts`, Idea Lab `ild/fixture.ts` | Product directions, Idea Lab, e2e/stabilization fixtures | Hard-coding fixture paths outside `default-fixture.ts` | All loaders use `DEFAULT_FIXTURE_RELATIVE` / `defaultFixtureAbsolute()` | Present debt |
| Owner-supplied context | Content Brain content layer | `src/brain/content/extra-context.ts` (`ExtraContextPayload`) | Type alias `OwnerConfirmedContext` in `src/brain/content/types.ts`; handoff summary field `extraContextSummary` | `withOwnerConfirmedContext` in directions; Marketing Topic UI | Confusing with website evidence IDs | Never assign evidence IDs; keep validation limits in `extra-context.ts` | Maturity |
| Normalized topic | Content Brain history grouping | `src/brain/content/normalize-topic.ts` (`normalizeInputTopic`) | Persisted column via `TopicGenerationRecord` / CSV repo `listByNormalizedTopic` | `topic-generation-record.ts`, `CsvTopicGenerationRepository`, novelty / similar-topic notices | Re-implementing normalize in UI or routes | Single function; do not mutate user-visible `input_topic` | Maturity |
| Selected topic context | Content Brain directions | `src/brain/content/direction-writing-context.ts` (`SelectedTopicContext` + Zod) | Idea Lab lineage embeds fields; GCU input in `use-cases/gcu/types.ts` | `gcd/build-master-topic.ts`, `assemble-bundle.ts`, `provider-stage.ts`, Idea Lab ILD | Ad-hoc `{ topic, title }` objects in UI | Pass Zod-validated `SelectedTopicContext` only; masterTitle never trim-mutated | Immediate regression |
| Content direction | Content Brain directions | `src/brain/content/types.ts` (`ContentVariation` / `ContentDirectionCell`) | History projection `TopicGenerationDirection` in `topic-generation-record.schema.ts` | Marketing Topic UI, Idea Lab cards, handoff builder | UI redefining angle / summary rules | UI presentation only; brain owns fields + Six-Idea Contract | Present debt |
| Six-direction bundle | Content Brain directions | `src/brain/content/types.ts` (`ContentDirectionResult`) + `gcd/assemble-bundle.ts` | Doctrine Six-Idea Contract in `CONTENT_BRAIN.md` | `generateAndRecordContentDirections`, product API `content-directions`, Idea Lab ILD | Parallel Lab-only bundle shapes | Shared use case; Lab provider locked `deterministic-v1` | Immediate regression |
| Selected direction | Content Brain handoff | `src/brain/content/handoff.ts` + `ContentDirectionsHandoffV1` in `types.ts` / `schemas.ts` | Session store `src/brain/store/handoff-store.ts`; API `/api/brain/session` | Atom (`build-content-atom-from-handoff.ts`), Studio via locked `atomId` | Saving full six ideas as “selected” without Gate 1 | Gate 1 = human picks ONE `selectedVariationId` | Immediate regression |
| Content Atom | Core Content Brain / atom | `src/brain/atom/content-atom.schema.ts` + `build-content-atom.ts` | Pipeline wrappers `pipeline/core-content-brain.ts`, `deterministic-atom.ts`; ADR 0005 | Channel specialists, Content Studio, StrategyLock, review route | Unconstrained LLM atom / hollow templates | Product constrained LLM via `atom/generate.ts` + `PRODUCT_ATOM_PREFER_LLM` in `provider-policy.ts`; deterministic thin fallback | Immediate regression |
| Craft DNA | Shared craft clauses + atom polish | `src/brain/craft/` (`CRAFT_DNA_VERSION`) + `src/brain/atom/craft-polish/` | Topic LLM / hook-enrichment / Discovery display-copy craft clauses | Atom two-pass polish, Idea Lab Craft tab, inspectors | Treating polish as always-on product default | Opt-in fail-closed (`ATOM_CRAFT_POLISH_PROVIDER` or experiment arm B); grounding beats style | Maturity |
| Channel package | Channel specialists + content-studio adapters | Shared envelope `src/brain/channels/package-envelope.schema.ts`; YouTube Short `youtube-short/`; formats in `src/brain/content-studio/` | Other channels `not_connected` scaffolds | `produce-content-bundle`, Short/Video adapters | Fake generation on `not_connected` channels | **channelRegistry:** only YouTube Short `enabled`; Video via format registry | Maturity |
| Content Studio format package | Content Studio | `src/brain/content-studio/` (`platform-registry.ts`, `schemas/format-package.ts`, adapters) | Orchestration `produce-content-bundle.ts`; DTO `content-studio/to-studio-package.ts` | `/content?atomId=` Studio, production API | Confusing Studio Video with `youtubeLong` channel | YouTube Short + Video formats **Live** under format registry; other platforms `coming_soon` | Immediate regression |
| Production bundle store | Content Studio persistence | `src/brain/content-studio/bundle-store.ts` → `data/runtime/production-bundles/` | Not Neon; schema in `format-package.ts` | Production GET/POST, atom Studio shell | Inventing a second durable package SoT in Neon without ADR | Idempotent JSON bundles keyed by atom; export/render remain stubs | Maturity |
| Lab quality signal | Idea Lab judge + harness | `judgeTopicCandidates` (always-on Lab) + golden harness | Product history `TopicGenerationEvaluation` / `saveEvaluation` (separate system) | Idea Lab runs, quality-drop alerts | Product Gate 2 using Lab judge as production approve; resurrecting deleted `idea-quality.schema` / eval drawer | Judge advisory only; no human checklist UI (ADR 0005) | Present debt |
| Review decision | Product Review (shell) | `src/app/(app)/review/page.tsx` + mock `src/data/mock-review` | Package envelope `status: draft \| validated \| rejected`; Studio Gate 2 Partial in content dashboard | Review page (placeholder), Studio continue-to-review | Claiming Gate 2 complete | Document honesty — full approve/reject-per-package not shipped | Present debt |
| Run trace | Product observability + Lab inspector | `src/brain/observability/` (`RunContext` / `TraceRecorder` → `ContentRunTrace`); durable `content_run_traces` | Lab: `build-idea-lab-trace.ts` + `BrainTraceStep`; ILD stages | Directions route best-effort persist; Idea Lab inspector | Parallel opaque product formats without contract | Product RunContext Partial/Live best-effort; Lab keeps `BrainTraceStep` | Maturity |
| Runtime history | Topic generation store | `src/brain/store/csv-topic-generation-repository.ts` → `data/runtime/topic-generation-history.csv` | Idea Lab history `data/runtime/idea-lab-topic-history.csv` (`IDEA_LAB_HISTORY_RELATIVE`); record shape `topic-generation-record.schema.ts` | Novelty, eval, Marketing Topic soft-notices, compare scripts | Writing product history from Idea Lab; dual JSON stores (removed — keep gone) | CSV only via repository; Lab never writes product CSV | Immediate regression |
| Provider policy | Brain policy | `src/brain/policy/provider-policy.ts` | Resolver `content/providers/resolve-provider.ts`; ADR 0002 | Product directions API, Idea Lab ILD, atom preferLlm gate | Scattered `deterministic-v1` string literals / openai-stub language | Import policy constants; no stub provider | Immediate regression |
| Model registry | Brain policy | `src/brain/policy/model-registry.ts` | Env fallbacks still read in some adapters historically | Intelligent directions, LLM atom, hook enrichment, Discovery | Hard-coding model ids in prompts/adapters | `resolveModel(key)` only | Present debt |
| Prompt templates | Feature-local prompt modules | Directions: `content/providers/intelligent-v1/prompt.ts`; Atom: `atom/generate.ts` (re-export via `pipeline/prompts.ts`); YT Short: deterministic `specialist.ts` (no LLM prompt); Lab research / polish under `evaluation/**` | Discovery strategy prompts under `src/engine/discovery/**` (separate product surface) | Providers that call OpenAI | Central `PROMPTS.md` / dumping PK into prompts | Keep prompts colocated; never inject Project Knowledge wholesale | Maturity |
| MCP document registry | Discovery MCP security | `mcp/src/security/docs-registry.ts` (`PROJECT_DOCS`) | Tool descriptions in `docs/ai/mcp.md` | `mm_read_project_doc` allowlist | Adding arbitrary paths or Refrence | Allowlist only; MCP does not orchestrate Content Brain | Immediate regression |
| Project Knowledge retrieval seeds | Knowledge lib | `src/lib/project-knowledge/retrieve.ts` (`SEED_DOCS`) | Ask route `src/app/api/project-knowledge/ask`; docs-index | Agents / ask spanning reader | Seeding reference-library or `.env`; dumping retrieval into generation | Block prefixes include `reference-library/` + legacy `Refrence folder/`; CONTENT_BRAIN in seeds for doctrine Q&A only | Immediate regression |
| reference-library | Noncanonical research library (non-product) | `reference-library/` (repo root) | README, `index.yaml`, `PROMOTION.md`, ignore lists | **None in production** — blocked by retrieve, MCP, tsconfig, ask, `.cursorignore` | Copy-paste into `src/` or doctrine | **KEEP** noncanonical; never import; promote only via rule below | Deferral |

---

## reference-library — quarantine and promotion

**KEEP** as a noncanonical research library for deliberate human-directed reading.

| Rule | Detail |
| ---- | ------ |
| Imports | Never import into `src/`, MCP tools, or Project Knowledge ask/retrieval |
| Product truth | Never overrides `PRODUCT.md`, `CONTENT_BRAIN.md`, or Brand Core |
| Runtime | No consumers; blocked in `retrieve.ts`, MCP path policy, knowledge ignores, `.cursorignore` |
| Map | `reference-library/index.yaml` (not RAG) |
| Process | [`reference-library/PROMOTION.md`](../../reference-library/PROMOTION.md) |

### Promotion rule (mandatory)

Nothing moves **directly** from `reference-library/` into production code or `CONTENT_BRAIN.md`.

```text
Reference concept
  → compare against repo (code + project-knowledge)
  → collect code evidence (paths, tests, runtime behavior)
  → determine applicability (fit / partial / reject)
  → record human decision
  → ADR and/or update canonical doctrine
  → implement and test
```

Advisory research may inspire a design; only human-approved ADR/doctrine + implemented code become MarketMonth truth.

---

## Contract justification

Lean approach: formalize a named contract only when data crosses a real boundary (API ↔ brain, UI ↔ brain, Lab ↔ product history, or persistence). In-process TypeScript types with a single owner file are enough until then.

### Normalized Topic

1. **Exchangers:** Directions / topic-generation recording (`topic-generation-record.ts`) ↔ history repository (`CsvTopicGenerationRepository.listByNormalizedTopic`).
2. **Persisted?** Yes — grouping key on topic history CSV rows (derived from `input_topic`, not a second user-facing field).
3. **Cross-boundary?** Soft — UI may display “similar topic” notices; normalization must stay server/brain-side.
4. **Inconsistent definitions?** Low risk if UI never re-implements trim/case rules.
5. **Versioning value?** Low — pure string normalize; document behavior, no schema version needed.
6. **Lean approach:** Keep `normalizeInputTopic` as the sole function; no separate packet type.

### Content Context Packet

1. **Exchangers:** Today split across `ContentBrainContext` (`types.ts`) for brand ingest and `DirectionWritingContext` / `SelectedTopicContext` (`direction-writing-context.ts`) for directions writing. Product ↔ Lab both consume these.
2. **Persisted?** Partially — Brand Core identity/version/hash yes; full writing context embedded in Idea Lab lineage; product handoff carries summaries, not a unified packet.
3. **Cross-boundary?** Yes (UI → API → use cases) but not yet one named envelope.
4. **Inconsistent definitions?** **Yes — present debt.** Baseline notes five named contracts not fully formalized; “Content Context Packet” is the aspirational name for the composed stage input.
5. **Versioning value?** Medium once unified — today `contextVersion`, `WRITING_CONTEXT_VERSION`, Brand Core `version` already exist as partial substitutes.
6. **Lean approach:** Do not invent a new mega-type yet. Document the composition: Brand Core slice + `SelectedTopicContext` → `DirectionWritingContext`. Formalize a versioned packet when live (non-fixture) Brand Core and product RunContext ship.

### Evaluation Result

1. **Exchangers:** Idea Lab LLM-as-judge (`judgeTopicCandidates`, always-on, advisory) + golden harness. Separately, product history may carry lightweight `TopicGenerationEvaluation` / `saveEvaluation` fields.
2. **Persisted?** Lab run metadata under Lab runtime history; product draft-level eval metrics still debt.
3. **Cross-boundary?** Lab judge must not become production Gate 2 approve without a product schema.
4. **Inconsistent definitions?** Medium — Lab advisory judge vs product history eval vs future Gate 2.
5. **Versioning value?** High for product Gate 2 when it lands; Lab judge stays advisory.
6. **Lean approach:** Do **not** resurrect deleted `idea-quality.schema.ts` / evaluation drawer; keep Lab judge + harness as Lab quality signal; do not overload them for Studio Gate 2.

### Review Decision

1. **Exchangers:** Intended: Studio / Review UI ↔ channel package / production workflow. **Today:** Review page uses `src/data/mock-review`; package envelope has `status` but full Gate 2 approve/reject is Partial. Atom approve/lock is a separate Gate-1-adjacent path (`content-atom/review`).
2. **Persisted?** Not as a real product package-decision store yet (mock queue).
3. **Cross-boundary?** Will be (UI ↔ API ↔ store) when Gate 2 completes.
4. **Inconsistent definitions?** High if docs claim shipped approve/reject — honesty required.
5. **Versioning value?** High when real — align with `packageEnvelopeSchema.status` + audit fields.
6. **Lean approach:** No new review-decision package until Gate 2 UI + persistence exist; reuse envelope status rather than a parallel enum.

### Content Run Trace

1. **Exchangers:** Product: `RunContext` / `TraceRecorder` → `ContentRunTrace` (best-effort persist to `content_run_traces` from directions and related brain routes). Lab: `build-idea-lab-trace.ts` + `BrainTraceStep` ↔ Idea Lab inspector.
2. **Persisted?** Product durable table when DB available; Lab under `data/runtime/` (gitignored).
3. **Cross-boundary?** Product Partial/Live best-effort; Lab inspector remains Lab-scoped.
4. **Inconsistent definitions?** Low inside Lab (`IDEA_LAB_TRACE_STAGES`); product must keep the observability contract — not invent a second opaque format.
5. **Versioning value?** Medium–high for shared stage ids / cost telemetry.
6. **Lean approach:** Keep Lab `BrainTraceStep`; evolve product `RunContext` in place (not deferred as “absent”).

---

## Migration ledger (skeleton)

| Legacy path | Canonical replacement | Consumers remaining | Compatibility mechanism | Delete after |
| ----------- | --------------------- | ------------------- | ----------------------- | ------------ |
| Hard-coded `data/companies/zynava.com/approved.csv` string literals | `src/brain/content/repository/default-fixture.ts` | Grep for stragglers in tests/scripts | Re-export constants; deprecate inline paths | Zero non-constant path literals in `src/` |
| openai-stub / stub provider language in docs | `provider-policy.ts` + `resolve-provider.ts` (no stub) | Docs/comments only if any remain | Doctrine already cleaned; CI/policy tests | No stub mentions in active doctrine |
| Dual topic history / legacy JSON topic store | `CsvTopicGenerationRepository` + `data/runtime/topic-generation-history.csv` | None expected (removed dual stack) | Boundary test in `architecture-boundary.test.ts` | Confirmed absence in tree |
| Idea Lab writing product `topic-generation-history.csv` | Lab-only `data/runtime/idea-lab-topic-history.csv` | Guard via SANDBOX.md + code paths | Separate relative path constant | Any Lab write to product CSV |
| Scattered model env reads | `src/brain/policy/model-registry.ts` `resolveModel` | Older adapters if any bypass registry | Route all OpenAI model picks through registry | Adapters call `resolveModel` only |
| `decision_set_id` identity | `generation_id` only | None (removed) | Handoff / record schemas | No reintroduction |
| Content Context Packet (unnamed composition) | Documented composition → future versioned packet | Directions + Lab + Atom loaders | Versions: Brand Core + `WRITING_CONTEXT_VERSION` | After live Brand Core + product RunContext |
| Review mock queue `src/data/mock-review` | Real Gate 2 decision store + package status | `src/app/(app)/review/page.tsx` | Keep mock until Gate 2 ships | Gate 2 approve/reject persisted |
| Product RunContext / draft-eval envelope | `observability/` + durable `content_run_traces` (best-effort); not Lab `BrainTraceStep` | Directions / brain routes / Studio | Keep Lab stages separate | Broaden persist coverage + cost telemetry |
| Idea Lab human eval checklist / `idea-quality.schema.ts` | Always-on Lab judge + golden harness (ADR 0005) | None (deleted) | Verify gate asserts absence | Already deleted — do not reintroduce |
| Bare `/content` + MT legacy handoff Studio | Atom deep-link `/content?atomId=` + `produceContentBundle` | Marketing Topic → bare `/content` still dual-path | Document Partial until sanitize/cutover | After MT select→atom parity + legacy delete |
| `scripts/debug-title-polish-api.mjs` | N/A (deleted) | None | — | Already deleted |
| `reference-library/` research shelf | Cold archive outside repo + in-repo curated map | Zero product consumers | Keep blocked in retrieve/MCP/tsconfig/`.cursorignore` | Full dump already in CP0 cold archive; in-repo tree is curated only |
| Physical `domain/` vs `infrastructure/` package split | Logical layers under `src/brain/**` today | Entire brain tree | Defer move to avoid churn | Explicit refactor milestone |

---

## Related

- [`CONTENT_BRAIN.md`](../../project-knowledge/CONTENT_BRAIN.md) — doctrine
- [`DOMAIN_GLOSSARY.md`](../../project-knowledge/DOMAIN_GLOSSARY.md) — terms
- [`content-brain-stabilization.md`](./content-brain-stabilization.md) — decisions + score
- [`content-brain-stabilization-baseline.md`](./content-brain-stabilization-baseline.md) — pre-change audit
- [`mcp.md`](./mcp.md) — MCP allowlist policy
- [`ownership-rules.json`](../../project-knowledge/ownership-rules.json) — folder owners (`content-brain`, `knowledge`, `mcp`)
