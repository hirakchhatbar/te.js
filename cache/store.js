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
    this.cache = new LRUCache(maxSize, onDeleteCallback);
    CacheStore.instance = this;
  }

  set(endpoint, params, value, ttl = Infinity) {
    const key = generateKey(endpoint, params);
    const encryptedValue = encrypt(value);

    this.cache.set(key, { value: encryptedValue, expiry: Date.now() + ttl });
    if (this.enableLogs) print('set', key, ttl);
  }

  get(endpoint, params) {
    const key = generateKey(endpoint, params);
    const cacheEntry = this.cache.get(key);
    if (!cacheEntry) {
      if (this.enableLogs) print('miss', key);
      return null;
    }

    if (Date.now() > cacheEntry.expiry) {
      this.cache.delete(key);
      if (this.enableLogs) print('expired', key);
      return null;
    }
    if (this.enableLogs) print('get', key);
    return decrypt(cacheEntry.value);
  }

  delete(endpoint, params) {
    const key = generateKey(endpoint, params);
    this.cache.delete(key);
    if (this.enableLogs) print('del', key);
  }

  clear() {
    this.cache.purge();
    if (this.enableLogs) print('clear', 'ALL');
  }
}

export default CacheStore;
