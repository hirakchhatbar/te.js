import { describe, it, expect, vi } from 'vitest';
import { getChannels, buildPayload } from './index.js';
import { ConsoleChannel } from './console.js';
import { LogChannel } from './log.js';

describe('getChannels()', () => {
  it('returns a ConsoleChannel for "console"', () => {
    const channels = getChannels('console', './test.log');
    expect(channels).toHaveLength(1);
    expect(channels[0]).toBeInstanceOf(ConsoleChannel);
  });

  it('returns a LogChannel for "log"', () => {
    const channels = getChannels('log', './test.log');
    expect(channels).toHaveLength(1);
    expect(channels[0]).toBeInstanceOf(LogChannel);
  });

  it('returns both channels for "both"', () => {
    const channels = getChannels('both', './test.log');
    expect(channels).toHaveLength(2);
    const types = channels.map((c) => c.constructor.name);
    expect(types).toContain('ConsoleChannel');
    expect(types).toContain('LogChannel');
  });

  it('defaults to ConsoleChannel for unknown values', () => {
    const channels = getChannels('unknown', './test.log');
    expect(channels).toHaveLength(1);
    expect(channels[0]).toBeInstanceOf(ConsoleChannel);
  });

  it('returns same ConsoleChannel singleton across calls', () => {
    const a = getChannels('console', './test.log')[0];
    const b = getChannels('console', './test.log')[0];
    expect(a).toBe(b);
  });

  it('LogChannel uses the provided logFile path', () => {
    const channels = getChannels('log', './my-errors.log');
    expect(channels[0].logFile).toBe('./my-errors.log');
  });
});

describe('buildPayload()', () => {
  const codeContext = {
    snippets: [
      { file: '/app/handler.js', line: 10, snippet: '→ ammo.throw()' },
    ],
  };

  it('builds a complete payload', () => {
    const payload = buildPayload({
      method: 'POST',
      path: '/users',
      originalError: new Error('DB error'),
      codeContext,
      statusCode: 500,
      message: 'Internal Server Error',
      devInsight: 'DB connection may be down.',
    });

    expect(payload.method).toBe('POST');
    expect(payload.path).toBe('/users');
    expect(payload.statusCode).toBe(500);
    expect(payload.message).toBe('Internal Server Error');
    expect(payload.devInsight).toBe('DB connection may be down.');
    expect(payload.error).toEqual({ type: 'Error', message: 'DB error' });
    expect(payload.codeContext).toBe(codeContext);
    expect(typeof payload.timestamp).toBe('string');
    expect(() => new Date(payload.timestamp)).not.toThrow();
  });

  it('handles string error', () => {
    const payload = buildPayload({
      method: 'GET',
      path: '/items',
      originalError: 'Not found',
      codeContext,
      statusCode: 404,
      message: 'Not found',
    });
    expect(payload.error).toEqual({ type: 'string', message: 'Not found' });
  });

  it('sets error to null when no originalError', () => {
    const payload = buildPayload({
      method: 'GET',
      path: '/',
      originalError: null,
      codeContext,
      statusCode: 500,
      message: 'Error',
    });
    expect(payload.error).toBeNull();
  });

  it('includes cached flag when provided', () => {
    const payload = buildPayload({
      method: 'GET',
      path: '/',
      originalError: null,
      codeContext,
      statusCode: 404,
      message: 'Not found',
      cached: true,
    });
    expect(payload.cached).toBe(true);
  });

  it('includes rateLimited flag when provided', () => {
    const payload = buildPayload({
      method: 'GET',
      path: '/',
      originalError: null,
      codeContext,
      statusCode: 500,
      message: 'Error',
      rateLimited: true,
    });
    expect(payload.rateLimited).toBe(true);
  });

  it('omits cached and rateLimited when not provided', () => {
    const payload = buildPayload({
      method: 'GET',
      path: '/',
      originalError: null,
      codeContext,
      statusCode: 200,
      message: 'OK',
    });
    expect(payload).not.toHaveProperty('cached');
    expect(payload).not.toHaveProperty('rateLimited');
  });

  it('omits devInsight when not provided', () => {
    const payload = buildPayload({
      method: 'GET',
      path: '/',
      originalError: null,
      codeContext,
      statusCode: 500,
      message: 'Error',
    });
    expect(payload).not.toHaveProperty('devInsight');
  });
});
