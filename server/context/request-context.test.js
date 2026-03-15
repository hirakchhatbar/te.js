/**
 * @fileoverview Tests for request-context (AsyncLocalStorage).
 */
import { describe, it, expect } from 'vitest';
import {
  requestContext,
  getRequestId,
  getRequestStore,
  contextMiddleware,
} from './request-context.js';

describe('requestContext', () => {
  it('should return "no-context" when called outside a request', () => {
    expect(getRequestId()).toBe('no-context');
  });

  it('should return undefined store outside a request', () => {
    expect(getRequestStore()).toBeUndefined();
  });

  it('should provide requestId within contextMiddleware', async () => {
    const results = [];
    const next = async () => {
      results.push(getRequestId());
    };
    await contextMiddleware({}, next);
    expect(results).toHaveLength(1);
    expect(typeof results[0]).toBe('string');
    expect(results[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should provide startTime within contextMiddleware', async () => {
    const before = Date.now();
    let store;
    await contextMiddleware({}, async () => {
      store = getRequestStore();
    });
    expect(store.startTime).toBeGreaterThanOrEqual(before);
  });

  it('each request should have unique requestId', async () => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
      await contextMiddleware({}, async () => {
        ids.push(getRequestId());
      });
    }
    const unique = new Set(ids);
    expect(unique.size).toBe(5);
  });
});
