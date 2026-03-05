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

    it('detects GET and HEAD when handler uses ammo.only("GET")', () => {
      const handler = (ammo) => {
        ammo.only('GET');
        ammo.fire({ status: 'ok' });
      };
      const detected = detectMethods(handler);
      expect(detected).toContain('GET');
      expect(detected).toContain('HEAD');
      expect(detected).toHaveLength(2);
    });

    it('detects POST and PUT when handler uses ammo.only("POST", "PUT")', () => {
      const handler = (ammo) => {
        ammo.only('POST', 'PUT');
        ammo.fire(200, {});
      };
      const detected = detectMethods(handler);
      expect(detected).toContain('POST');
      expect(detected).toContain('PUT');
      expect(detected).toHaveLength(2);
    });

    it('detects from ammo.only with double-quoted methods', () => {
      const handler = (ammo) => {
        ammo.only("GET");
        ammo.fire(200);
      };
      const detected = detectMethods(handler);
      expect(detected).toContain('GET');
      expect(detected).toContain('HEAD');
    });

    it('detects from .only with no space after comma', () => {
      const handler = (ammo) => {
        ammo.only('GET','POST');
        ammo.fire(200);
      };
      const detected = detectMethods(handler);
      expect(detected).toContain('GET');
      expect(detected).toContain('HEAD');
      expect(detected).toContain('POST');
      expect(detected).toHaveLength(3);
    });

    it('prefers ammo.only over property access when both present', () => {
      const handler = (ammo) => {
        ammo.only('POST');
        if (ammo.GET) ammo.fire(200);
        ammo.fire(201, {});
      };
      const detected = detectMethods(handler);
      expect(detected).toEqual(['POST']);
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
