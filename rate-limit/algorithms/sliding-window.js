import RateLimiter from '../base.js';

/**
 * Sliding Window Rate Limiter Implementation
 *
 * @extends RateLimiter
 * @description
 * The sliding window algorithm provides precise rate limiting by considering both the current
 * and previous time windows with configurable weights. This prevents traffic spikes that can
 * occur at window boundaries with fixed window rate limiting.
 *
 * Key features:
 * - Smoother rate limiting than fixed windows
 * - Prevents boundary spike issues
 * - Configurable time granularity
 * - Weighted window transitions
 *
 * For example, with 60-second windows and 30 seconds into the current window:
 * - Current window gets full weight (e.g. 1.0)
 * - Previous window gets partial weight (e.g. 0.5)
 * Total requests = (current_requests * 1.0) + (previous_requests * 0.5)
 *
 * @example
 * // Create a sliding window rate limiter with weighted windows
 * const limiter = new SlidingWindowRateLimiter({
 *   maxRequests: 100,      // Allow 100 requests per minute
 *   timeWindowSeconds: 60,
 *   slidingWindow: {
 *     granularity: 1,      // 1-second precision
 *     weights: {
 *       current: 1,        // Full weight for current window
 *       previous: 0.5      // Half weight for previous window
 *     }
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
class SlidingWindowRateLimiter extends RateLimiter {
  /**
   * Create a new sliding window rate limiter
   *
   * @param {Object} options - Configuration options
   * @param {Object} [options.slidingWindow] - Sliding window specific options
   * @param {number} [options.slidingWindow.granularity] - Time precision in seconds
   * @param {Object} [options.slidingWindow.weights] - Window weights
   * @param {number} [options.slidingWindow.weights.current] - Weight for current window (0-1)
   * @param {number} [options.slidingWindow.weights.previous] - Weight for previous window (0-1)
   * @throws {Error} If required slidingWindow options are missing
   */
  constructor(options) {
    if (!options.slidingWindowConfig) {
      options.slidingWindowConfig = {}; // Ensure defaults are set in base class
    }
    super(options);

    if (!this.slidingWindowOptions) {
      throw new Error(
        'SlidingWindowRateLimiter requires slidingWindowConfig options',
      );
    }
  }

  /**
   * Check if a request should be allowed based on weighted window counts
   *
   * @param {string} identifier - Unique identifier for rate limiting (e.g., IP address, user ID)
   * @returns {Promise<Object>} Rate limit check result
   * @returns {boolean} result.success - Whether the request is allowed
   * @returns {number} result.remainingRequests - Number of requests remaining in the current window
   * @returns {number} result.resetTime - Unix timestamp when the current window ends
   */
  async consume(identifier) {
    const key = this.getKey(identifier);
    const now = Date.now();
    const options = this.getAlgorithmOptions('sliding-window');

    const stored = await this.storage.get(key);
    if (!stored) {
      await this.storage.set(
        key,
        {
          counter: 1,
          timestamps: [now],
          windowStart:
            Math.floor(now / (options.granularity * 1000)) *
            (options.granularity * 1000),
        },
        this.options.timeWindowSeconds,
      );

      return {
        success: true,
        remainingRequests: this.options.maxRequests - 1,
        resetTime: Math.floor(now / 1000) + this.options.timeWindowSeconds,
      };
    }

    // Calculate window boundaries
    const currentWindowStart =
      Math.floor(now / (options.granularity * 1000)) *
      (options.granularity * 1000);
    const previousWindowStart =
      currentWindowStart - this.options.timeWindowSeconds * 1000;

    // Split timestamps into current and previous windows
    const currentWindowRequests = stored.timestamps.filter(
      (ts) => ts >= currentWindowStart,
    ).length;
    const previousWindowRequests = stored.timestamps.filter(
      (ts) => ts >= previousWindowStart && ts < currentWindowStart,
    ).length;

    // Calculate weighted request count
    const weightedCount =
      currentWindowRequests * options.weights.current +
      previousWindowRequests * options.weights.previous;

    if (weightedCount >= this.options.maxRequests) {
      return {
        success: false,
        remainingRequests: 0,
        resetTime: Math.floor(
          currentWindowStart / 1000 + this.options.timeWindowSeconds,
        ),
      };
    }

    // Remove timestamps outside both windows and add new timestamp
    stored.timestamps = stored.timestamps.filter(
      (ts) => ts >= previousWindowStart,
    );
    stored.timestamps.push(now);
    stored.windowStart = currentWindowStart;
    await this.storage.set(key, stored, this.options.timeWindowSeconds);

    return {
      success: true,
      remainingRequests: Math.floor(
        this.options.maxRequests - weightedCount - 1,
      ),
      resetTime: Math.floor(
        currentWindowStart / 1000 + this.options.timeWindowSeconds,
      ),
    };
  }
}

export default SlidingWindowRateLimiter;
