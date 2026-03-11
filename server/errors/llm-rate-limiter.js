/**
 * In-memory sliding window rate limiter for LLM error inference calls.
 * Tracks LLM call timestamps in the last 60 seconds.
 * Shared singleton across the process; configured from errors.llm.rateLimit.
 */

class LLMRateLimiter {
  /**
   * @param {number} maxPerMinute - Maximum LLM calls allowed per 60-second window.
   */
  constructor(maxPerMinute) {
    this.maxPerMinute = maxPerMinute > 0 ? Math.floor(maxPerMinute) : 10;
    /** @type {number[]} timestamps of recent LLM calls (ms since epoch) */
    this._timestamps = [];
  }

  /**
   * Prune timestamps older than 60 seconds from now.
   */
  _prune() {
    const cutoff = Date.now() - 60_000;
    let i = 0;
    while (i < this._timestamps.length && this._timestamps[i] <= cutoff) {
      i++;
    }
    if (i > 0) this._timestamps.splice(0, i);
  }

  /**
   * Returns true if an LLM call is allowed under the current rate.
   * @returns {boolean}
   */
  canCall() {
    this._prune();
    return this._timestamps.length < this.maxPerMinute;
  }

  /**
   * Record that an LLM call was made right now.
   */
  record() {
    this._prune();
    this._timestamps.push(Date.now());
  }

  /**
   * Returns how many calls remain in the current window.
   * @returns {number}
   */
  remaining() {
    this._prune();
    return Math.max(0, this.maxPerMinute - this._timestamps.length);
  }
}

/** @type {LLMRateLimiter|null} */
let _instance = null;

/**
 * Get (or create) the singleton rate limiter.
 * Re-initializes if maxPerMinute changes.
 * @param {number} maxPerMinute
 * @returns {LLMRateLimiter}
 */
export function getRateLimiter(maxPerMinute) {
  if (!_instance || _instance.maxPerMinute !== maxPerMinute) {
    _instance = new LLMRateLimiter(maxPerMinute);
  }
  return _instance;
}

export { LLMRateLimiter };
