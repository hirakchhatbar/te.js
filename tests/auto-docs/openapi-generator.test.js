/**
 * Unit tests for auto-docs openapi/generator pure functions.
 */
import { describe, it, expect } from 'vitest';
import {
  toOpenAPIPath,
  getPathParameters,
  getQueryParameters,
  buildSchemaFromMetadata,
  buildResponses,
  buildOperation,
  mergeMetadata,
} from '../../auto-docs/openapi/generator.js';

describe('openapi-generator', () => {
  describe('toOpenAPIPath', () => {
    it('converts :param to {param}', () => {
      expect(toOpenAPIPath('/users/:id')).toBe('/users/{id}');
    });
    it('converts multiple params', () => {
      expect(toOpenAPIPath('/users/:userId/posts/:postId')).toBe('/users/{userId}/posts/{postId}');
    });
    it('returns / for empty or non-string', () => {
      expect(toOpenAPIPath('')).toBe('/');
      expect(toOpenAPIPath(null)).toBe('/');
    });
  });

  describe('getPathParameters', () => {
    it('extracts path params from te.js path', () => {
      const params = getPathParameters('/users/:id');
      expect(params).toHaveLength(1);
      expect(params[0]).toMatchObject({ name: 'id', in: 'path', required: true, schema: { type: 'string' } });
    });
    it('returns empty array for path without params', () => {
      expect(getPathParameters('/users')).toEqual([]);
    });
  });

  describe('getQueryParameters', () => {
    it('builds query params from metadata', () => {
      const queryMeta = { limit: { type: 'integer', required: false }, q: { type: 'string', required: true } };
      const params = getQueryParameters(queryMeta);
      expect(params).toHaveLength(2);
      expect(params.find((p) => p.name === 'limit')).toMatchObject({ in: 'query', required: false });
      expect(params.find((p) => p.name === 'q')).toMatchObject({ in: 'query', required: true });
    });
    it('returns empty array for invalid meta', () => {
      expect(getQueryParameters(null)).toEqual([]);
    });
  });

  describe('buildSchemaFromMetadata', () => {
    it('builds OpenAPI schema from field meta', () => {
      const meta = { name: { type: 'string' }, email: { type: 'string', format: 'email', required: true } };
      const schema = buildSchemaFromMetadata(meta);
      expect(schema.type).toBe('object');
      expect(schema.properties.name.type).toBe('string');
      expect(schema.properties.email.format).toBe('email');
      expect(schema.required).toContain('email');
    });
  });

  describe('buildResponses', () => {
    it('returns 200 Success when responseMeta empty', () => {
      const r = buildResponses(null);
      expect(r['200']).toEqual({ description: 'Success' });
    });
    it('builds responses from metadata', () => {
      const meta = { 200: { description: 'OK' }, 201: { description: 'Created' } };
      const r = buildResponses(meta);
      expect(r['200'].description).toBe('OK');
      expect(r['201'].description).toBe('Created');
    });
  });

  describe('buildOperation', () => {
    it('builds operation with summary and responses', () => {
      const meta = { summary: 'Get user', response: { 200: { description: 'OK' } } };
      const pathParams = [];
      const op = buildOperation('get', meta, pathParams);
      expect(op.summary).toBe('Get user');
      expect(op.responses['200'].description).toBe('OK');
    });
  });

  describe('mergeMetadata', () => {
    it('prefers explicit when preferEnhanced false', () => {
      const explicit = { summary: 'A', description: 'B' };
      const enhanced = { summary: 'C', description: 'D' };
      const merged = mergeMetadata(explicit, enhanced, { preferEnhanced: false });
      expect(merged.summary).toBe('A');
      expect(merged.description).toBe('B');
    });
    it('prefers enhanced when preferEnhanced true', () => {
      const explicit = { summary: 'A' };
      const enhanced = { summary: 'C', description: 'D' };
      const merged = mergeMetadata(explicit, enhanced, { preferEnhanced: true });
      expect(merged.summary).toBe('C');
      expect(merged.description).toBe('D');
    });
  });
});
