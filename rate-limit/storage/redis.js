import RateLimitStorage from './base.js';
import { checkRedisInstallation, installRedisSync } from './redis-install.js';
import TejLogger from 'tej-logger';

const logger = new TejLogger('RedisStorage');

/**
 * Redis-backed storage implementation for rate limiting.
 *
 * Suitable for distributed / multi-instance deployments where rate-limit
 * counters must be shared across processes.
 *
 * The `redis` npm package is auto-installed into the consuming project
 * on first use if it is not already present.
 *
 * @extends RateLimitStorage
 */
class RedisStorage extends RateLimitStorage {
  /**
   * @param {Object} config - Redis connection configuration
   * @param {string} config.url - Redis connection URL (required)
   *   Remaining properties are forwarded to the node-redis `createClient` call.
   */
  constructor(config) {
    super();

    if (!config?.url) {
      throw new Error(
        'RedisStorage requires a url. Provide store: { type: "redis", url: "redis://..." }',
      );
    }

    const { type: _type, url, ...redisOptions } = config;
    this._url = url;
    this._redisOptions = redisOptions;

    this._client = null;
    this._connectPromise = this._init();
  }

  /** Bootstrap: ensure redis is installed, create client, connect. */
  async _init() {
    const { needsInstall } = checkRedisInstallation();
    if (needsInstall) {
      installRedisSync();
    }

    // Dynamic import so the module is only resolved after auto-install
    const { createClient } = await import('redis');

    this._client = createClient({ url: this._url, ...this._redisOptions });

    this._client.on('error', (err) => {
      logger.error(`Redis client error: ${err.message}`);
    });

    await this._client.connect();
    logger.info(`Connected to Redis at ${this._url}`);
  }

  /** Wait until the client is ready before any operation. */
  async _ready() {
    await this._connectPromise;
    return this._client;
  }

  /**
   * @param {string} key
   * @returns {Promise<Object|null>}
   */
  async get(key) {
    const client = await this._ready();
    const raw = await client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * @param {string} key
   * @param {Object} value
   * @param {number} ttl - seconds
   */
  async set(key, value, ttl) {
    const client = await this._ready();
    const seconds = Math.max(1, Math.ceil(ttl));
    await client.setEx(key, seconds, JSON.stringify(value));
  }

  /**
   * Atomically increments the `counter` field inside the stored JSON value.
   * Uses a Lua script to read-modify-write in a single round-trip.
   *
   * @param {string} key
   * @returns {Promise<number|null>}
   */
  async increment(key) {
    const client = await this._ready();

    const script = `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return nil end
      local data = cjson.decode(raw)
      data.counter = (data.counter or 0) + 1
      local ttl = redis.call('TTL', KEYS[1])
      if ttl > 0 then
        redis.call('SETEX', KEYS[1], ttl, cjson.encode(data))
      else
        redis.call('SET', KEYS[1], cjson.encode(data))
      end
      return data.counter
    `;

    const result = await client.eval(script, { keys: [key] });
    return result === null ? null : Number(result);
  }

  /**
   * @param {string} key
   */
  async delete(key) {
    const client = await this._ready();
    await client.del(key);
  }
}

export default RedisStorage;
