/**
 * Handler analyzer for auto-documentation.
 * Detects HTTP methods and extracts basic info from handler source via handler.toString().
 * Used when endpoint metadata does not declare `methods`; otherwise explicit metadata wins.
 */

const ALL_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
];

/**
 * Detects which HTTP methods the handler checks (e.g. ammo.GET, ammo.POST).
 * Matches property access patterns like `.GET`, `ammo.GET`, avoiding false positives
 * in strings or unrelated identifiers.
 *
 * When no method checks are found, the endpoint is treated as method-agnostic
 * and accepts ALL methods (te.js default behavior).
 *
 * @param {Function} handler - The endpoint handler function
 * @returns {string[]} Detected method names, or ALL_METHODS if none detected
 */
function detectMethods(handler) {
  if (typeof handler !== 'function') return [...ALL_METHODS];

  const src = handler.toString();
  const detected = [];

  for (const m of ALL_METHODS) {
    // Match property access patterns like .GET, ammo.GET, avoiding
    // false positives in strings or unrelated identifiers
    const pattern = new RegExp(`\\.${m}\\b`);
    if (pattern.test(src)) detected.push(m);
  }

  return detected.length > 0 ? detected : [...ALL_METHODS];
}

/**
 * Analyzes a handler and returns basic info for documentation (e.g. OpenAPI).
 * Explicit metadata from register() should override these results when present.
 *
 * @param {Function} handler - The endpoint handler function
 * @returns {{ methods: string[] }} Analyzed info (methods; more fields can be added later)
 */
function analyzeHandler(handler) {
  return {
    methods: detectMethods(handler),
  };
}

export { ALL_METHODS, detectMethods, analyzeHandler };
export default analyzeHandler;
