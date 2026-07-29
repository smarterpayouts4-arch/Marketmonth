import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { brands } from "@/db/schema";
import { isDevelopmentAuthBypassEnabled } from "@/lib/auth/auth-mode";

export type CompanyAccessResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Normalize a brand website / companyId for tenant matching:
 * "https://www.Zynava.com/shop" and "zynava.com" compare equal.
 */
export function normalizeCompanyDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]!
    .replace(/\/$/, "");
}

/**
 * Tenant authorization (P2.1): the signed-in user must own a brand whose
 * website (or dev key) matches the requested companyId.
 *
 * Honors the explicit dev auth bypass (same policy as requireApiSession) so
 * local workflows keep working. In production a session without a bound
 * user id, or a companyId outside the user's brands, is a 403.
 */
export async function requireCompanyAccess(
  userId: string | null,
  companyId: string
): Promise<CompanyAccessResult> {
  if (isDevelopmentAuthBypassEnabled()) {
    return { ok: true };
  }
  const target = normalizeCompanyDomain(companyId);
  if (!target) {
    return { ok: false, status: 400, error: "companyId is required" };
  }
  if (!userId) {
    return {
      ok: false,
      status: 403,
      error: "Session has no bound user; cannot verify company access",
    };
  }

  const rows = await getDb()
    .select({ website: brands.website, devKey: brands.devKey })
    .from(brands)
    .where(eq(brands.userId, userId));

  const owned = rows.some(
    (row) =>
      normalizeCompanyDomain(row.website) === target ||
      (row.devKey && normalizeCompanyDomain(row.devKey) === target)
  );
  if (!owned) {
    return {
      ok: false,
      status: 403,
      error: "You do not have access to this company",
    };
  }
  return { ok: true };
}
