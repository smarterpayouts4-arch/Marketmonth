/**
 * Server-only development auth bypass.
 *
 * Google OAuth redirect URIs must be configured in Google Cloud Console before
 * production deploy. This flag never enables in production — do not "fix"
 * redirect_uri_mismatch by setting DEV_AUTH_BYPASS in prod.
 *
 * Local default: bypass is ON in non-production unless explicitly disabled
 * (`DEV_AUTH_BYPASS=false`). Also honors legacy `AUTH_BYPASS=true`.
 */
export function isDevelopmentAuthBypassEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.NODE_ENV === "production") return false;

  // Explicit opt-out for testing real Google OAuth locally
  if (env.DEV_AUTH_BYPASS === "false") return false;

  // Explicit opt-in (preferred) or legacy Clerk-era AUTH_BYPASS
  if (env.DEV_AUTH_BYPASS === "true") return true;
  if (env.AUTH_BYPASS === "true") return true;

  // Non-production default: skip Google so Create Plan → dashboard works
  return true;
}
