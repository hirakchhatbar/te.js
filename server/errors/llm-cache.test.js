import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMErrorCache, getCache } from './llm-cache.js';

describe('LLMErrorCache', () => {
  describe('constructor', () => {
    it('uses provided ttl', () => {
      const cache = new LLMErrorCache(5000);
      expect(cache.ttl).toBe(5000);
    });

    it('defaults to 3600000 for invalid ttl', () => {
      expect(new LLMErrorCache(0).ttl).toBe(3_600_000);
      expect(new LLMErrorCache(-1).ttl).toBe(3_600_000);
    });
  });

  describe('buildKey()', () => {
    it('builds key from first snippet file, line, and error message', () => {
      const cache = new LLMErrorCache(1000);
      const codeContext = {
        snippets: [{ file: '/app/routes/users.js', line: 42 }],
      };
      const error = new Error('User not found');
      const key = cache.buildKey(codeContext, error);
      expect(key).toBe('/app/routes/users.js:42:User not found');
    });

    it('handles string error', () => {
      const cache = new LLMErrorCache(1000);
      const codeContext = { snippets: [{ file: '/app/handler.js', line: 10 }] };
      const key = cache.buildKey(codeContext, 'Validation failed');
      expect(key).toBe('/app/handler.js:10:Validation failed');
    });

    it('handles no error (empty string suffix)', () => {
      const cache = new LLMErrorCache(1000);
      const codeContext = { snippets: [{ file: '/app/handler.js', line: 5 }] };
      const key = cache.buildKey(codeContext, undefined);
      expect(key).toBe('/app/handler.js:5:');
    });

    it('uses "unknown" when codeContext has no snippets', () => {
      const cache = new LLMErrorCache(1000);
      const key = cache.buildKey({ snippets: [] }, new Error('oops'));
      expect(key).toBe('unknown:oops');
    });

    it('uses "unknown" when codeContext is missing', () => {
      const cache = new LLMErrorCache(1000);
      const key = cache.buildKey(null, new Error('oops'));
      expect(key).toBe('unknown:oops');
    });
  });

  describe('set() and get()', () => {
    it('stores and retrieves a result', () => {
      const cache = new LLMErrorCache(10_000);
      cache.set('key1', { statusCode: 404, message: 'Not found' });
      const result = cache.get('key1');
      expect(result).toEqual({ statusCode: 404, message: 'Not found' });
    });

    it('returns null for missing keys', () => {
      const cache = new LLMErrorCache(10_000);
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('does not return cachedAt in the result', () => {
      const cache = new LLMErrorCache(10_000);
      cache.set('key1', { statusCode: 500, message: 'Error' });
      const result = cache.get('key1');
      expect(result).not.toHaveProperty('cachedAt');
    });

    it('includes devInsight when stored', () => {
      const cache = new LLMErrorCache(10_000);
      cache.set('key1', {
        statusCode: 404,
        message: 'Not found',
        devInsight: 'Check the ID param.',
      });
      const result = cache.get('key1');
      expect(result.devInsight).toBe('Check the ID param.');
    });
  });

  describe('TTL expiry', () => {
    it('returns null for expired entries', () => {
      vi.useFakeTimers();

      const cache = new LLMErrorCache(1000);
      cache.set('key1', { statusCode: 404, message: 'Not found' });
      expect(cache.get('key1')).not.toBeNull();

      vi.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeNull();

      vi.useRealTimers();
    });

    it('removes expired entry from the store on access', () => {
      vi.useFakeTimers();

      const cache = new LLMErrorCache(500);
      cache.set('key1', { statusCode: 500, message: 'Error' });
      expect(cache.size).toBe(1);

      vi.advanceTimersByTime(600);
      cache.get('key1');

      expect(cache.size).toBe(0);

      vi.useRealTimers();
    });

    it('non-expired entries remain accessible', () => {
      vi.useFakeTimers();

      const cache = new LLMErrorCache(5000);
      cache.set('key1', { statusCode: 200, message: 'OK' });

      vi.advanceTimersByTime(4999);

      expect(cache.get('key1')).not.toBeNull();

      vi.useRealTimers();
    });
  });

  describe('size', () => {
    it('tracks the number of entries', () => {
      const cache = new LLMErrorCache(10_000);
      expect(cache.size).toBe(0);
      cache.set('a', { statusCode: 200, message: 'OK' });
      cache.set('b', { statusCode: 404, message: 'Not found' });
      expect(cache.size).toBe(2);
    });
  });
});

describe('getCache (singleton)', () => {
  it('returns a LLMErrorCache instance', () => {
    const cache = getCache(3600000);
    expect(cache).toBeInstanceOf(LLMErrorCache);
  });

  it('returns same instance for same ttl', () => {
    const a = getCache(3600000);
    const b = getCache(3600000);
    expect(a).toBe(b);
  });

  it('creates a new instance when ttl changes', () => {
    const a = getCache(1000);
    const b = getCache(2000);
    expect(a).not.toBe(b);
    expect(b.ttl).toBe(2000);
  });
});
