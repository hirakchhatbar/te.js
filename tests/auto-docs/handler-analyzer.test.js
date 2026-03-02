/**
 * Unit tests for auto-docs handler-analyzer (detectMethods, analyzeHandler).
 */
import { describe, it, expect } from 'vitest';
import { detectMethods, analyzeHandler, ALL_METHODS } from '../../auto-docs/analysis/handler-analyzer.js';

describe('handler-analyzer', () => {
  describe('detectMethods', () => {
    it('returns all methods when handler is not a function', () => {
      expect(detectMethods(null)).toEqual(ALL_METHODS);
      expect(detectMethods(undefined)).toEqual(ALL_METHODS);
    });

    it('detects GET when handler uses ammo.GET', () => {
      const handler = (ammo) => { if (ammo.GET) ammo.fire(200, {}); };
      expect(detectMethods(handler)).toContain('GET');
    });

    it('detects POST and GET when handler checks both', () => {
      const handler = (ammo) => {
        if (ammo.GET) ammo.fire(200, {});
        if (ammo.POST) ammo.fire(201, {});
      };
      const detected = detectMethods(handler);
      expect(detected).toContain('GET');
      expect(detected).toContain('POST');
    });

    it('returns all methods when no method checks found (method-agnostic)', () => {
      const handler = () => {};
      expect(detectMethods(handler)).toEqual(ALL_METHODS);
    });
  });

  describe('analyzeHandler', () => {
    it('returns object with methods array', () => {
      const handler = (ammo) => { if (ammo.GET) ammo.fire(200); };
      const result = analyzeHandler(handler);
      expect(result).toHaveProperty('methods');
      expect(Array.isArray(result.methods)).toBe(true);
      expect(result.methods).toContain('GET');
    });
  });
});
