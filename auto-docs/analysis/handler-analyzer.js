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
 * Extracts allowed methods from .only('GET'), .only("POST", "PUT"), etc. in source.
 * Returns a non-empty array only when at least one valid quoted method is found;
 * otherwise [] so caller can fall back to other detection.
 *
 * @param {string} src - Handler source (e.g. handler.toString())
 * @returns {string[]} Normalized method names (uppercase, HEAD added when GET present), or []
 */
function detectOnlyMethods(src) {
  const startMarker = '.only(';
  const start = src.indexOf(startMarker);
  if (start === -1) return [];

  let depth = 1;
  let pos = start + startMarker.length;
  while (pos < src.length && depth > 0) {
    const ch = src[pos];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    pos += 1;
  }
  const argsStr = src.slice(start + startMarker.length, pos - 1);

  // Match quoted method names: 'GET', "POST", etc. Only accept known methods.
  const quotedMethodRe = /['"](GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)['"]/gi;
  const seen = new Set();
  let match;
  while ((match = quotedMethodRe.exec(argsStr)) !== null) {
    seen.add(match[1].toUpperCase());
  }
  if (seen.size === 0) return [];

  const list = [...seen];
  if (list.includes('GET') && !list.includes('HEAD')) {
    list.push('HEAD');
  }
  return list;
}

/**
 * Detects which HTTP methods the handler checks (e.g. ammo.GET, ammo.POST)
 * or restricts via ammo.only('GET'), ammo.only('GET','POST').
 * Prefers .only(...) when present with valid string args; otherwise matches
 * property access like `.GET`, `ammo.GET`.
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
  const onlyMethods = detectOnlyMethods(src);
  if (onlyMethods.length > 0) return onlyMethods;

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
