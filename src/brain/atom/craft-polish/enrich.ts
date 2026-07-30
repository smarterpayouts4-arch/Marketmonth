import { assignPromptVariant } from "@/brain/policy/prompt-experiments";

import type { AtomBuildEnvelope } from "../build-envelope";
import type { ContentAtom } from "../content-atom.schema";
import { applyAtomCraftPolish } from "./apply";
import { polishAtomCraftOpenAi } from "./openai-adapter";
import { validateAtomCraftPolish } from "./validate";

export type CraftPolishMeta = {
  attempted: boolean;
  applied: boolean;
  reasons?: string[];
};

function craftPolishEnabled(companyId: string): boolean {
  const provider = process.env.ATOM_CRAFT_POLISH_PROVIDER?.trim().toLowerCase();
  if (
    provider === "off" ||
    provider === "none" ||
    provider === "deterministic-only"
  ) {
    return false;
  }
  if (provider === "openai" || provider === "auto") {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }
  // Default: experiment variant B (PROMPT_EXPERIMENT_ATOM_CORE_LLM=b|split)
  const assignment = assignPromptVariant("atom.core-llm", companyId);
  return (
    assignment.variant === "b" && Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}

/**
 * Optional fact-locked craft polish. Fail-closed → returns pass-1 atom.
 */
export async function applyAtomCraftEnrichment(args: {
  atom: ContentAtom;
  envelope: AtomBuildEnvelope;
  apiKey?: string;
}): Promise<{ atom: ContentAtom; meta: CraftPolishMeta }> {
  const companyId = args.envelope.identity.company_id;
  if (!craftPolishEnabled(companyId)) {
    return { atom: args.atom, meta: { attempted: false, applied: false } };
  }

  const result = await polishAtomCraftOpenAi({
    atom: args.atom,
    envelope: args.envelope,
    apiKey: args.apiKey,
    companyId,
  });

  if (!result) {
    return {
      atom: args.atom,
      meta: {
        attempted: true,
        applied: false,
        reasons: ["polish_provider_failed"],
      },
    };
  }

  const validated = validateAtomCraftPolish({
    atom: args.atom,
    envelope: args.envelope,
    result,
  });

  if (!validated.ok) {
    return {
      atom: args.atom,
      meta: {
        attempted: true,
        applied: false,
        reasons: validated.reasons,
      },
    };
  }

  // Structural lock: claim / proof IDs must remain identical after merge
  const polished = applyAtomCraftPolish(args.atom, result);
  const beforeIds = collectIds(args.atom);
  const afterIds = collectIds(polished);
  if (beforeIds !== afterIds) {
    return {
      atom: args.atom,
      meta: {
        attempted: true,
        applied: false,
        reasons: ["id_integrity_failed"],
      },
    };
  }

  return {
    atom: polished,
    meta: { attempted: true, applied: true },
  };
}

function collectIds(atom: ContentAtom): string {
  const proofs = atom.kernel.supporting_proof
    .map((p) => `${p.proof_id}:${p.evidence_id}`)
    .join("|");
  const claims = atom.claimLedger.claims
    .map((c) => `${c.claimId}:${c.claimRuleId ?? ""}:${c.evidenceIds.join(",")}`)
    .join("|");
  return `${atom.kernel.central_claim.claim_id}|${proofs}|${claims}`;
}
