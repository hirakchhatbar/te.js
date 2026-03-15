/**
 * @fileoverview Tests for TejError base class.
 */
import { describe, it, expect } from 'vitest';
import TejError from './error.js';

describe('TejError', () => {
  it('should set statusCode and derive ERR_HTTP_* code', () => {
    const err = new TejError(404, 'Not Found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('ERR_HTTP_404');
    expect(err.message).toBe('Not Found');
    expect(err.name).toBe('TejError');
  });

  it('should capture a stack trace', () => {
    const err = new TejError(500, 'Internal Server Error');
    expect(typeof err.stack).toBe('string');
    expect(err.stack).toContain('TejError');
  });

  it('should support native cause chaining', () => {
    const cause = new Error('original');
    const err = new TejError(500, 'Wrapped', { cause });
    expect(err.cause).toBe(cause);
  });

  it('should extend Error', () => {
    const err = new TejError(400, 'Bad Request');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have frozen CODES constant', () => {
    expect(Object.isFrozen(TejError.CODES)).toBe(true);
    expect(TejError.CODES.ERR_ROUTING_FAILED).toBe('ERR_ROUTING_FAILED');
    expect(TejError.CODES.ERR_NOT_FOUND).toBe('ERR_HTTP_404');
  });

  it('should derive correct codes for common statuses', () => {
    expect(new TejError(400, '').code).toBe('ERR_HTTP_400');
    expect(new TejError(401, '').code).toBe('ERR_HTTP_401');
    expect(new TejError(403, '').code).toBe('ERR_HTTP_403');
    expect(new TejError(500, '').code).toBe('ERR_HTTP_500');
  });
});
