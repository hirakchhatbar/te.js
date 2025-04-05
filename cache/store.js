import LRUCache from './lru-cache.js';
import { decrypt, encrypt, generateKey } from './utils/encryption.js';
import print from './functions/logs.js';

class CacheStore {
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

  constructor(maxSize, onDeleteCallback = null, enableLogs = false) {
    if (CacheStore.instance) {
      return CacheStore.instance;
    }
    this.enableLogs = enableLogs;
    this.maxSize = maxSize;
    this.onDeleteCallback = onDeleteCallback;
    this.caches = new Map();
    CacheStore.instance = this;
  }

  set(prefix, key, value, ttl = Infinity) {
    const encryptedValue = encrypt(value);
    const cache = this.#getOrCreateCache(prefix);

    cache.set(key, {
      value: encryptedValue,
      expiry: Date.now() + ttl,
      timestamp: Date.now(),
    });
    this.#enforceGlobalSizeLimit();

    if (this.enableLogs) print('set', `${prefix}:${key}`, ttl);
  }

  get(prefix, key) {
    const cache = this.#getOrCreateCache(prefix);
    const cacheEntry = cache.get(key);

    if (!cacheEntry) {
      if (this.enableLogs) print('miss', `${prefix}:${key}`);
      return null;
    }

    if (Date.now() > cacheEntry.expiry) {
      cache.delete(key);
      if (this.enableLogs) print('expired', `${prefix}:${key}`);
      return null;
    }
    if (this.enableLogs) print('get', `${prefix}:${key}`);
    return decrypt(cacheEntry.value);
  }

  delete(prefix, key) {
    const cache = this.#getOrCreateCache(prefix);
    cache.delete(key);
    if (this.enableLogs) print('del', `${prefix}:${key}`);
  }

  clear(prefix = null) {
    if (prefix) {
      const cache = this.#getOrCreateCache(prefix);
      cache.purge();
      if (this.enableLogs) print('clear', `${prefix}:ALL`);
    } else {
      this.caches.clear();
      if (this.enableLogs) print('clear', 'ALL');
    }
  }

  #getOrCreateCache(prefix) {
    if (!this.caches.has(prefix)) {
      this.caches.set(
        prefix,
        new LRUCache(this.maxSize, this.onDeleteCallback),
      );
    }
    return this.caches.get(prefix);
  }

  #getTotalSize() {
    return Array.from(this.caches.values()).reduce(
      (total, cache) => total + cache.currentSize,
      0,
    );
  }

  #enforceGlobalSizeLimit() {
    while (this.#getTotalSize() > this.maxSize) {
      // Find the cache with the oldest entry
      let oldestCache = null;
      let oldestEntry = { timestamp: Infinity };

      for (const cache of this.caches.values()) {
        if (cache.tail && cache.tail.value.timestamp < oldestEntry.timestamp) {
          oldestCache = cache;
          oldestEntry = cache.tail.value;
        }
      }

      if (oldestCache && oldestCache.tail) {
        oldestCache.delete(oldestCache.tail.key);
      }
    }
  }
}

export default CacheStore;
