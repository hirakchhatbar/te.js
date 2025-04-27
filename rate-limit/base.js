import TejError from '../server/error.js';
import MemoryStorage from './storage/memory.js';
import RedisStorage from './storage/redis.js';

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
 *   redis: {
 *     url: "redis://localhost:6379"
 *   },
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
   * @param {string} [options.keyPrefix='rl:'] - Prefix for storage keys. Useful when sharing a Redis instance
   *                                           with other applications or when implementing different rate limit
   *                                           rules with different prefixes (e.g., 'rl:api:', 'rl:web:').
   * @param {Object|string} [options.redis] - Redis configuration for Redis storage. If not provided, uses in-memory storage.
   *                                        See https://redis.io/docs/latest/develop/clients/nodejs/connect/
   *                                        for detailed Redis client configuration options.
   *                                        Can be either a connection URL string or a configuration object.
   * @param {string} [options.redis.username] - Redis username for authentication
   * @param {string} [options.redis.password] - Redis password for authentication
   * @param {Object} [options.redis.socket] - Socket connection configuration
   * @param {string} [options.redis.socket.host] - Redis server hostname
   * @param {number} [options.redis.socket.port] - Redis server port
   * @param {boolean} [options.redis.socket.tls] - Whether to use TLS for the connection
   * @param {function|number|boolean} [options.redis.socket.reconnectStrategy] - Reconnection strategy
   *                                                                           - false: don't reconnect
   *                                                                           - number: retry after ms
   *                                                                           - function: custom strategy
   *
   * @example Redis URL connection:
   * {
   *   redis: 'redis[s]://[[username][:password]@][host][:port][/db-number]'
   * }
   *
   * @example Redis object configuration:
   * {
   *   redis: {
   *     username: 'default',
   *     password: 'secret',
   *     socket: {
   *       host: 'localhost',
   *       port: 6379,
   *       reconnectStrategy: retries => Math.min(retries * 100, 3000)
   *     }
   *   }
   * }
   *
   * @param {Object} [options.tokenBucketConfig] - Token bucket algorithm specific options.
   *                                              This algorithm provides smooth rate limiting with burst capability.
   * @param {number} [options.tokenBucketConfig.refillRate] - Rate at which tokens refill per second.
   *                                                          If not specified, defaults to maxRequests/timeWindowSeconds.
   *                                                          Example: 0.5 means adding one token every 2 seconds.
   * @param {number} [options.tokenBucketConfig.burstSize] - Maximum token capacity for bursts. This allows
   *                                                         temporary bursts of requests above the average rate.
   *                                                         Defaults to maxRequests if not specified.
   *
   * @param {Object} [options.slidingWindowConfig] - Sliding window algorithm specific options.
   *                                                This algorithm provides more precise rate limiting by
   *                                                considering a moving time window.
   * @param {number} [options.slidingWindowConfig.granularity] - Time precision in seconds for the sliding window.
   *                                                             Lower values provide more accurate limiting but
   *                                                             require more storage. Example: 1 means tracking
   *                                                             per-second resolution.
   * @param {Object} [options.slidingWindowConfig.weights] - Weights for current and previous time windows.
   * @param {number} [options.slidingWindowConfig.weights.current] - Weight for the current window (0 to 1)
   * @param {number} [options.slidingWindowConfig.weights.previous] - Weight for the previous window (0 to 1)
   *
   * @param {Object} [options.fixedWindowConfig] - Fixed window algorithm specific options.
   *                                              This algorithm is simpler but can allow request spikes
   *                                              at window boundaries.
   * @param {boolean} [options.fixedWindowConfig.strictWindow] - If true, windows align with clock time
   *                                                            (e.g., minutes start at :00 seconds).
   *                                                            If false, windows start on first request.
   * @throws {Error} If multiple algorithm options are provided
   *
   */
  constructor(options) {
    // Common options for all algorithms
    this.options = {
      maxRequests: 60, // Maximum number of requests
      timeWindowSeconds: 60, // Time window in seconds
      keyPrefix: 'rl:', // Key prefix for storage
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

    // Initialize storage
    this.storage = options.redis
      ? new RedisStorage(options.redis)
      : new MemoryStorage();
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
