import CacheEntity from './adapters/cache-entity.js';
import { getMaxCacheSizeInBytes } from './utils/cache-size.js';

class LRUCache {
  /**
   * Creates an instance of LRUCache.
   * @param {string} maxSize - The maximum size of the cache.
   * @param {function} [onDeleteCallback=null] - Optional callback function to call when an item is deleted.
   */
  constructor(maxSize, onDeleteCallback = null) {
    this.maxSize = getMaxCacheSizeInBytes(maxSize);
    this.currentSize = 0;
    this.onDeleteCallback = onDeleteCallback;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
  }

  /**
   * Inserts or updates the value for a given key.
   * @param {string} key - The key to set.
   * @param {any} value - The value to set.
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.delete(key);
    }

    const newEntity = new CacheEntity(key, value);
    this.#addEntity(newEntity);
    this.cache.set(key, newEntity);

    this.#enforceSizeLimit();
  }

  /**
   * Retrieves the value for a given key and updates its usage.
   * @param {string} key - The key to retrieve.
   * @returns {any} - The value associated with the key, or null if the key does not exist.
   */
  get(key) {
    if (!this.cache.has(key)) return null;
    const entity = this.cache.get(key);
    this.#moveToHead(entity);
    return entity.value;
  }

  /**
   * Removes a specific key from the cache.
   * @param {string} key - The key to delete.
   */
  delete(key) {
    if (!this.cache.has(key)) return;
    const entity = this.cache.get(key);
    this.#removeEntity(entity);
    this.cache.delete(key);
  }

  /**
   * Clears the entire cache.
   */
  purge() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
  }

  /**
   * Returns the current size of the cache.
   * @returns {number} - The number of items in the cache.
   */
  size() {
    return this.cache.size;
  }

  /**
   * Returns all the keys in the cache.
   * @returns {Array<string>} - An array of all keys in the cache.
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Returns paginated keys in the cache.
   * @param {number} [page=1] - The page number to retrieve.
   * @param {number} [pageSize=1000] - The number of keys per page.
   * @returns {Array<string>} - An array of keys for the specified page.
   */
  paginatedKeys(page = 1, pageSize = 1000) {
    const keysArray = Array.from(this.cache.keys());
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return keysArray.slice(start, end);
  }

  /**
   * Returns all the values in the cache.
   * @returns {Array<any>} - An array of all values in the cache.
   */
  values() {
    return Array.from(this.cache.values()).map((entity) => entity.value);
  }

  /**
   * Checks if a key exists in the cache.
   * @param {string} key - The key to check.
   * @returns {boolean} - True if the key exists, false otherwise.
   */
  has(key) {
    return this.cache.has(key);
  }

  // Internal method to add a node to the head of the linked list
  #addEntity(entity) {
    entity.next = this.head;
    entity.prev = null;
    if (this.head) {
      this.head.prev = entity;
    }
    this.head = entity;
    if (!this.tail) {
      this.tail = entity;
    }

    this.currentSize += entity.size;
  }

  // Internal method to remove a node from the linked list
  #removeEntity(entity) {
    if (entity.prev) {
      entity.prev.next = entity.next;
    } else {
      this.head = entity.next;
    }
    if (entity.next) {
      entity.next.prev = entity.prev;
    } else {
      this.tail = entity.prev;
    }

    this.currentSize -= entity.size;
  }

  // Internal method to move a node to the head of the linked list
  #moveToHead(entity) {
    this.#removeEntity(entity);
    this.#addEntity(entity);
  }

  // Internal method to evict the least recently used node
  #evict() {
    if (!this.tail) return;
    const oldestKey = this.tail.key;
    this.#removeEntity(this.tail);
    this.cache.delete(oldestKey);

    if (this.onDeleteCallback) {
      this.onDeleteCallback(oldestKey);
    }
  }

  // Internal method to enforce the size limit of the cache
  #enforceSizeLimit() {
    while (this.currentSize > this.maxSize && this.tail) {
      this.#evict();
    }
  }
}

export default LRUCache;
