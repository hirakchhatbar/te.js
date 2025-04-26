import RateLimitStorage from './base.js';

/**
 * In-memory storage implementation for rate limiting
 * 
 * @extends RateLimitStorage
 * @description
 * This storage backend uses a JavaScript Map to store rate limit data in memory.
 * It's suitable for single-instance applications or testing environments, but not 
 * recommended for production use in distributed systems as data is not shared
 * between instances.
 * 
 * Key features:
 * - Fast access (all data in memory)
 * - Automatic cleanup of expired entries
 * - No external dependencies
 * - Data is lost on process restart
 * - Not suitable for distributed systems
 * 
 * @example
 * import { TokenBucketRateLimiter, MemoryStorage } from 'te.js/rate-limit';
 * 
 * // Memory storage is used by default if no redis config is provided
 * const limiter = new TokenBucketRateLimiter({
 *   maxRequests: 60,
 *   timeWindowSeconds: 60,
 *   tokenBucketConfig: {
 *     refillRate: 1,
 *     burstSize: 60
 *   }
 * });
 * 
 * // Or create storage instance explicitly
 * const storage = new MemoryStorage();
 * await storage.set('key', { counter: 5 }, 60); // Store for 60 seconds
 */
class MemoryStorage extends RateLimitStorage {
  /**
   * Initialize a new memory storage instance
   */
  constructor() {
    super();
    this.store = new Map();
  }

  /**
   * Get stored data for a key, handling expiration
   * 
   * @param {string} key - The storage key to retrieve data for
   * @returns {Promise<Object|null>} The stored data, or null if not found or expired
   */
  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expireAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
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
    this.store.set(key, {
      value,
      expireAt: Date.now() + ttl * 1000
    });
  }

  /**
   * Increment a numeric value in storage
   * 
   * @param {string} key - The storage key to increment
   * @returns {Promise<number|null>} New value after increment, or null if key not found/expired
   */
  async increment(key) {
    const item = await this.get(key);
    if (!item) return null;
    item.counter = (item.counter || 0) + 1;
    await this.set(key, item, (item.expireAt - Date.now()) / 1000);
    return item.counter;
  }

  /**
   * Delete data for a key
   * 
   * @param {string} key - The storage key to delete
   * @returns {Promise<void>}
   */
  async delete(key) {
    this.store.delete(key);
  }
}

export default MemoryStorage;