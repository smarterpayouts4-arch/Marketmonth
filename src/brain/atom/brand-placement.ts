import type { AtomBuildEnvelope } from "./build-envelope";
import type { ContentAtom } from "./content-atom.schema";

const EDUCATIONAL = new Set(["product_education", "customer_questions"]);

/**
 * Warn when brand appears in hook/tension fields for educational categories.
 */
export function brandInHookFields(args: {
  atom: ContentAtom;
  envelope: AtomBuildEnvelope;
}): { hit: boolean; paths: string[] } {
  const category = args.envelope.topic.topicCategory;
  if (!category || !EDUCATIONAL.has(category)) {
    return { hit: false, paths: [] };
  }
  const brand = args.envelope.brand.name?.trim();
  if (!brand || brand.length < 2) return { hit: false, paths: [] };

  const re = new RegExp(
    `\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i"
  );
  const k = args.atom.kernel;
  const checks: Array<[string, string]> = [
    ["kernel.hook_strategy.planted_question", k.hook_strategy.planted_question],
    ["kernel.hook_strategy.opening_intent", k.hook_strategy.opening_intent],
    ["kernel.audience_problem", k.audience_problem],
  ];
  const paths = checks
    .filter(([, text]) => re.test(text))
    .map(([path]) => path);
  return { hit: paths.length > 0, paths };
}
