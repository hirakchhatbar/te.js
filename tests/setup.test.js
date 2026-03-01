/**
 * Smoke test to verify Vitest setup and test helpers work correctly
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  createMockPair,
  createJsonRequest,
} from './helpers/mock-http.js';
import { createMockStorage, sleep } from './helpers/test-utils.js';

describe('Test Infrastructure Setup', () => {
  describe('Vitest Configuration', () => {
    it('should have vitest globals available', () => {
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
      expect(vi).toBeDefined();
    });

    it('should support async/await', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });

    it('should support vi.fn() mocking', () => {
      const mockFn = vi.fn(() => 'mocked');
      expect(mockFn()).toBe('mocked');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mock HTTP Request', () => {
    it('should create a mock request with defaults', () => {
      const req = createMockRequest();

      expect(req.method).toBe('GET');
      expect(req.url).toBe('/');
      expect(req.headers).toBeDefined();
      expect(req.socket).toBeDefined();
      expect(req.socket.remoteAddress).toBe('127.0.0.1');
    });

    it('should create a mock request with custom options', () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        ip: '192.168.1.1',
      });

      expect(req.method).toBe('POST');
      expect(req.url).toBe('/api/users');
      expect(req.headers['content-type']).toBe('application/json');
      expect(req.socket.remoteAddress).toBe('192.168.1.1');
    });

    it('should create a JSON request with proper headers', () => {
      const req = createJsonRequest({ method: 'POST', url: '/api/data' });

      expect(req.headers['content-type']).toBe('application/json');
      expect(req.headers['accept']).toBe('application/json');
    });
  });

  describe('Mock HTTP Response', () => {
    it('should create a mock response with defaults', () => {
      const res = createMockResponse();

      expect(res.statusCode).toBe(200);
      expect(res.headers).toEqual({});
      expect(res.headersSent).toBe(false);
      expect(res.finished).toBe(false);
    });

    it('should support writeHead', () => {
      const res = createMockResponse();
      res.writeHead(201, { 'Content-Type': 'application/json' });

      expect(res.statusCode).toBe(201);
      expect(res.headers['content-type']).toBe('application/json');
      expect(res.headersSent).toBe(true);
    });

    it('should support write and end', () => {
      const res = createMockResponse();
      res.write('Hello');
      res.write(' World');
      res.end();

      expect(res.getBody()).toBe('Hello World');
      expect(res.finished).toBe(true);
    });

    it('should parse JSON body', () => {
      const res = createMockResponse();
      res.write(JSON.stringify({ message: 'success' }));
      res.end();

      expect(res.getJsonBody()).toEqual({ message: 'success' });
    });
  });

  describe('Mock Request/Response Pair', () => {
    it('should create paired req/res objects', () => {
      const { req, res } = createMockPair({ method: 'DELETE', url: '/item/1' });

      expect(req.method).toBe('DELETE');
      expect(req.url).toBe('/item/1');
      expect(res).toBeDefined();
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Mock Storage', () => {
    it('should support basic operations', () => {
      const storage = createMockStorage();

      storage.set('key1', 'value1');
      expect(storage.get('key1')).toBe('value1');

      storage.delete('key1');
      expect(storage.get('key1')).toBeUndefined();
    });

    it('should support increment/decrement', () => {
      const storage = createMockStorage();

      storage.set('counter', 0);
      expect(storage.increment('counter')).toBe(1);
      expect(storage.increment('counter', 5)).toBe(6);
      expect(storage.decrement('counter', 2)).toBe(4);
    });
  });

  describe('Utility Functions', () => {
    it('should support sleep', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });
});


