/**
 * Shared substantial-prompt heuristic for APS beforeSubmit + fixture tests.
 * Keep keyword list aligned with adapters/cursor/README.md.
 * Avoid bare write/create (too noisy). Fixtures document false negatives.
 */

export const SUBSTANTIAL_RE =
  /\b(implement|refactor|fix|bug|seo|deploy|security|performance|multi-?file|architect|migrate|audit|harden|build|feature|investigate|investigation|diagnose|diagnosis|plan|planning|document|documentation|docs|knowledge|markdown|research)\b/i

export const MIN_SUBSTANTIAL_LENGTH = 40

/**
 * @param {unknown} prompt
 * @returns {boolean}
 */
export function isSubstantialPrompt(prompt) {
  const p = String(prompt || '')
  return SUBSTANTIAL_RE.test(p) && p.length > MIN_SUBSTANTIAL_LENGTH
}

/**
 * Visible APS brief shape (user-facing contract). Hooks cannot force this;
 * fixtures and docs treat it as the only reliable visibility mechanism.
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeApsBrief(text) {
  return /^\s*Selected workflows:\s*\S+/im.test(String(text || ''))
}
