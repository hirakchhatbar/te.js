import RateLimitStorage from './base.js';

/**
 * Redis storage implementation for rate limiting
 *
 * @extends RateLimitStorage
 * @description
 * This storage backend uses Redis for distributed rate limiting across multiple application instances.
 * It's the recommended storage backend for production use in distributed systems as it provides
 * reliable rate limiting across all application instances.
 *
 * Key features:
 * - Distributed rate limiting (works across multiple app instances)
 * - Atomic operations for race condition prevention
 * - Automatic key expiration using Redis TTL
 * - Persistence options available through Redis configuration
 * - Clustering support for high availability
 *
 * @example
 * import { TokenBucketRateLimiter } from 'te.js/rate-limit';
 *
 * // Use Redis storage for distributed rate limiting
 * const limiter = new TokenBucketRateLimiter({
 *   maxRequests: 100,
 *   timeWindowSeconds: 60,
 *   store: 'redis', // Use Redis storage
 *   tokenBucketConfig: {
 *     refillRate: 2,
 *     burstSize: 100
 *   }
 * });
 */
class RedisStorage extends RateLimitStorage {
  /**
   * Initialize Redis storage with client
   *
   * @param {RedisClient} client - Connected Redis client instance
   */
  constructor(client) {
    super();
    this.client = client;
  }

  /**
   * Get stored data for a key
   *
   * @param {string} key - The storage key to retrieve
   * @returns {Promise<Object|null>} Stored value if found, null otherwise
   */
  async get(key) {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Store data with expiration time
   *
   * @param {string} key - The storage key
   * @param {Object} value - The data to store
   * @param {number} ttl - Time-to-live in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl) {
    await this.client.set(key, JSON.stringify(value), { EX: ttl });
  }

  /**
   * Increment a counter value atomically
   *
   * @param {string} key - The storage key to increment
   * @returns {Promise<number>} New value after increment
   */
  async increment(key) {
    return await this.client.incr(key);
  }

  /**
   * Delete data for a key
   *
   * @param {string} key - The storage key to delete
   * @returns {Promise<void>}
   */
  async delete(key) {
    await this.client.del(key);
  }
}

export default RedisStorage;
