/**
 * @fileoverview Tests for the rate limiter middleware factory.
 */
import { describe, it, expect, vi } from 'vitest';
import rateLimiter from './index.js';

function makeAmmo(ip = '127.0.0.1') {
  return {
    ip,
    res: {
      setHeader: vi.fn(),
    },
    throw: vi.fn(),
  };
}

describe('rateLimiter', () => {
  it('should throw on invalid algorithm', () => {
    expect(() =>
      rateLimiter({
        maxRequests: 10,
        timeWindowSeconds: 60,
        algorithm: 'invalid-algo',
      }),
    ).toThrow();
  });

  it('should return a middleware function', () => {
    const mw = rateLimiter({ maxRequests: 100, timeWindowSeconds: 60 });
    expect(typeof mw).toBe('function');
  });

  it('should call next when under limit', async () => {
    const mw = rateLimiter({ maxRequests: 100, timeWindowSeconds: 60 });
    const ammo = makeAmmo();
    const next = vi.fn().mockResolvedValue(undefined);
    await mw(ammo, next);
    expect(next).toHaveBeenCalled();
  });

  it('should use fallback key "unknown" when ammo.ip is undefined', async () => {
    const mw = rateLimiter({ maxRequests: 100, timeWindowSeconds: 60 });
    const ammo = makeAmmo(undefined);
    const next = vi.fn().mockResolvedValue(undefined);
    await mw(ammo, next);
    expect(next).toHaveBeenCalled();
  });

  it('should throw on invalid store config', () => {
    expect(() =>
      rateLimiter({
        maxRequests: 10,
        timeWindowSeconds: 60,
        store: 'postgres',
      }),
    ).toThrow(/Invalid store config/);
  });

  it('should throw when redis store has no url', () => {
    expect(() =>
      rateLimiter({
        maxRequests: 10,
        timeWindowSeconds: 60,
        store: { type: 'redis' },
      }),
    ).toThrow(/requires a url/);
  });

  it('should accept redis store config without throwing on creation', () => {
    vi.mock('./storage/redis.js', () => ({
      default: class MockRedisStorage {
        async get() {
          return null;
        }
        async set() {}
        async increment() {
          return null;
        }
        async delete() {}
      },
    }));

    expect(() =>
      rateLimiter({
        maxRequests: 10,
        timeWindowSeconds: 60,
        store: { type: 'redis', url: 'redis://localhost:6379' },
      }),
    ).not.toThrow();

    vi.restoreAllMocks();
  });
});
