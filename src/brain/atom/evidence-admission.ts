/**
 * Relevance-based evidence admission for Content Atom builds.
 * Prefer → topic-relevant → direction-role → company context.
 * Quality floor rejects URLs, addresses, and thin fragments.
 * Never shrinks below prefer ∩ library. Ceiling 6–8 (not a validity floor).
 */

export const EVIDENCE_ADMISSION_POLICY_VERSION = "admission-v1" as const;

/** Soft target / ceiling — never a validity requirement. */
export const ADMISSION_CEILING = 8;
export const ADMISSION_SOFT_TARGET = 6;
export const MIN_PROOF_SUMMARY_CHARS = 24;

export type EvidenceRole =
  | "preferred"
  | "topic"
  | "problem"
  | "explanation"
  | "resolution"
  | "trust"
  | "offer"
  | "context";

export type AdmissionCandidate = {
  proof_id: string;
  type: string;
  summary: string;
};

export type AdmissionDecision = {
  proof_id: string;
  role: EvidenceRole;
  reason: string;
};

export type AdmissionResult = {
  policyVersion: typeof EVIDENCE_ADMISSION_POLICY_VERSION;
  admitted: AdmissionDecision[];
  rejected: Array<{ proof_id: string; reason: string }>;
  usableEvidenceIds: string[];
};

const URL_ONLY_RE = /^(https?:\/\/|www\.)\S+$/i;
const ADDRESS_RE =
  /^\d{1,6}\s+\w+.*(st|street|ave|avenue|rd|road|dr|drive|blvd|ln|lane|way)\b/i;
const CONTACT_RE =
  /^(tel:|mailto:|\+?\d[\d\s().-]{7,}$|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$)/i;

export function passesQualityFloor(summary: string): {
  ok: boolean;
  reason?: string;
} {
  const t = summary.trim();
  if (!t) return { ok: false, reason: "empty_summary" };
  if (t.length < MIN_PROOF_SUMMARY_CHARS) {
    return { ok: false, reason: `too_short_${t.length}` };
  }
  if (URL_ONLY_RE.test(t)) return { ok: false, reason: "bare_url" };
  if (ADDRESS_RE.test(t)) return { ok: false, reason: "address_fragment" };
  if (CONTACT_RE.test(t)) return { ok: false, reason: "contact_fragment" };
  // Single-token catalog labels (e.g. "Calcium", "Zinc")
  if (!/\s/.test(t) && t.length < 40) {
    return { ok: false, reason: "single_token_label" };
  }
  return { ok: true };
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n += 1;
  return n;
}

function inferRole(type: string, summary: string): EvidenceRole {
  const t = `${type} ${summary}`.toLowerCase();
  if (/\bfaq\b|banned|guarantee|medical|disclaimer|trust|transparent/.test(t)) {
    return "trust";
  }
  if (/problem|pain|fear|stuck|unclear|billing|upsell/.test(t)) {
    return "problem";
  }
  if (/how|step|process|mechanism|works|advisor|questionnaire/.test(t)) {
    return "explanation";
  }
  if (/resolv|solution|flat-rate|same-day|offer|product|service|install/.test(t)) {
    return "resolution";
  }
  if (/position|value|cta|action|buy|sign/.test(t)) return "offer";
  return "context";
}

/**
 * Admit proofs for a direction. `preferIds` that pass the quality floor
 * are always kept (never fewer than prefer ∩ quality library).
 */
