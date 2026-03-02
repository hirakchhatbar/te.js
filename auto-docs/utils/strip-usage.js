/**
 * Strip LLM-only fields from response so they are not merged into metadata.
 * @param {object|null} obj - Raw LLM response (may contain _usage, _fallback)
 * @returns {object|null} Same object without _usage and _fallback
 */
export function stripLlmUsage(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const { _usage, _fallback, ...rest } = obj;
  return rest;
}
