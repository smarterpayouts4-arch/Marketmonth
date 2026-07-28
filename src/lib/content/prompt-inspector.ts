/**
 * Server-controlled Prompt Inspector gate for Content Production Studio.
 * Never use NEXT_PUBLIC_* — this must not be trusted from the client alone.
 *
 * Development: on by default so the validation layout (preview + prompt) is visible.
 * Set CONTENT_PROMPT_INSPECTOR=false to hide locally.
 * Production: off unless CONTENT_PROMPT_INSPECTOR=true.
 */

export function isContentPromptInspectorEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.NODE_ENV === "production") {
    return env.CONTENT_PROMPT_INSPECTOR === "true";
  }
  return env.CONTENT_PROMPT_INSPECTOR !== "false";
}
