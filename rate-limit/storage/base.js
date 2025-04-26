import TejError from '../../server/error.js';

/**
 * Abstract base class for rate limiter storage backends
 *
 * @abstract
 * @description
 * Defines the interface that all storage implementations must follow.
 * Storage backends are responsible for persisting rate limit data and handling
 * data expiration. Two implementations are provided out of the box:
 * - MemoryStorage: For single-instance applications and testing
 * - RedisStorage: For distributed applications
 *
 * Custom storage implementations can be created by extending this class
 * and implementing all required methods.
 *
 * @example
 * // Custom storage implementation
 * class MyCustomStorage extends RateLimitStorage {
 *   async get(key) {
 *     // Implementation
 *   }
 *   async set(key, value, ttl) {
 *     // Implementation
 *   }
 *   async increment(key) {
 *     // Implementation
 *   }
 *   async delete(key) {
 *     // Implementation
 *   }
 * }
 */
class RateLimitStorage {
  /**
   * Retrieve rate limit data for a given key
   *
   * @abstract
   * @param {string} key - The storage key to retrieve data for
   * @returns {Promise<Object|null>} The stored data, or null if not found
   * @throws {Error} If not implemented by child class
   *
   * @example
   * const data = await storage.get('rl:127.0.0.1');
   * if (data) {
   *   console.log('Found rate limit data:', data);
   * }
   */
  async get(key) {
    throw new TejError(500, 'Not implemented');
  }

  /**
   * Store rate limit data with optional expiration
   *
   * @abstract
   * @param {string} key - The storage key to store data under
   * @param {Object} value - The data to store
   * @param {number} ttl - Time-to-live in seconds
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by child class
   *
   * @example
   * await storage.set('rl:127.0.0.1', { counter: 5 }, 60);
   */
  async set(key, value, ttl) {
    throw new TejError(500, 'Not implemented');
  }

  /**
   * Increment a numeric value in storage
   *
   * @abstract
   * @param {string} key - The storage key to increment
   * @returns {Promise<number|null>} The new value after increment, or null if key not found
   * @throws {Error} If not implemented by child class
   *
   * @example
   * const newValue = await storage.increment('rl:127.0.0.1');
   * if (newValue !== null) {
   *   console.log('New counter value:', newValue);
   * }
   */
  async increment(key) {
    throw new TejError(500, 'Not implemented');
  }

  /**
   * Delete data for a given key
   *
   * @abstract
   * @param {string} key - The storage key to delete
   * @returns {Promise<void>}
   * @throws {Error} If not implemented by child class
   *
   * @example
   * await storage.delete('rl:127.0.0.1');
   */
  async delete(key) {
    throw new TejError(500, 'Not implemented');
  }
}

export default RateLimitStorage;
