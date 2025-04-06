import LRUCache from './lru-cache.js';
import CacheEntity from './entity.js';
import { decrypt, encrypt, generateKey } from './utils/encryption.js';
import print from './functions/logs.js';

/**
 * CacheStore is a singleton class that manages multiple LRU caches with a global size limit.
 * Features:
 * - Multiple independent cache namespaces
 * - Global size limit across all namespaces
 * - Automatic encryption of cached values
 * - Configurable logging
 * - TTL support
 * - Efficient eviction across all namespaces
 * - Synchronization to prevent race conditions
 *
 * Size Management:
 * - Tracks total memory usage across all caches
 * - Evicts least recently used items from any namespace when global limit is reached
 * - Provides accurate size estimation for all value types
 *
 * @class
 */
class CacheStore {
  /**
   * Gets or creates the singleton instance of CacheStore.
   *
   * @param {string|number} maxSize - The maximum size of the global cache (e.g., "100MB", "25%")
   * @param {Function} [onDeleteCallback=null] - Optional callback function called when an item is deleted
   * @param {boolean} [enableLogs=false] - Whether to enable logging of cache operations
   * @returns {CacheStore} The singleton instance of CacheStore
   */
  static getInstance(maxSize, onDeleteCallback = null, enableLogs = false) {
    if (!CacheStore.instance) {
      CacheStore.instance = new CacheStore(
        maxSize,
        onDeleteCallback,
        enableLogs,
      );
    }
    return CacheStore.instance;
  }

  /**
   * Creates a new CacheStore instance.
   *
   * @param {string|number} maxSize - The maximum size of the global cache
   * @param {Function} [onDeleteCallback=null] - Optional callback function called when an item is deleted
   * @param {boolean} [enableLogs=false] - Whether to enable logging of cache operations
   * @private
   */
  constructor(maxSize, onDeleteCallback = null, enableLogs = false) {
    if (CacheStore.instance) {
      return CacheStore.instance;
    }

    this.enableLogs = enableLogs;
    this.maxSize = maxSize;
    this.onDeleteCallback = onDeleteCallback;
    this.caches = new Map();

    // Global size tracking
    this.globalSize = 0;

    // Synchronization lock for atomic operations
    this._operationLock = false;

    CacheStore.instance = this;
  }

  /**
   * Acquires the operation lock to ensure atomic operations.
   * This prevents race conditions when multiple operations modify the cache simultaneously.
   *
   * @returns {Promise<Function>} A function to release the lock when done
   * @private
   */
  async #acquireLock() {
    // Wait until the lock is released
    while (this._operationLock) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    // Acquire the lock
    this._operationLock = true;

