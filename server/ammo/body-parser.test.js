/**
 * @fileoverview Tests for body-parser (JSON, URL-encoded, multipart).
 */
import { describe, it, expect } from 'vitest';
import parseDataBasedOnContentType, { BodyParserError } from './body-parser.js';
import { MockRequest } from '../../tests/helpers/mock-http.js';

function makeReq(contentType, body) {
  const req = new MockRequest({
    method: 'POST',
    headers: contentType ? { 'content-type': contentType } : {},
  });
  // Schedule body emission after current tick
  setImmediate(() => req.simulateBody(body || ''));
  return req;
}

describe('parseDataBasedOnContentType', () => {
  it('should return empty object when no content-type', async () => {
    const req = new MockRequest({ method: 'POST', headers: {} });
    const result = await parseDataBasedOnContentType(req);
    expect(result).toEqual({});
  });

  it('should parse JSON body', async () => {
    const req = makeReq('application/json', JSON.stringify({ name: 'Tejas' }));
    const result = await parseDataBasedOnContentType(req);
    expect(result).toEqual({ name: 'Tejas' });
  });

  it('should return empty object for empty JSON body', async () => {
    const req = makeReq('application/json', '');
    const result = await parseDataBasedOnContentType(req);
    expect(result).toEqual({});
  });

  it('should reject on invalid JSON', async () => {
    const req = makeReq('application/json', '{not valid json}');
    await expect(parseDataBasedOnContentType(req)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it('should parse URL-encoded body', async () => {
    const req = makeReq(
      'application/x-www-form-urlencoded',
      'name=Alice&age=30',
    );
    const result = await parseDataBasedOnContentType(req);
    expect(result.name).toBe('Alice');
    expect(result.age).toBe('30');
  });

  it('should throw BodyParserError for unsupported content type', async () => {
    const req = new MockRequest({
      method: 'POST',
      headers: { 'content-type': 'text/xml' },
    });
    setImmediate(() => req.simulateBody('<xml/>'));
    await expect(parseDataBasedOnContentType(req)).rejects.toBeInstanceOf(
      BodyParserError,
    );
  });
});

describe('BodyParserError', () => {
  it('should extend TejError', async () => {
    const TejError = (await import('../error.js')).default;
    const err = new BodyParserError('Bad body', 400);
    expect(err).toBeInstanceOf(TejError);
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('BodyParserError');
  });

  it('should default statusCode to 400', () => {
    const err = new BodyParserError('Bad body');
    expect(err.statusCode).toBe(400);
  });
});
