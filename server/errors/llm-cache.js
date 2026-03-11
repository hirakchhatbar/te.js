/**
 * In-memory TTL cache for LLM error inference results.
 * Key: file:line:errorMessage -- deduplicates repeated errors at the same throw site.
 * Shared singleton across the process; configured from errors.llm.cacheTTL.
 */

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // prune expired entries every 5 minutes

class LLMErrorCache {
  /**
   * @param {number} ttl - Time-to-live in milliseconds for each cached result.
   */
  constructor(ttl) {
    this.ttl = ttl > 0 ? ttl : 3_600_000;
    /** @type {Map<string, { statusCode: number, message: string, devInsight?: string, cachedAt: number }>} */
    this._store = new Map();
    this._sweepTimer =
      setInterval(() => this._sweep(), SWEEP_INTERVAL_MS).unref?.() ?? null;
  }

  /**
   * Build a cache key from code context and error.
   * Uses the first (throw-site) snippet's file and line + error text.
   * @param {{ snippets?: Array<{ file: string, line: number }> }} codeContext
   * @param {Error|string|undefined} error
   * @returns {string}
   */
  buildKey(codeContext, error) {
    const snippet = codeContext?.snippets?.[0];
    const location = snippet ? `${snippet.file}:${snippet.line}` : 'unknown';
    let errText = '';
    if (error instanceof Error) {
      errText = error.message ?? '';
    } else if (error != null) {
      errText = String(error);
    }
    return `${location}:${errText}`;
  }

  /**
   * Get a cached result. Returns null if missing or expired (and prunes the entry).
   * @param {string} key
   * @returns {{ statusCode: number, message: string, devInsight?: string } | null}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > this.ttl) {
      this._store.delete(key);
      return null;
    }
    const { cachedAt: _removed, ...result } = entry;
    return result;
  }

  /**
   * Store a result in the cache.
   * @param {string} key
   * @param {{ statusCode: number, message: string, devInsight?: string }} result
   */
  set(key, result) {
    this._store.set(key, { ...result, cachedAt: Date.now() });
  }

  /**
   * Remove all expired entries (called periodically by the sweep timer).
   */
  _sweep() {
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now - entry.cachedAt > this.ttl) {
        this._store.delete(key);
      }
    }
  }

  /**
   * Number of entries currently in the cache (including potentially stale ones not yet swept).
   * @returns {number}
   */
  get size() {
    return this._store.size;
  }
}

/** @type {LLMErrorCache|null} */
let _instance = null;

/**
 * Get (or create) the singleton cache.
 * Re-initializes if ttl changes.
 * @param {number} ttl
 * @returns {LLMErrorCache}
 */
export function getCache(ttl) {
  if (!_instance || _instance.ttl !== ttl) {
    _instance = new LLMErrorCache(ttl);
  }
  return _instance;
}

export { LLMErrorCache };
