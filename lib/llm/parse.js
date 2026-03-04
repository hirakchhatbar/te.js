/**
 * Parse JSON from LLM response text (handles markdown code blocks).
 * Shared by auto-docs, error-inference, and other LLM features.
 */

/**
 * Extract the first JSON object from a string.
 * @param {string} str - Raw LLM response
 * @returns {object|null}
 */
export function extractJSON(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const open = trimmed.indexOf('{');
  if (open === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < trimmed.length; i++) {
    if (trimmed[i] === '{') depth++;
    else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(trimmed.slice(open, end));
  } catch {
    return null;
  }
}

/**
 * Extract the first JSON array from a string.
 * @param {string} str - Raw LLM response
 * @returns {Array|null}
 */
export function extractJSONArray(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const open = trimmed.indexOf('[');
  if (open === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < trimmed.length; i++) {
    if (trimmed[i] === '[') depth++;
    else if (trimmed[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(trimmed.slice(open, end));
  } catch {
    return null;
  }
}

/**
 * Reconcile LLM-ordered tag names with actual tag objects. Returns tags in desired order;
 * any tag not in orderedTagNames is appended at the end.
 * @param {string[]} orderedTagNames - Tag names in desired order (from LLM)
 * @param {Array<{ name: string, description?: string }>} tags - Current spec.tags
 * @returns {Array<{ name: string, description?: string }>} Tags reordered
 */
export function reconcileOrderedTags(orderedTagNames, tags) {
  if (!Array.isArray(tags) || !tags.length) return [];
  if (!Array.isArray(orderedTagNames) || !orderedTagNames.length) return [...tags];
  const byName = new Map(tags.map((t) => [t.name, t]));
  const ordered = [];
  for (const name of orderedTagNames) {
    const tag = byName.get(name);
    if (tag) {
      ordered.push(tag);
      byName.delete(name);
    }
  }
  for (const [, tag] of byName) {
    ordered.push(tag);
  }
  return ordered;
}
