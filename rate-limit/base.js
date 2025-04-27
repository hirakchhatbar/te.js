import TejError from '../server/error.js';
import MemoryStorage from './storage/memory.js';
import RedisStorage from './storage/redis.js';
import dbManager from '../database/index.js';

/**
 * Base rate limiter class implementing common functionality for rate limiting algorithms
 *
 * @abstract
 * @class
 * @description
 * This is the base class for all rate limiting algorithms. It provides common configuration
 * options and storage handling, while allowing specific algorithms to implement their own logic.
 * Only one algorithm can be active per instance - the algorithm is determined by which options
 * object is provided (tokenBucketConfig, slidingWindowConfig, or fixedWindowConfig).
 *
 * @example
 * // Using with Redis storage and token bucket algorithm
 * const limiter = new TokenBucketRateLimiter({
 *   maxRequests: 10,
 *   timeWindowSeconds: 60,
 *   store: 'redis',
 *   tokenBucketConfig: {
 *     refillRate: 0.5,
 *     burstSize: 15
 *   }
 * });
 */
class RateLimiter {
  /**
   * Creates a new rate limiter instance
   *
   * @param {Object} options - Configuration options for the rate limiter
   * @param {number} [options.maxRequests=60] - Maximum number of requests allowed within the time window.
   *                                           This is the default rate limit cap that applies across all algorithms.
   *                                           For token bucket, this affects the default refill rate.
   * @param {number} [options.timeWindowSeconds=60] - Time window in seconds for rate limiting.
   *                                                 For fixed window, this is the window duration.
   *                                                 For sliding window, this is the total time span considered.
   *                                                 For token bucket, this affects the default refill rate calculation.
   * @param {string} [options.keyPrefix='rl:'] - Prefix for storage keys. Useful when implementing different rate limit
   *                                           rules with different prefixes (e.g., 'rl:api:', 'rl:web:').
   * @param {string} [options.store='memory'] - Storage backend to use ('memory' or 'redis')
   * @param {Object} [options.tokenBucketConfig] - Token bucket algorithm specific options
   * @param {Object} [options.slidingWindowConfig] - Sliding window algorithm specific options
   * @param {Object} [options.fixedWindowConfig] - Fixed window algorithm specific options
   */
  constructor(options) {
    // Common options for all algorithms
    this.options = {
      maxRequests: 60, // Maximum number of requests
      timeWindowSeconds: 60, // Time window in seconds
      keyPrefix: 'rl:', // Key prefix for storage
      store: 'memory', // Default to memory storage
      ...options,
    };

    // Only one algorithm can be active per instance
    if (options?.tokenBucketConfig && options?.slidingWindowConfig) {
      throw new TejError(
        400,
        'Cannot use multiple rate limiting algorithms. Choose either tokenBucketConfig or slidingWindowConfig or fixedWindowConfig.',
      );
    }

    if (options?.tokenBucketConfig && options?.fixedWindowConfig) {
      throw new TejError(
        500,
        'Cannot use multiple rate limiting algorithms. Choose either tokenBucketConfig or slidingWindowConfig or fixedWindowConfig.',
      );
    }

    if (options?.slidingWindowConfig && options?.fixedWindowConfig) {
      throw new TejError(
        500,
        'Cannot use multiple rate limiting algorithms. Choose either tokenBucketConfig or slidingWindowConfig or fixedWindowConfig.',
      );
    }

    // Set default values for algorithm options if any are provided
    this.tokenBucketOptions = options?.tokenBucketConfig
      ? {
          refillRate: this.options.maxRequests / this.options.timeWindowSeconds, // Tokens per second
          burstSize: this.options.maxRequests, // Maximum token capacity
          ...options.tokenBucketConfig,
        }
      : null;

    this.slidingWindowOptions = options?.slidingWindowConfig
      ? {
          granularity: 1, // Time precision in seconds
          weights: { current: 1, previous: 0 }, // Weights for current and previous windows
          ...options.slidingWindowConfig,
        }
      : null;

    this.fixedWindowOptions = options?.fixedWindowConfig
      ? {
          strictWindow: false, // If true, windows align with clock
          ...options.fixedWindowConfig,
        }
      : null;

    // Initialize storage based on store type
    if (this.options.store === 'redis') {
      if (!dbManager.hasConnection('redis')) {
        throw new TejError(
          500,
          'Redis store selected but no Redis connection available. Call withRedis() first.',
        );
      }
      const redisClient = dbManager.getConnection('redis');
      this.storage = new RedisStorage(redisClient);
    } else {
      this.storage = new MemoryStorage();
    }
  }

  /**
   * Generate storage key for the rate limit identifier
   *
   * @param {string} identifier - Unique identifier for the rate limit (e.g. IP address, user ID)
   * @returns {string} The storage key with prefix
   */
  getKey(identifier) {
    return `${this.options.keyPrefix}${identifier}`;
  }

  /**
   * Abstract method for checking if request is allowed
   * Must be implemented by concrete rate limiter classes
   *
   * @abstract
   * @param {string} identifier - Unique identifier for the rate limit (e.g. IP address, user ID)
   * @returns {Promise<Object>} Rate limit check result
   * @returns {boolean} result.success - Whether the request is allowed
   * @returns {number} result.remainingRequests - Number of requests remaining in the window
   * @returns {number} result.resetTime - Unix timestamp when the rate limit resets
   * @throws {Error} If not implemented by child class
   */
  async consume(identifier) {
    throw new TejError(500, 'Not implemented');
  }

  /**
   * Get algorithm-specific options for the specified algorithm type
   *
   * @param {string} type - Algorithm type ('tokenBucketConfig', 'slidingWindowConfig', or 'fixedWindowConfig')
   * @returns {Object|null} The algorithm-specific options, or null if type not found
   */
  getAlgorithmOptions(type) {
    switch (type) {
      case 'token-bucket':
        return this.tokenBucketOptions;
      case 'sliding-window':
        return this.slidingWindowOptions;
      case 'fixed-window':
        return this.fixedWindowOptions;
      default:
        return null;
    }
  }
}

export default RateLimiter;
