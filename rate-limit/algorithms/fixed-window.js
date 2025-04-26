import RateLimiter from '../base.js';

/**
 * Fixed Window Rate Limiter Implementation
 * 
 * @extends RateLimiter
 * @description
 * The fixed window algorithm uses discrete time windows to track and limit requests.
 * It's the simplest rate limiting approach, but can allow request spikes at window boundaries
 * when using rolling windows. This can be mitigated by using strict window alignment with
 * clock time.
 * 
 * Key features:
 * - Simple to understand and implement
 * - Low memory usage (only stores counter and window start time)
 * - Optional strict window alignment with clock time
 * - Best for cases where precise spacing of requests is not critical
 * 
 * Window types:
 * 1. Rolling windows: Start when first request arrives
 * 2. Strict windows: Align with clock time (e.g. every minute)
 * 
 * @example
 * // Create a fixed window rate limiter with strict clock alignment
 * const limiter = new FixedWindowRateLimiter({
 *   maxRequests: 60,       // Allow 60 requests per minute
 *   timeWindowSeconds: 60,
 *   fixedWindow: {
 *     strictWindow: true   // Align windows with clock minutes
 *   }
 * });
 * 
 * // Use in an API endpoint
 * async function handleRequest(ip) {
 *   const result = await limiter.consume(ip);
 *   if (!result.success) {
 *     throw new Error('Rate limit exceeded');
 *   }
 *   // Process request...
 * }
 */
class FixedWindowRateLimiter extends RateLimiter {
  /**
   * Create a new fixed window rate limiter
   * 
   * @param {Object} options - Configuration options
   * @param {Object} [options.fixedWindow] - Fixed window specific options
   * @param {boolean} [options.fixedWindow.strictWindow] - Whether to align windows with clock time
   * @throws {Error} If required fixedWindow options are missing
   */
  constructor(options) {
    if (!options.fixedWindowConfig) {
      options.fixedWindowConfig = {};  // Ensure defaults are set in base class
    }
    super(options);
    
    if (!this.fixedWindowOptions) {
      throw new Error('FixedWindowRateLimiter requires fixedWindowConfig options');
    }
  }

  /**
   * Check if a request should be allowed within the current window
   * 
   * @param {string} identifier - Unique identifier for rate limiting (e.g., IP address, user ID)
   * @returns {Promise<Object>} Rate limit check result
   * @returns {boolean} result.success - Whether the request is allowed
   * @returns {number} result.remainingRequests - Number of requests remaining in the window
   * @returns {number} result.resetTime - Unix timestamp when the current window ends
   */
  async consume(identifier) {
    const key = this.getKey(identifier);
    const now = Date.now();
    const options = this.getAlgorithmOptions('fixed-window');
    
    // If using strict windows, align window start with clock
    const windowStart = options.strictWindow
      ? Math.floor(now / (this.options.timeWindowSeconds * 1000)) * (this.options.timeWindowSeconds * 1000)
      : now;
    
    const stored = await this.storage.get(key);
    if (!stored) {
      await this.storage.set(key, {
        counter: 1,
        startTime: windowStart
      }, this.options.timeWindowSeconds);
      
      return {
        success: true,
        remainingRequests: this.options.maxRequests - 1,
        resetTime: Math.floor(windowStart/1000 + this.options.timeWindowSeconds)
      };
    }

    // If using strict windows, check if we need to start a new window
    if (options.strictWindow && stored.startTime < windowStart) {
      await this.storage.set(key, {
        counter: 1,
        startTime: windowStart
      }, this.options.timeWindowSeconds);
      
      return {
        success: true,
        remainingRequests: this.options.maxRequests - 1,
        resetTime: Math.floor(windowStart/1000 + this.options.timeWindowSeconds)
      };
    }

    if (stored.counter >= this.options.maxRequests) {
      return {
        success: false,
        remainingRequests: 0,
        resetTime: Math.floor(stored.startTime/1000 + this.options.timeWindowSeconds)
      };
    }

    stored.counter++;
    await this.storage.set(key, stored, this.options.timeWindowSeconds);
    
    return {
      success: true,
      remainingRequests: this.options.maxRequests - stored.counter,
      resetTime: Math.floor(stored.startTime/1000 + this.options.timeWindowSeconds)
    };
  }
}

export default FixedWindowRateLimiter;