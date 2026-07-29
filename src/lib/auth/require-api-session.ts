import { auth } from "@/auth";
import { isDevelopmentAuthBypassEnabled } from "@/lib/auth/auth-mode";

export type ApiSessionResult =
  | { ok: true; userId: string | null }
  | { ok: false; status: number; error: string };

/**
 * Shared API session gate (lifted from the project-knowledge ask route).
 *
 * Non-production honors the explicit dev auth bypass so local workflows and
 * tests keep working. In production a signed-in Auth.js session is required.
 */
export async function requireApiSession(): Promise<ApiSessionResult> {
  if (isDevelopmentAuthBypassEnabled()) {
    return { ok: true, userId: null };
  }
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Authentication required" };
  }
  return { ok: true, userId: session.user.id ?? null };
}
