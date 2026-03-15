import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMRateLimiter, getRateLimiter } from './llm-rate-limiter.js';

describe('LLMRateLimiter', () => {
  describe('constructor', () => {
    it('uses provided maxPerMinute', () => {
      const limiter = new LLMRateLimiter(5);
      expect(limiter.maxPerMinute).toBe(5);
    });

    it('defaults to 10 when maxPerMinute is invalid', () => {
      expect(new LLMRateLimiter(0).maxPerMinute).toBe(10);
      expect(new LLMRateLimiter(-1).maxPerMinute).toBe(10);
    });

    it('floors non-integer values', () => {
      expect(new LLMRateLimiter(4.9).maxPerMinute).toBe(4);
    });
  });

  describe('canCall() and record()', () => {
    it('allows calls when under the limit', () => {
      const limiter = new LLMRateLimiter(3);
      expect(limiter.canCall()).toBe(true);
    });

    it('blocks calls when at the limit', () => {
      const limiter = new LLMRateLimiter(2);
      limiter.record();
      limiter.record();
      expect(limiter.canCall()).toBe(false);
    });

    it('allows calls again after recording up to max', () => {
      const limiter = new LLMRateLimiter(1);
      expect(limiter.canCall()).toBe(true);
      limiter.record();
      expect(limiter.canCall()).toBe(false);
    });

    it('remaining() returns correct count', () => {
      const limiter = new LLMRateLimiter(3);
      expect(limiter.remaining()).toBe(3);
      limiter.record();
      expect(limiter.remaining()).toBe(2);
      limiter.record();
      expect(limiter.remaining()).toBe(1);
      limiter.record();
      expect(limiter.remaining()).toBe(0);
    });
  });

  describe('sliding window pruning', () => {
    it('expires old timestamps after 60 seconds', () => {
      vi.useFakeTimers();

      const limiter = new LLMRateLimiter(2);
      limiter.record();
      limiter.record();
      expect(limiter.canCall()).toBe(false);

      vi.advanceTimersByTime(61_000);

      expect(limiter.canCall()).toBe(true);

      vi.useRealTimers();
    });

    it('only expires timestamps older than 60 seconds', () => {
      vi.useFakeTimers();

      const limiter = new LLMRateLimiter(2);
      limiter.record();

      vi.advanceTimersByTime(50_000);
      limiter.record();

      vi.advanceTimersByTime(15_000);
      expect(limiter.canCall()).toBe(true);
      expect(limiter.remaining()).toBe(1);

      vi.useRealTimers();
    });
  });
});

describe('getRateLimiter (singleton)', () => {
  it('returns a LLMRateLimiter instance', () => {
    const limiter = getRateLimiter(10);
    expect(limiter).toBeInstanceOf(LLMRateLimiter);
  });

  it('returns same instance for same maxPerMinute', () => {
    const a = getRateLimiter(10);
    const b = getRateLimiter(10);
    expect(a).toBe(b);
  });

  it('creates a new instance when maxPerMinute changes', () => {
    const a = getRateLimiter(5);
    const b = getRateLimiter(15);
    expect(a).not.toBe(b);
    expect(b.maxPerMinute).toBe(15);
  });
});
