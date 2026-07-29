---
title: Discovery Output Quality & Traceability Audit (Part 2)
status: active
authority: advisory
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/engine/discovery/**
  - src/lib/dev/discovery-csv-rows.ts
  - src/brain/content/repository/parse-fixture-csv.ts
  - src/brain/core/compile-brand-core.ts
  - data/companies/zynava.com/approved.csv
  - scripts/refresh-zynava-fixture-from-site.ts
---

# Discovery Output Quality & Traceability Audit

**Date:** 2026-07-28  
**Mode:** Investigation + design only for Part 2 findings below.  
**No-change confirmation:** This audit report was produced from read-only source inspection. It did not modify application code, `data/companies/zynava.com/approved.csv`, Brand Core runtime outputs, or Neon data at the time of writing. (Later Phase A–C implementation is separate.)

**Labels used:** Implemented / Partial / Mocked / Absent / Unsafe

---

## 1. Executive verdict

Discovery can write a useful Zynava CSV with catalog products and FAQ evidence, but it does **not** yet produce sufficient, supported, reviewable company knowledge with stable lineage.

| Dimension | Score | Status |
|-----------|-------|--------|
| Crawl → structured facts | 6/10 | Partial |
| Fact-level evidence + lineage | 2/10 | Absent / Partial |
| Missing-value semantics | 1/10 | Unsafe (empty-cell collapse) |
| CSV losslessness + schemaVersion | 4/10 | Partial / Absent schemaVersion |
| Brand Core as Idea Lab SoT | 3/10 | Partial (doctrine vs practice gap) |
| Rescan / precedence | 2/10 | Unsafe overwrite / sticky cache |
| Frozen reproducibility | 3/10 | Partial (CSV only; no page hashes) |
| Downstream Idea Lab lift | n/a | **Not demonstrated** (harness designed only) |

**Verdict:** Treat current Discovery as a strong **ingest prototype**, not a trusted Brand Core producer. Proceed with Phase A–C remediation below; do **not** claim Idea Lab improvement until the A/B/C harness is run post-implementation.

---

## 2. Stop conditions encountered

Documented as risks — **not fixed during Part 2 investigation**.

| Condition | Finding |
|-----------|---------|
| Undocumented second CSV loader | **FOUND:** `parseFixtureCsv` (brain) vs `loadZynavaFixture` (dev/onboarding). Same file, different schemas/fallbacks. |
| Second Brand Core compilation path | **Not found** in brain (single `compileBrandCore`). Naming collision: Discovery activation `brandCore` ≠ brain Brand Core. |
| Consumer bypassing Brand Core **and** ContentBrainContext | **Not found** in Idea Lab/Directions generation. |
| Bypassing Brand Core as generation input | **FOUND (documented):** Idea Lab topics + deterministic directions use ContentBrainContext as primary; Brand Core is identity/lineage only (`usedAsPrimaryIdeaInput: false`). |
| Perplexity merged into company facts | **Partial YES:** does not overwrite `products`/`catalogProducts`/`brandName`; **does** merge into `contentOpportunities` + `evidenceById`, then `compileBrandCore` can put those into `proof_library`. |
| Neon schema inspection | **Deferred** — legacy Neon; not probed. |
| Tests writing production/Neon | Not run for this audit. |

---

## 3. One fully traced fact (Zynava FAQ)

**Fact:** Zynava does not sell supplements (independent search/comparison engine).

| Hop | File / function | Input → output | Discarded | Traceability |
|-----|-----------------|----------------|-----------|--------------|
| 1. Crawl URL | `crawl-website.ts` `collectPage` | Seed/`faq` kind → `CrawledPage` html+text | Final redirect URL not stored (**Unsafe**); no `pageId`/`contentHash` | URL only |
| 2. Clean | `strip-non-content` + FAQ extractors | HTML → visible Q/A text | Nav chrome sometimes leaks into other fields (see positioning/customerProblems) | No `passageId` |
| 3. Extract | `extract-faq.ts` (JSON-LD FAQPage / accordion) | FAQ list → brand signals | Non-FAQ claims not factored | Deterministic |
| 4. Evidence | `build-evidence.ts` / `makeEvidence` | `{ id: UUID, field: "faq", kind: "observed", value, sourceUrl, sourcePageType, confidence: "high" }` | No `supportingText` separate from `value`; confidence hardcoded | `factId`≈UUID exists **in memory only** |
| 5. CSV | `discovery-csv-rows.ts` `buildEvidenceCsvRows` | Row: `evidence,faq,<Q/A>,https://zynava.com/faq,observed,high,<snippet≤180>,…` | **UUID id dropped**; **sourcePageType dropped**; snippet clipped | URL + value only |
| 6. Parse | `parse-fixture-csv.ts` `toEvidence` | Regenerates `ev_<hash>` ContentEvidence | Different id than Discovery UUID | New id, no page/passage |
| 7. Context | `ContentBrainContext.evidenceById` | FAQ in bag | Not a first-class FAQ array | |
| 8. Brand Core | `compileBrandCore` | First 24 evidence → `proof_library` | FAQ may be crowded out by earlier brand_profile rows; catalog never becomes `offers` | `proof_id` = ContentEvidence id; `source_ref` = URL |
| 9. Idea Lab | `extract-*` / templates / writing-context | Topics use **context** (`catalogProducts`, evidence scans); Brand Core FAQ proof often unused by deterministic path | Brand Core not primary | |

**Exact CSV representation (fixture row):**

```text
evidence | faq | Q: Does ZYNAVA sell supplements? A: No. Zynava does not sell... | https://zynava.com/faq | observed | high | <clipped snippet> | Refreshed... | 2026-07-27T22:38:11.925Z
```

**EvidenceRef survival**

| Id | Crawl | Extract | CSV | Parse | Context | Brand Core | Idea Lab prompt |
|----|-------|---------|-----|-------|---------|------------|-----------------|
| `pageId` | Absent | Absent | Absent | Absent | Absent | Absent | Absent |
| `passageId` | Absent | Absent | Absent | Absent | Absent | Absent | Absent |
| `factId` | Partial (UUID) | Partial | **Lost** | New `ev_*` | Partial | `proof_id` | Usually unused |

**Verdict:** Important marketing claim is extractable and present in CSV, but **cannot** be stably traced with `EvidenceRef` through the pipeline. Source URL alone is insufficient.

---

## 4. Field-level matrix (summary)

### CSV columns (`DISCOVERY_CSV_HEADERS`)

| Field | Producer | Evidence | KnowledgeState | Brand Core dest | Idea Lab consumer | Status |
|-------|----------|----------|----------------|-----------------|-------------------|--------|
| record_type | writer | n/a | n/a | via parse | parse only | Implemented |
| field | writer | n/a | n/a | | | Implemented |
| value | extract/LLM | clipped | collapsed empty | various | yes | Partial |
| source_url | crawl/social | single URL | n/a | proof `source_ref` | partial | Partial |
| evidence_type | kind map | observed/inferred/… | ≠ KnowledgeState×4 | dropped at compile | scoring indirect | Partial |
| confidence | mostly hardcoded | high/medium | arbitrary | dropped | no | Partial / Unsafe |
| source_snippet | clip 180 | not full passage | n/a | dropped | no | Partial |
| notes | refresh notes | | | dropped | no | Partial |
| retrieved_at | ISO timestamp | | | dropped | no | Partial |
| schemaVersion | — | — | — | — | — | **Absent** |

### brand_profile fields → context → Brand Core

| Field | Populated from crawl? | Generic fallback? | → Context | → Brand Core | Downstream | Status |
|-------|----------------------|-------------------|-----------|--------------|------------|--------|
| businessName | yes | ZYNAVA defaults on loadZynava | brandName | brand_name | yes | Implemented |
| website | yes | | website/domain | website/domain | yes | Implemented |
| description | meta/about/LLM | fb-profile | description | positioning fallback | yes | Partial |
| audience | mostly LLM | compile generic | audience | audience.primary | yes | Partial / Unsafe |
| products | platform caps | | products | offers | yes | Implemented |
| services | | | services | offers | Partial |
| catalogProducts | JSON-LD + mine | | catalogProducts | **NOT mapped** | Idea Lab subjects yes | **Partial gap** |
| valueProposition | LLM/fallback | generic | valueProposition | positioning | yes | Partial |
| brandVoice | LLM/fallback | compile default | brandVoice | voice | partial | Partial |
| marketingOpportunity | SEO/LLM | | marketingOpportunity | offers fallback | yes | Partial |
| colors | CSS scrape | | **dropped** | unset | no | Loss |
| socialProfiles | link find | | **dropped** | no | no | Loss |
| competitors | heuristic | | **dropped** | no | no | Loss |
| seo.* (meta/speed/tech) | analyze-seo | | mostly dropped | no | no | Loss |
| seo.contentOpportunities | analyze-seo | | contentOpportunities | no | subjects yes | Partial |

### Brand Core–only / hardcoded (not from Discovery)

| Field | Source | Status |
|-------|--------|--------|
| banned_claims | hardcoded list | Mocked vs brand |
| psychology_principles | hardcoded | Mocked |
| cta_rules | hardcoded | Mocked |
| visual_identity | hardcoded | Mocked |
| audience fallback string | compile | Unsafe generic |

### Evidence fields in fixture (examples)

`businessName`, `description`, `logoUrl`, `contact*`, `legalName`, `founder`, `organizationDescription`, `productsServices`, `catalogProduct`, `positioning`, `customerProblems`, `faq`, `educationalTopics`, `websiteTestimonial`, `websiteCta`, `social.*`, `ownedTopics`

---

## 5. KnowledgeState (`observed | inferred | not_found | not_applicable`)

| State | Representable today? |
|-------|----------------------|
| observed | Partial via `evidence_type=observed` |
| inferred | Schema allows; crawl builder rarely/never emits |
| not_found | **Absent** — empty cell / missing row |
| not_applicable | **Absent** |

**Unsafe:** All four collapse to empty CSV cell or missing row → later generation may invent locations, audiences, or claims.

---

## 6. Crawl coverage findings

| Capability | Status |
|------------|--------|
| Seed + same-origin BFS | Implemented |
| Nav-only link discovery | Partial |
| Sitemap / robots | Absent |
| Canonical HTML for dedup | Absent (URL normalize only) |
| Redirect final URL | Unsafe (input URL returned) |
| Playwright JS shells | Implemented (optional) |
| JSON-LD extract | Implemented (FAQ/Product/Org) |
| PDFs | Absent (rejected) |
| Pagination | Absent |
| Languages / hreflang | Absent |
| Skip reasons structured | Partial (silent skips) |
| Caps 10/24/3 | Implemented |
| Stop by coverage completeness | Absent |
| Coverage report by purpose | Absent |

---

## 7. Evidence & contradiction findings

| Capability | Status |
|------------|--------|
| Fact-level rows | Partial |
| supportingText ≠ value | Absent |
| Multi-source per fact | Absent |
| Corpus URL validation | Absent |
| Meaningful confidence | Partial (hardcoded) |
| Explicit vs inferred | Partial |
| Contradiction / rescan patch | Absent |
| Owner precedence engine | Absent |
| Stale source detection | Absent |

Required future patch shape (design): `{ added, changed, removedFromWebsite, contradictions, unchanged }`.

---

## 8. CSV losslessness

| Concern | Status |
|---------|--------|
| Multi catalog products | Implemented (JSON + evidence rows) |
| Multi FAQs | Implemented (one row each) |
| Claims + multi evidence | Absent |
| Approval / KnowledgeState | Absent |
| Discovery UUID / pageId | **Lost** |
| sourcePageType | **Lost** |
| Nested strategy | One JSON blob → evidence only |
| schemaVersion | Absent |
| Round-trip deterministic IDs | **Unsafe** (hash regeneration) |

Recommend: keep CSV for Zynava; add `schemaVersion` + optional JSON columns for `evidence_ref` / `knowledge_state` before multi-file split. Change format only where relationships are lost (lineage + states).

---

## 9. Extraction safety

| Item | Status |
|------|--------|
| Strict JSON + Zod | Partial (json_object + safeParse) |
| Retries | Absent |
| Temperature control | Absent |
| Hallucinated catalog overwrite | Mitigated (LLM cannot overwrite catalogProducts) |
| Webpage prompt injection fencing | **Absent / Unsafe** |
| Product vs platform separation | Partial (products vs catalogProducts) |
| Duplicate merge | Partial (caps / scrub) |

---

## 10. Acceptance gate (design only)

Gate should run after extract, before trusted fixture write / Brand Core approve:

```ts
type DiscoveryAcceptance = {
  hasCompanyIdentity: boolean;
  hasOfferings: boolean; // products|services|catalogProducts
  hasAudienceEvidence: boolean;
  hasProblemEvidence: boolean;
  supportedClaimsRatio: number;
  unknownCriticalFields: string[];
  contradictionCount: number;
  pageCoverage: number; // should become purpose coverage
  genericLanguageScore: number;
  accepted: boolean;
  diagnostics: string[];
};
```

| Failure mode | Current behavior | Desired |
|--------------|------------------|---------|
| Homepage only | Still writes profile | Fail gate + diagnostics |
| No product pages | May still invent LLM audience | Fail offerings / audience evidence |
| Image-heavy | Thin text / Playwright maybe | Diagnostic + low coverage |
| Cap before FAQ | FAQ missing silently | `missingExpectedTypes` |
| Mid-fail crawl | Partial cache / partial CSV | Diagnostic report, not “complete” CSV |
| Generic audience | Accepted | Raise `genericLanguageScore` |

Belong: `refresh-zynava-fixture` + `analyze-website` before persist; Idea Lab should refuse “trusted” if gate failed.

---

## 11. Idea Lab evaluation harness (design — not demonstrated lift)

### Conditions

| Id | Knowledge |
|----|-----------|
| A | Minimal: company name + category only |
| B | Current Zynava CSV / context |
| C | Evidence-backed Brand Core (post Phase A–C) |

### Prompts (representative)

1. Product education topics for Magnesium glycinate  
2. Comparison topics (price per serving)  
3. Trust / “do you sell supplements?” FAQ-aligned  
4. Six directions for one locked master topic  

### Scoring (0–5 each)

Company specificity · Product accuracy · Audience relevance · Claim support · Differentiation · Repetition · Generic language · Prohibited/unsupported · Traceability to Brand Core · Direction diversity  

### Part 2 vs later

| Part 2 (this report) | Later |
|----------------------|-------|
| Harness + scoring defined | Run A/B/C |
| Baseline: fixture retrieved_at `2026-07-27T22:38:11.925Z`, 69 rows | Compare lift |
| **No claim of improvement** | Accept/reject Phase C |

Existing hooks to reuse: `idea-lab-baseline.ts`, `compare:directions-providers`, `topic-candidate-score-v2`.

---

## 12. Frozen reproducibility package

| Artifact | Present? |
|----------|----------|
| Retrieval date | Partial (`retrieved_at` on CSV rows) |
| Final URLs | Partial (may be request URL, not redirect final) |
| Page hashes | **Absent** |
| Discovery config (caps, Playwright) | Code constants only — not recorded in CSV |
| Model name | Not on CSV rows |
| Prompt / extractor version | Absent |
| CSV schemaVersion | Absent |
| Brand Core compiler hash | `bc_${contextVersion}` from CSV hash — Partial |

**Gap:** Cannot freeze crawl corpus today. Phase C page snapshots + manifest required for true before/after.

---

## 13. Bypass list (Idea Lab / Directions)

1. Topics generate from ContentBrainContext, not Brand Core offers/proof  
2. Deterministic directions ignore `brandSlice`  
3. `catalogProducts` never enter Brand Core `offers`  
4. Research Assist prompt labels “Brand Core context” but reads raw context  
5. Live Perplexity → context evidence → may become Brand Core proofs  
6. Parallel loader `loadZynavaFixture` for Discovery UI (outside ILD)

---

## 14. Loss report (boundaries)

```text
A Discovery→CSV: UUID id, sourcePageType, full HTML, page hashes
B CSV→Context: colors, social, competitors, most SEO, structured strategy
C Context→Brand Core: catalogProducts, contentOpportunities, confidence, evidence_type; proof cap 24; generic audience/voice/positioning injected
D Brand Core→slices: further trim; Directions claims ≈ positioning only
```

---

## 15. Trust report

| Class | Examples |
|-------|----------|
| Observed | FAQ rows, catalogProduct rows, contact/org when from JSON-LD |
| Inferred / LLM | audience, brandVoice, valueProposition (often) |
| Unsupported / noisy | positioning/customerProblems with nav chrome prefix |
| Contradictory | No detector |
| Stale | No detector |
| Owner-controlled | Intent fields in strategy only; no Brand Core approve state |
| Generic injected | compileBrandCore audience/voice/positioning/banned_claims |

---

## 16. Minimal remediation map → Phases A–C

| Finding | File(s) | Test | Quality gain | Phase |
|---------|---------|------|--------------|-------|
| No `getBrandCore` facade; ad-hoc loaders | new `get-brand-core.ts`; wire ILD/GCU | unit load Zynava | Single SoT entry | A |
| Doctrine layers undocumented | `CONTENT_BRAIN.md` | knowledge:check | Clear Layer1–3 | A |
| catalogProducts/FAQ not in Core | `compile-brand-core.ts` | compile fixture asserts catalog in offers/proof | Topics can lean on Core | B |
| Sticky analyze cache / overwrite | `analyze-website.ts`, API `forceRefresh` | API contract test | Rescan-safe | B |
| No acceptance gate | refresh script + analyze | gate unit | No deceptive CSV | B |
| No page hashes / corpus | refresh + `data/runtime/discovery-pages/` | snapshot write test | Frozen audit | C |
| No passage retrieve | new stub over snapshots | keyword hit on FAQ | Pre-RAG | C |
| EvidenceRef / KnowledgeState | schema + CSV columns | round-trip | Traceability | B (minimal columns) |

---

## 17. Acceptance tests (later)

Normal multi-product · service-only · one-pager · JS-heavy · duplicate/tracking URLs · contradictory claims · products+unrelated tools · many FAQs · unsupported superlatives · malicious injection page · rescan add/remove product · owner≠website positioning.

---

## 18. Exact files likely to change (Phase A–C)

- `project-knowledge/CONTENT_BRAIN.md`
- `src/brain/core/get-brand-core.ts` (new)
- `src/brain/core/compile-brand-core.ts`
- `src/brain/core/brand-core.schema.ts`
- `src/brain/use-cases/ild/load-and-parse.ts`
- `src/brain/use-cases/run-idea-lab-topic-candidates.ts`
- `src/brain/use-cases/gcu/load-brand-context.ts`
- `src/lib/discovery/analyze-website.ts` + analyze route
- `scripts/refresh-zynava-fixture-from-site.ts`
- `src/lib/dev/discovery-csv-rows.ts` (schemaVersion / optional lineage columns)
- `src/engine/discovery/**` (page snapshot emit; optional coverage meta)
- `data/runtime/discovery-pages/` (new, gitignored or fixture-sized)
- Tests under `src/brain/**` and `src/engine/discovery/**`

---

## 19. Perplexity boundary

**Advisory only.** Current merge into context evidence → Brand Core proofs is a **stop-condition risk**. Remediation: exclude `industry_research` evidence from `proof_library` (or tag `knowledgeType: derived`) before treating Brand Core as approved company facts.
