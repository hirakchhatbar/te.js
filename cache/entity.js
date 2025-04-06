/**
 * CacheEntity represents a single entry in the cache.
 * It maintains links to the previous and next entries in the LRU list,
 * and tracks the size of the entry.
 *
 * @class
 */
class CacheEntity {
  /**
   * Creates a new CacheEntity.
   *
   * @param {string} key - The key of the cache entry
   * @param {any} value - The value of the cache entry
   * @param {number} [expiry=Infinity] - The expiry timestamp in milliseconds
   */
  constructor(key, value, expiry = Infinity) {
    this.key = key;
    this.value = value;
    this.expiry = expiry;
    this.timestamp = Date.now();

    // Linked list pointers
    this.prev = null;
    this.next = null;

    // Calculate and store the size of this entry
    this.size = this.estimateSize();
  }

  /**
   * Estimates the size of a cache entry in bytes.
   * This method provides accurate size estimation for different value types:
   * - Strings: UTF-8 encoded size
   * - Buffers: Exact byte length
   * - Numbers: 8 bytes
   * - Booleans: 4 bytes
   * - Objects/Arrays: JSON stringified size
   * - null/undefined: 0 bytes
   *
   * Additional overhead:
   * - Key storage: UTF-8 encoded size
   * - Expiry timestamp: 8 bytes
   * - Creation timestamp: 8 bytes
   * - Entity structure: 50 bytes
   *
   * @returns {number} - The estimated size in bytes
   */
  estimateSize() {
    // Estimate key size
    const keySize = Buffer.byteLength(this.key, 'utf8');

    // Estimate value size - handle different types efficiently
    let valueSize;
    if (typeof this.value === 'string') {
      valueSize = Buffer.byteLength(this.value, 'utf8');
    } else if (Buffer.isBuffer(this.value)) {
      valueSize = this.value.length;
    } else if (this.value === null || this.value === undefined) {
      valueSize = 0;
    } else if (typeof this.value === 'number') {
      // Numbers are typically 8 bytes in JavaScript
      valueSize = 8;
    } else if (typeof this.value === 'boolean') {
      // Booleans are typically 4 bytes in JavaScript
      valueSize = 4;
    } else {
      // For objects, arrays, and other types, stringify them
      try {
        valueSize = Buffer.byteLength(JSON.stringify(this.value), 'utf8');
      } catch (e) {
        // If stringification fails, use a fallback size
        valueSize = 100; // Reasonable default for complex objects
      }
    }

    // Add size for expiry and timestamp (numbers)
    const expirySize = 8; // Size of a number in bytes
    const timestampSize = 8; // Size of a number in bytes

    // Add overhead for the entity structure itself
    const overheadSize = 50; // Approximate overhead for the entity object

    return keySize + valueSize + expirySize + timestampSize + overheadSize;
  }

  /**
   * Gets the current size of this entity in bytes.
   *
   * @returns {number} - The size of this entity in bytes
   */
  getSize() {
    return this.size;
  }

  /**
   * Checks if the entry has expired.
   *
   * @returns {boolean} - True if the entry has expired, false otherwise
   */
  isExpired() {
    return Date.now() > this.expiry;
  }
}

export default CacheEntity;
