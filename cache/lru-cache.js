import CacheEntity from './entity.js';
import { getMaxCacheSizeInBytes } from './utils/cache-size.js';

/**
 * LRUCache implements a Least Recently Used (LRU) cache with size-based eviction.
 * It maintains a doubly-linked list of cache entries and a Map for O(1) lookups.
 * Features:
 * - Accurate memory size tracking for all value types
 * - Automatic eviction based on memory limits
 * - Optional callback on entry deletion
 * - Support for entry expiration
 * - Efficient O(1) operations for get/set/delete
 * - Synchronization to prevent race conditions
 *
 * @class
 */
class LRUCache {
  /**
   * Creates an instance of LRUCache.
   *
   * @param {string|number} maxSize - The maximum size of the cache (e.g., "100MB", "25%")
   * @param {Function} [onDeleteCallback=null] - Optional callback function called when an item is deleted
   */
  constructor(maxSize, onDeleteCallback = null) {
    this.maxSize = getMaxCacheSizeInBytes(maxSize);
    this.currentSize = 0;
    this.onDeleteCallback = onDeleteCallback;

    // Main storage
    this.cache = new Map();

    // Linked list pointers for LRU tracking
    this.head = null; // Most recently used
    this.tail = null; // Least recently used

    // Synchronization lock for atomic operations
    this._operationLock = false;
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
   * Returns the current size of the cache in bytes.
   *
   * @returns {number} - The current size of the cache in bytes
   */
  getCurrentSize() {
    return this.currentSize;
  }

  /**
   * Inserts or updates the value for a given key.
   * If the key already exists, the old value is removed first.
   * This operation is atomic to prevent race conditions.
   *
   * @param {string} key - The key to set
   * @param {any} value - The value to set
   * @param {number} [expiry=Infinity] - The expiry timestamp in milliseconds
   */
  async set(key, value, expiry = Infinity) {
    return this.#withLock(async () => {
      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        await this.delete(key);
      }

      // Create and add the new entity
      const newEntity = new CacheEntity(key, value, expiry);
      this.#addEntity(newEntity);
      this.cache.set(key, newEntity);

      // Enforce size limit
      await this.#enforceSizeLimit();
    });
  }

  /**
   * Retrieves the value for a given key and updates its usage.
   * This moves the accessed entry to the head of the LRU list.
   * This operation is atomic to prevent race conditions.
   *
   * @param {string} key - The key to retrieve
   * @returns {any} - The value associated with the key, or null if the key does not exist or has expired
   */
  async get(key) {
    return this.#withLock(async () => {
      if (!this.cache.has(key)) return null;

      const entity = this.cache.get(key);

      // Check if the entry has expired
      if (entity.isExpired()) {
        await this.delete(key);
        return null;
      }

      this.#moveToHead(entity);
      return entity.value;
    });
  }

  /**
   * Removes a specific key from the cache.
   * This operation is atomic to prevent race conditions.
   *
   * @param {string} key - The key to delete
   */
  async delete(key) {
    return this.#withLock(async () => {
      if (!this.cache.has(key)) return;

      const entity = this.cache.get(key);
      this.#removeEntity(entity);
      this.cache.delete(key);
    });
  }

  /**
   * Clears the entire cache.
   * This operation is atomic to prevent race conditions.
   */
  async purge() {
    return this.#withLock(async () => {
      this.cache.clear();
      this.head = null;
      this.tail = null;
      this.currentSize = 0;
    });
  }

  /**
   * Returns the number of items in the cache.
   *
   * @returns {number} - The number of items in the cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Returns all the keys in the cache.
   *
   * @returns {Array<string>} - An array of all keys in the cache
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Returns paginated keys in the cache.
   * This method is useful for efficiently retrieving a subset of keys
   * when the cache contains a large number of entries.
   *
   * @param {number} [page=1] - The page number to retrieve (1-indexed)
   * @param {number} [pageSize=1000] - The number of keys per page
   * @returns {Array<string>} - An array of keys for the specified page
   */
  paginatedKeys(page = 1, pageSize = 1000) {
    return this.#withLock(async () => {
      const keysArray = Array.from(this.cache.keys());
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return keysArray.slice(start, end);
    });
  }

  /**
   * Returns all the values in the cache.
   *
   * @returns {Array<any>} - An array of all values in the cache
   */
  values() {
    return this.#withLock(async () => {
      return Array.from(this.cache.values()).map((entity) => entity.value);
    });
  }

  /**
   * Checks if a key exists in the cache.
   *
   * @param {string} key - The key to check
   * @returns {boolean} - True if the key exists, false otherwise
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Adds a node to the head of the linked list.
   * This marks the entry as the most recently used.
   *
   * @param {CacheEntity} entity - The entity to add
   * @private
   */
  #addEntity(entity) {
    // Set up the new entity's links
    entity.next = this.head;
    entity.prev = null;

    // Update the head's prev pointer if it exists
    if (this.head) {
      this.head.prev = entity;
    }

    // Update the head pointer
    this.head = entity;

    // If this is the first entry, set the tail pointer
    if (!this.tail) {
      this.tail = entity;
    }

    // Update the current size
    this.currentSize += entity.size;
  }

  /**
   * Removes a node from the linked list.
   *
   * Safety measures:
   * - Handles the case where the entity is the only node (both head and tail)
   * - Ensures proper pointer updates for all cases
   * - Prevents negative size values
   *
   * @param {CacheEntity} entity - The entity to remove
   * @private
   */
  #removeEntity(entity) {
    if (!entity) return;

    // Special case: entity is both head and tail (only node in list)
    if (entity === this.head && entity === this.tail) {
      this.head = null;
      this.tail = null;
    }
    // Entity is the head
    else if (entity === this.head) {
      this.head = entity.next;
      if (this.head) {
        this.head.prev = null;
      }
    }
    // Entity is the tail
    else if (entity === this.tail) {
      this.tail = entity.prev;
      if (this.tail) {
        this.tail.next = null;
      }
    }
    // Entity is in the middle
    else {
      if (entity.prev) {
        entity.prev.next = entity.next;
      }
      if (entity.next) {
        entity.next.prev = entity.prev;
      }
    }

    // Update the current size, ensuring it doesn't go negative
    const newSize = Math.max(0, this.currentSize - entity.size);
    this.currentSize = newSize;
  }

  /**
   * Moves a node to the head of the linked list.
   * This marks the entry as the most recently used.
   *
   * @param {CacheEntity} entity - The entity to move
   * @private
   */
  #moveToHead(entity) {
    this.#removeEntity(entity);
    this.#addEntity(entity);
  }

  /**
   * Evicts the least recently used node.
   * This is called when the cache reaches its size limit.
   *
   * Safety measures:
   * - Verifies tail exists before attempting eviction
   * - Ensures the key exists in the cache before deletion
   * - Handles the case where the tail is the only node
   *
   * @private
   */
  #evict() {
    if (!this.tail) return;

    const oldestKey = this.tail.key;
    const oldSize = this.currentSize;

    // Remove from linked list
    this.#removeEntity(this.tail);

    // Remove from cache map
    if (this.cache.has(oldestKey)) {
      this.cache.delete(oldestKey);
    }

    // Verify size actually decreased
    if (this.currentSize >= oldSize) {
      console.warn(
        `Eviction did not reduce cache size: ${oldSize} -> ${this.currentSize}`,
      );
    }

    // Call the callback if provided
    if (this.onDeleteCallback) {
      this.onDeleteCallback(oldestKey);
    }
  }

  /**
   * Enforces the size limit of the cache by evicting the least recently used entries.
   * This method is called automatically when adding new entries that would exceed the size limit.
   * It continues evicting entries until there is enough space for the new entry.
   *
   * Safety measures:
   * - Includes a maximum iteration count to prevent infinite loops
   * - Checks if tail exists before each iteration
   * - Verifies that size actually decreases after each eviction
   *
   * @private
   */
  async #enforceSizeLimit() {
    const MAX_ITERATIONS = 1000; // Prevent infinite loops
    let iterations = 0;
    let previousSize = this.currentSize;

    while (
      this.currentSize > this.maxSize &&
      this.tail &&
      iterations < MAX_ITERATIONS
    ) {
      this.#evict();
      iterations++;

      // Safety check: if size didn't decrease, break to prevent infinite loop
      if (this.currentSize >= previousSize) {
        console.warn(
          'Cache eviction did not reduce size, breaking to prevent infinite loop',
        );
        break;
      }

      previousSize = this.currentSize;
    }

    if (iterations >= MAX_ITERATIONS) {
      console.warn(
        `Cache eviction reached maximum iterations (${MAX_ITERATIONS}), some items may not have been evicted`,
      );
    }
  }
}

export default LRUCache;
