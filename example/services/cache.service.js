/**
 * Cache service - Redis wrapper for key-value storage.
 * Requires Redis connection via app.takeoff({ withRedis: { url } }).
 */

import dbManager from 'te.js/database/index.js';

export function isAvailable() {
  const { exists } = dbManager.hasConnection('redis', {});
  return exists;
}

export async function get(key) {
  const redis = dbManager.getConnection('redis');
  return redis.get(key);
}

export async function set(key, value, ttlSeconds) {
  const redis = dbManager.getConnection('redis');
  if (ttlSeconds) {
    await redis.setEx(key, ttlSeconds, String(value));
  } else {
    await redis.set(key, String(value));
  }
}
