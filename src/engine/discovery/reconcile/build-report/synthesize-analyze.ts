import type { IndexedProduct } from "../../types";
import type { FrozenPage } from "../frozen-corpus";
import type { CsvKnowledgeSlice } from "../fixture-from-projection";

import type { AnalyzeProfileSnapshot } from "./constants";

/** Fallback Analyze snapshot when no --analyze-json capture exists. */
export function synthesizeAnalyzeProfile(args: {
  fixture: CsvKnowledgeSlice;
  pages: FrozenPage[];
  /** Prefer fullCap (Analyze seeds EXTRA_URLS). withoutExplorer kept for call-site compat. */
  withoutExplorerCap: IndexedProduct[];
  fullCap?: IndexedProduct[];
}): { profile: AnalyzeProfileSnapshot; diagnostic: string } {
  const { fixture, pages, withoutExplorerCap, fullCap } = args;
  const catalog = (fullCap?.length ? fullCap : withoutExplorerCap).map((p) => ({
    name: p.name,
    sourceUrl: p.sourceUrl,
  }));
  return {
    profile: {
      businessName: fixture.businessName,
      website: fixture.website,
      products: [
        "Ingredient/nutrient research guides for browsing and learning (evidence-informed, educational)",
        "Free AI Supplement Advisor for non-medical, educational guidance",
      ],
      services: [
        "Preference-matched supplement search and comparison across multiple participating retailers",
        "Price comparison showing the lowest observed price and price per serving when verified",
        "Personalized supplement plan builder based on lifestyle, diet, and budget",
        "AI advisor chat/questions for supplement education and how to compare products clearly",
        "Supplement catalog for vitamins and minerals (e.g., Magnesium, Vitamin D, Zinc)",
      ],
      indexedProducts: catalog,
      audience:
        "People who feel confused by the supplement market and want a clearer way to compare supplement options",
      description: fixture.description,
      pageCount: pages.length || undefined,
    },
    diagnostic:
      "Analyze profile synthesized from frozen corpus INCLUDING EXTRA_URLS parity (ingredient-explorer + how-it-works). Prefer --analyze-json for an exact UI capture.",
  };
}
