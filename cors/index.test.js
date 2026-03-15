/**
 * @fileoverview Tests for CORS middleware.
 */
import { describe, it, expect, vi } from 'vitest';
import corsMiddleware from './index.js';

function makeAmmo(method = 'GET', origin = 'https://example.com') {
  const headers = {};
  return {
    req: { method, headers: { origin } },
    res: {
      _headers: {},
      setHeader(name, value) {
        this._headers[name.toLowerCase()] = value;
      },
      writeHead(code) {
        this._status = code;
      },
      end() {
        this._ended = true;
      },
    },
  };
}

describe('corsMiddleware', () => {
  it('should set Access-Control-Allow-Origin to * by default', async () => {
    const mw = corsMiddleware();
    const ammo = makeAmmo();
    const next = vi.fn();
    await mw(ammo, next);
    expect(ammo.res._headers['access-control-allow-origin']).toBe('*');
    expect(next).toHaveBeenCalled();
  });

  it('should respond 204 and not call next for OPTIONS preflight', async () => {
    const mw = corsMiddleware();
    const ammo = makeAmmo('OPTIONS');
    const next = vi.fn();
    await mw(ammo, next);
    expect(ammo.res._status).toBe(204);
    expect(ammo.res._ended).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow specific origin from array', async () => {
    const mw = corsMiddleware({ origin: ['https://example.com'] });
    const ammo = makeAmmo('GET', 'https://example.com');
    const next = vi.fn();
    await mw(ammo, next);
    expect(ammo.res._headers['access-control-allow-origin']).toBe(
      'https://example.com',
    );
  });

  it('should block origins not in array', async () => {
    const mw = corsMiddleware({ origin: ['https://example.com'] });
    const ammo = makeAmmo('GET', 'https://evil.com');
    const next = vi.fn();
    await mw(ammo, next);
    expect(ammo.res._headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should set Access-Control-Max-Age when maxAge provided', async () => {
    const mw = corsMiddleware({ maxAge: 86400 });
    const ammo = makeAmmo();
    const next = vi.fn();
    await mw(ammo, next);
    expect(ammo.res._headers['access-control-max-age']).toBe('86400');
  });

  it('should set Access-Control-Allow-Credentials when credentials=true', async () => {
    const mw = corsMiddleware({
      credentials: true,
      origin: 'https://example.com',
    });
    const ammo = makeAmmo('GET', 'https://example.com');
    const next = vi.fn();
    await mw(ammo, next);
    expect(ammo.res._headers['access-control-allow-credentials']).toBe('true');
  });
});
