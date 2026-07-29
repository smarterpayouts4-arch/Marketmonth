import type { ContentBrainContext } from "@/brain/content/types";

import { isMetaInstructionalPhrase } from "../topic-meta";
import { classifyOfferNoun, isSemanticallyValidCatalogName } from "./classify-offer";
import {
  clampLabel,
  countLabelMentions,
  evidenceForField,
  pushUnique,
} from "./helpers";
import {
  POSITIVE_INGREDIENT_TOKEN_RE,
  looksLikeIngredientLabel,
} from "./ingredient-patterns";
import type { TopicSubject } from "./types";

export function extractProductSubjects(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];

  context.products.forEach((p, i) => {
    const s = classifyOfferNoun(p, `products[${i}]`, context);
    if (s.kind === "ingredient_or_component") {
      pushUnique(out, s);
    }
  });

  for (const [i, product] of (context.indexedProducts ?? []).entries()) {
    const name = product.name?.trim();
    if (!name || !isSemanticallyValidCatalogName(name)) continue;
    if (looksLikeIngredientLabel(name)) {
      pushUnique(out, {
        label: clampLabel(name, 48),
        kind: "ingredient_or_component",
        sourceField: `indexedProducts[${i}]`,
        evidenceIds: evidenceForField(context, name),
        classificationReason:
          "Typed catalog record with positive ingredient/form evidence",
        classificationConfidence: "high",
      });
      continue;
    }
    pushUnique(out, {
      label: clampLabel(name, 48),
      kind: "catalog_product",
      sourceField: `indexedProducts[${i}]`,
      evidenceIds: evidenceForField(context, name),
      classificationReason:
        "Typed indexedProducts record with semantically valid product name",
      classificationConfidence: "high",
    });
  }

  for (const ev of Object.values(context.evidenceById)) {
    if (ev.field !== "indexedProduct") continue;
    const name = ev.value.trim();
    if (!name || !isSemanticallyValidCatalogName(name)) continue;
    pushUnique(out, {
      label: clampLabel(name, 48),
      kind: looksLikeIngredientLabel(name)
        ? "ingredient_or_component"
        : "catalog_product",
      sourceField: "evidence.indexedProduct",
      evidenceIds: [ev.id],
      classificationReason:
        "Evidence-backed indexedProduct with semantic validation",
      classificationConfidence: "medium",
    });
  }

  for (const o of context.contentOpportunities) {
    if (isMetaInstructionalPhrase(o)) continue;
    const m = o.match(POSITIVE_INGREDIENT_TOKEN_RE);
    const token = m?.[1]?.trim();
    if (!token || !looksLikeIngredientLabel(token)) continue;
    const mentions = countLabelMentions(context, token);
    const inProducts = context.products.some((p) =>
      p.toLowerCase().includes(token.toLowerCase())
    );
    const inCatalog = (context.indexedProducts ?? []).some((p) =>
      p.name.toLowerCase().includes(token.toLowerCase())
    );
    if (!inProducts && !inCatalog && mentions < 2) continue;
    pushUnique(out, {
      label: clampLabel(token, 40),
      kind: "ingredient_or_component",
      sourceField: "contentOpportunities",
      evidenceIds: evidenceForField(context, token),
      classificationReason:
        inProducts || inCatalog
          ? "Positive ingredient token corroborated by products/catalog field"
          : "Positive ingredient token corroborated across multiple context records",
      classificationConfidence: inProducts || inCatalog ? "high" : "medium",
    });
  }
  return out;
}
