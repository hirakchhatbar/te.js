import redis from '../../database/redis.js';
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
 *   redis: {
 *     url: "redis://localhost:6379",
 *     options: {
 *       // Optional Redis client options
 *       password: "secret",
 *       db: 0
 *     }
 *   },
 *   tokenBucketConfig: {
 *     refillRate: 2,
 *     burstSize: 100
 *   }
 * });
 * 
 * // For Redis Cluster support
 * const clusterLimiter = new TokenBucketRateLimiter({
 *   maxRequests: 100,
 *   timeWindowSeconds: 60,
 *   redis: {
 *     isCluster: true,
 *     url: [
 *       "redis://node1:6379",
 *       "redis://node2:6379",
 *       "redis://node3:6379"
 *     ]
 *   },
 *   tokenBucketConfig: {
 *     refillRate: 2,
 *     burstSize: 100
 *   }
 * });
 */
class RedisStorage extends RateLimitStorage {
  /**
   * Initialize Redis storage with configuration
   * 
   * @param {Object} config - Redis connection configuration
   * @param {string|string[]} config.url - Redis connection URL or array of cluster URLs
   * @param {boolean} [config.isCluster=false] - Whether to use Redis Cluster
   * @param {Object} [config.options] - Additional Redis client options
   */
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
  }

  /**
   * Get or create Redis client connection
   * 
   * @returns {Promise<RedisClient>} Connected Redis client instance
   * @private
   */
  async getClient() {
    if (!this.client) {
      this.client = await redis.getClient(this.config);
    }
    return this.client;
  }

  /**
   * Get stored data for a key
   * 
   * @param {string} key - The storage key to retrieve
   * @returns {Promise<Object|null>} Stored value if found, null otherwise
   */
  async get(key) {
    const client = await this.getClient();
    const value = await client.get(key);
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
    const client = await this.getClient();
    await client.set(key, JSON.stringify(value), { EX: ttl });
  }

  /**
   * Increment a counter value atomically
   * 
   * @param {string} key - The storage key to increment
   * @returns {Promise<number>} New value after increment
   */
  async increment(key) {
    const client = await this.getClient();
    return await client.incr(key);
  }

  /**
   * Delete data for a key
   * 
   * @param {string} key - The storage key to delete
   * @returns {Promise<void>}
   */
  async delete(key) {
    const client = await this.getClient();
    await client.del(key);
  }
}

export default RedisStorage;