    // Return a function to release the lock
    return () => {
      this._operationLock = false;
    };
  }

  /**
   * Executes an operation with the lock acquired to ensure atomicity.
   *
   * @param {Function} operation - The operation to execute
   * @returns {Promise<any>} The result of the operation
   * @private
   */
  async #withLock(operation) {
    const releaseLock = await this.#acquireLock();
    try {
      return await operation();
    } finally {
      releaseLock();
    }
  }

  /**
   * Sets a value in the cache with an optional TTL.
   * The value is automatically encrypted before storage and will be decrypted when retrieved.
   * If the global size limit would be exceeded, least recently used entries are evicted first.
   * This operation is atomic to prevent race conditions.
   *
   * @param {string} prefix - The namespace/prefix for the cache
   * @param {string} key - The key to store the value under
   * @param {any} value - The value to store
   * @param {number} [ttl=Infinity] - Time-to-live in milliseconds
   */
  async set(prefix, key, value, ttl = Infinity) {
    return this.#withLock(async () => {
      const encryptedValue = encrypt(value);
      const cache = this.#getOrCreateCache(prefix);

      // Create timestamp once to use for both expiry and timestamp
      const timestamp = Date.now();
      const expiry = timestamp + ttl;

      // Calculate entry size and check if we need to enforce size limit
      const entrySize = this.#estimateEntrySize(key, encryptedValue, expiry);
      if (this.globalSize + entrySize > this.maxSize) {
        await this.#enforceGlobalSizeLimit(entrySize);
      }

      // Store the entry
      await cache.set(key, encryptedValue, expiry);

      // Update global size tracking
      this.globalSize += entrySize;

      if (this.enableLogs) print('set', `${prefix}:${key}`, ttl);
    });
  }

  /**
   * Retrieves a value from the cache.
   * The value is automatically decrypted before being returned.
   * Returns null if the key doesn't exist or if the entry has expired.
   * This operation is atomic to prevent race conditions.
   *
   * @param {string} prefix - The namespace/prefix for the cache
   * @param {string} key - The key to retrieve
   * @returns {any|null} The decrypted value or null if not found or expired
   */
  async get(prefix, key) {
    return this.#withLock(async () => {
      const cache = this.#getOrCreateCache(prefix);
      const cacheEntry = await cache.get(key);

      if (!cacheEntry) {
        if (this.enableLogs) print('miss', `${prefix}:${key}`);
        return null;
      }

      if (this.enableLogs) print('get', `${prefix}:${key}`);
      return decrypt(cacheEntry);
    });
  }

  /**
   * Deletes a value from the cache.
   * Updates the global size tracking by subtracting the size of the deleted entry.
   * This operation is atomic to prevent race conditions.
   *
   * @param {string} prefix - The namespace/prefix for the cache
   * @param {string} key - The key to delete
   */
  async delete(prefix, key) {
    return this.#withLock(async () => {
      const cache = this.#getOrCreateCache(prefix);
      const entry = await cache.get(key);

      if (entry) {
        // Update global size when removing entry
        const entrySize = this.#estimateEntrySize(key, entry, entry.expiry);
        this.globalSize -= entrySize;
      }

      await cache.delete(key);
      if (this.enableLogs) print('del', `${prefix}:${key}`);
    });
  }

  /**
   * Clears all entries from a specific cache or all caches.
   * Updates the global size tracking by subtracting the size of all cleared entries.
   * This operation is atomic to prevent race conditions.
   *
   * @param {string} [prefix=null] - The namespace/prefix to clear, or null to clear all caches
   */
  async clear(prefix = null) {
    return this.#withLock(async () => {
      if (prefix) {
        // Clear a specific cache
        const cache = this.#getOrCreateCache(prefix);
        this.globalSize -= cache.getCurrentSize();
        await cache.purge();
        if (this.enableLogs) print('clear', `${prefix}:ALL`);
      } else {
        // Clear all caches
        this.globalSize = 0;
        this.caches.clear();
        if (this.enableLogs) print('clear', 'ALL');
      }
    });
  }

  /**
   * Gets an existing cache or creates a new one for the given prefix.
   *
   * @param {string} prefix - The namespace/prefix for the cache
   * @returns {LRUCache} The cache for the given prefix
   * @private
   */
  #getOrCreateCache(prefix) {
    if (!this.caches.has(prefix)) {
      this.caches.set(
        prefix,
        new LRUCache(this.maxSize, this.onDeleteCallback),
      );
    }
    return this.caches.get(prefix);
  }

  /**
   * Estimates the size of a cache entry in bytes.
   *
   * @param {string} key - The key of the entry
   * @param {any} value - The value of the entry
   * @param {number} [expiry=Infinity] - The expiry timestamp of the entry
   * @returns {number} The estimated size in bytes
   * @private
   */
  #estimateEntrySize(key, value, expiry = Infinity) {
    // Create a temporary CacheEntity to estimate the size
    const tempEntity = new CacheEntity(key, value, expiry);
    return tempEntity.getSize();
  }

  /**
   * Enforces the global size limit by removing the least recently used entries.
   * This method iterates through all caches and evicts entries based on LRU policy
   * until enough space is freed.
   * This operation is atomic to prevent race conditions.
   *
   * @param {number} [requiredSpace=0] - Additional space that needs to be freed
   * @private
   */
  async #enforceGlobalSizeLimit(requiredSpace = 0) {
    // Continue evicting until we have enough space
    while (this.globalSize + requiredSpace > this.maxSize) {
      // Find the cache with the least recently used entry
      let lruCache = null;
      let lruKey = null;

      for (const cache of this.caches.values()) {
        if (cache.tail) {
          lruCache = cache;
          lruKey = cache.tail.key;
          break;
        }
      }

      // If no cache has entries, we can't evict anything
      if (!lruCache || !lruKey) {
        break;
      }

      // Get the entry before deleting it to update global size
      const entry = await lruCache.get(lruKey);
      if (entry) {
        const entrySize = this.#estimateEntrySize(lruKey, entry, entry.expiry);
        this.globalSize -= entrySize;
      }

      // Delete the entry (this will update the LRU list)
      await lruCache.delete(lruKey);
    }
  }
}

export default CacheStore;
