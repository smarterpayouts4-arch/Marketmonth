import { NextResponse } from "next/server";

import { isDevelopmentAuthBypassEnabled } from "@/lib/auth/auth-mode";
import { setActiveBrandCookie } from "@/lib/dev/active-brand-cookie";
import { bootstrapDevWorkspace } from "@/lib/dev/bootstrap-dev-workspace";
import { parseCreatePlanBody } from "@/lib/dev/create-plan-request";

/**
 * Server-owned Create Plan entry point.
 * - Bypass on → bootstrap Zynava workspace, set signed cookie, redirect /dashboard
 * - Bypass off → requiresAuthentication (client may call Google signIn)
 *
 * Production Google OAuth redirect URIs must be configured in Google Cloud Console.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = parseCreatePlanBody(raw);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error,
        ...(parsed.details !== undefined ? { details: parsed.details } : {}),
      },
      { status: 400 }
    );
  }

  if (!isDevelopmentAuthBypassEnabled()) {
    return NextResponse.json({
      ok: false,
      requiresAuthentication: true,
      callbackUrl: "/dashboard",
    });
  }

  try {
    const handoff = await bootstrapDevWorkspace(parsed.data);
    await setActiveBrandCookie({
      brandId: handoff.brandId,
      companyName: handoff.companyName,
      website: handoff.website,
      userName: handoff.userName,
      hasProfile: handoff.hasProfile,
      hasStrategy: handoff.hasStrategy,
    });

    return NextResponse.json({
      ok: true,
      redirectTo: "/dashboard",
      handoff: {
        brandId: handoff.brandId,
        companyName: handoff.companyName,
        website: handoff.website,
        userName: handoff.userName,
        hasProfile: handoff.hasProfile,
        hasStrategy: handoff.hasStrategy,
        suggestedPhase: handoff.suggestedPhase,
        dashboardBrand: handoff.dashboardBrand,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to open workspace.";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
