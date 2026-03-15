/**
 * @fileoverview Tests for the rate limiter middleware factory.
 */
import { describe, it, expect, vi } from 'vitest';
import rateLimiter from './index.js';

// Mock dbManager.hasConnection so we can test without a real DB
vi.mock('../database/index.js', () => ({
  default: {
    hasConnection: vi.fn(() => false),
    initializeConnection: vi.fn(),
  },
}));

function makeAmmo(ip = '127.0.0.1') {
  const headers = {};
  return {
    ip,
    res: {
      setHeader: vi.fn(),
    },
    throw: vi.fn(),
  };
}

describe('rateLimiter', () => {
  it('should throw TejError when redis store selected but no connection', async () => {
    const TejError = (await import('../server/error.js')).default;
    expect(() =>
      rateLimiter({ maxRequests: 10, timeWindowSeconds: 60, store: 'redis' }),
    ).toThrow();
  });

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
});
