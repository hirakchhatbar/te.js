import { describe, it, expect } from 'vitest';
import { createSpanId, createSpanContext, buildSpanEvent } from './spans.js';

describe('createSpanId', () => {
  it('should return a 16-character hex string', () => {
    const id = createSpanId();
    expect(typeof id).toBe('string');
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should produce unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createSpanId()));
    expect(ids.size).toBe(100);
  });
});

describe('createSpanContext', () => {
  it('should create a context with traceId and rootSpanId', () => {
    const ctx = createSpanContext('abc123');
    expect(ctx.traceId).toBe('abc123');
    expect(typeof ctx.rootSpanId).toBe('string');
    expect(ctx.rootSpanId).toHaveLength(16);
    expect(ctx.spans).toEqual([]);
  });

  it('should accumulate spans via addSpan', () => {
    const ctx = createSpanContext('trace1');
    ctx.addSpan('middleware:auth', 'middleware', ctx.rootSpanId, 1000, 5, 200);
    ctx.addSpan('handler:GET /users', 'handler', ctx.rootSpanId, 1005, 20, 200);

    expect(ctx.spans).toHaveLength(2);
    expect(ctx.spans[0].name).toBe('middleware:auth');
    expect(ctx.spans[0].type).toBe('middleware');
    expect(ctx.spans[0].parentId).toBe(ctx.rootSpanId);
    expect(ctx.spans[0].startMs).toBe(1000);
    expect(ctx.spans[0].durationMs).toBe(5);
    expect(ctx.spans[0].status).toBe(200);
    expect(ctx.spans[0].metadata).toBeNull();
  });

  it('should assign unique spanIds to each span', () => {
    const ctx = createSpanContext('trace2');
    ctx.addSpan('a', 'middleware', null, 0, 1, 200);
    ctx.addSpan('b', 'middleware', null, 1, 1, 200);
    expect(ctx.spans[0].spanId).not.toBe(ctx.spans[1].spanId);
  });

  it('should accept optional metadata', () => {
    const ctx = createSpanContext('trace3');
    ctx.addSpan('db:query', 'other', null, 0, 10, 200, { query: 'SELECT 1' });
    expect(ctx.spans[0].metadata).toEqual({ query: 'SELECT 1' });
  });

  it('should default parentId to null when not provided', () => {
    const ctx = createSpanContext('trace4');
    ctx.addSpan('root', 'handler', null, 0, 100, 200);
    expect(ctx.spans[0].parentId).toBeNull();
  });
});

describe('buildSpanEvent', () => {
  it('should produce a collector-compatible event object', () => {
    const ctx = createSpanContext('trace-build');
    ctx.addSpan('middleware:cors', 'middleware', ctx.rootSpanId, 5000, 2, 200);
    const span = ctx.spans[0];

    const event = buildSpanEvent('my-api', ctx, span);

    expect(event.type).toBe('span');
    expect(event.projectName).toBe('my-api');
    expect(event.traceId).toBe('trace-build');
    expect(event.spanId).toBe(span.spanId);
    expect(event.parentId).toBe(ctx.rootSpanId);
    expect(event.name).toBe('middleware:cors');
    expect(event.spanType).toBe('middleware');
    expect(event.startMs).toBe(5000);
    expect(event.duration_ms).toBe(2);
    expect(event.status).toBe(200);
    expect(event.metadata).toBeNull();
  });

  it('should include metadata when present', () => {
    const ctx = createSpanContext('trace-meta');
    ctx.addSpan('db', 'other', null, 0, 10, 200, { table: 'users' });
    const event = buildSpanEvent('app', ctx, ctx.spans[0]);
    expect(event.metadata).toEqual({ table: 'users' });
  });
});