export function admitEvidence(input: {
  library: AdmissionCandidate[];
  preferIds: string[];
  topicText?: string;
  directionText?: string;
  angle?: string;
  ceiling?: number;
  softTarget?: number;
}): AdmissionResult {
  const ceiling = input.ceiling ?? ADMISSION_CEILING;
  const softTarget = Math.min(
    input.softTarget ?? ADMISSION_SOFT_TARGET,
    ceiling
  );
  const byId = new Map(input.library.map((p) => [p.proof_id, p] as const));
  const rejected: Array<{ proof_id: string; reason: string }> = [];
  const admitted: AdmissionDecision[] = [];
  const admittedIds = new Set<string>();

  const topicTokens = tokenize(
    [input.topicText, input.directionText].filter(Boolean).join(" ")
  );
  const angle = (input.angle ?? "").toLowerCase();

  const tryAdmit = (
    id: string,
    role: EvidenceRole,
    reason: string,
    forcePrefer: boolean
  ): boolean => {
    if (admittedIds.has(id)) return false;
    const proof = byId.get(id);
    if (!proof) {
      rejected.push({ proof_id: id, reason: "not_in_library" });
      return false;
    }
    const q = passesQualityFloor(proof.summary);
    if (!q.ok) {
      // Prefer ∩ library quality failures are recorded but do not count as admitted.
      // Non-prefer rejects are always recorded.
      rejected.push({
        proof_id: id,
        reason: q.reason ?? "quality_floor",
      });
      // Forced prefer that fails quality: still admit if it's the only path to
      // avoid re-starving when prefer ids are short FAQ titles — only force
      // when summary has some substance (>= 12 chars) and isn't a bare URL.
      if (forcePrefer) {
        const t = proof.summary.trim();
        if (t.length >= 12 && !URL_ONLY_RE.test(t) && !ADDRESS_RE.test(t)) {
          admitted.push({
            proof_id: id,
            role: "preferred",
            reason: `preferred_soft_quality:${q.reason}`,
          });
          admittedIds.add(id);
          return true;
        }
      }
      return false;
    }
    if (!forcePrefer && admitted.length >= ceiling) return false;
    admitted.push({ proof_id: id, role, reason });
    admittedIds.add(id);
    return true;
  };

  // 1. Preferred (always first; never drop below this set when quality allows)
  for (const id of input.preferIds) {
    if (byId.has(id)) {
      tryAdmit(id, "preferred", "contract_prefer", true);
    }
  }

  const rest = input.library.filter((p) => !admittedIds.has(p.proof_id));

  // Score remaining
  type Scored = {
    proof: AdmissionCandidate;
    role: EvidenceRole;
    score: number;
  };
  const scored: Scored[] = rest.map((proof) => {
    const role = inferRole(proof.type, proof.summary);
    const tokens = tokenize(`${proof.type} ${proof.summary}`);
    let score = overlapScore(tokens, topicTokens);
    // Angle-role boost
    if (angle.includes("faq") && role === "trust") score += 3;
    if (angle.includes("problem") && role === "problem") score += 3;
    if (angle.includes("trust") && role === "trust") score += 3;
    if (angle.includes("beginner") && role === "explanation") score += 2;
    if (angle.includes("comparison") && role === "explanation") score += 2;
    if (role === "problem") score += 1;
    if (role === "trust") score += 1;
    // Prefer FAQ / customerProblems types slightly
    if (/faq/i.test(proof.type)) score += 2;
    if (/customerProblems|positioning/i.test(proof.type)) score += 1;
    return { proof, role, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.proof.proof_id.localeCompare(b.proof.proof_id);
  });

  // 2–4. Fill by relevance until soft target / ceiling; prefer role diversity
  const rolesSeen = new Set(admitted.map((a) => a.role));
  for (const item of scored) {
    if (admitted.length >= softTarget && rolesSeen.size >= 3) break;
    if (admitted.length >= ceiling) break;
    const q = passesQualityFloor(item.proof.summary);
    if (!q.ok) {
      rejected.push({
        proof_id: item.proof.proof_id,
        reason: q.reason ?? "quality_floor",
      });
      continue;
    }
    const roleLabel =
      item.score >= 2
        ? item.role === "context"
          ? "topic"
          : item.role
        : item.role;
    const reason =
      item.score >= 2
        ? `topic_overlap_${item.score}`
        : `role_${item.role}_fill`;
    if (tryAdmit(item.proof.proof_id, roleLabel as EvidenceRole, reason, false)) {
      rolesSeen.add(roleLabel as EvidenceRole);
    }
  }

  // Remaining library items not considered → rejected as not_needed (for audit)
  for (const proof of rest) {
    if (admittedIds.has(proof.proof_id)) continue;
    if (rejected.some((r) => r.proof_id === proof.proof_id)) continue;
    rejected.push({
      proof_id: proof.proof_id,
      reason: "not_needed_ceiling",
    });
  }

  return {
    policyVersion: EVIDENCE_ADMISSION_POLICY_VERSION,
    admitted,
    rejected,
    usableEvidenceIds: admitted.map((a) => a.proof_id),
  };
}
