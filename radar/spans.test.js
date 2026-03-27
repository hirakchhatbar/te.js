import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSpanId, createSpanContext, buildSpanEvent } from './spans.js';

describe('createSpanId', () => {
  it('should return a 16-character hex string', () => {
    const id = createSpanId();
    assert.equal(typeof id, 'string');
    assert.equal(id.length, 16);
    assert.match(id, /^[0-9a-f]{16}$/);
  });

  it('should produce unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createSpanId()));
    assert.equal(ids.size, 100);
  });
});

describe('createSpanContext', () => {
  it('should create a context with traceId and rootSpanId', () => {
    const ctx = createSpanContext('abc123');
    assert.equal(ctx.traceId, 'abc123');
    assert.equal(typeof ctx.rootSpanId, 'string');
    assert.equal(ctx.rootSpanId.length, 16);
    assert.deepEqual(ctx.spans, []);
  });

  it('should accumulate spans via addSpan', () => {
    const ctx = createSpanContext('trace1');
    ctx.addSpan('middleware:auth', 'middleware', ctx.rootSpanId, 1000, 5, 200);
    ctx.addSpan('handler:GET /users', 'handler', ctx.rootSpanId, 1005, 20, 200);

    assert.equal(ctx.spans.length, 2);
    assert.equal(ctx.spans[0].name, 'middleware:auth');
    assert.equal(ctx.spans[0].type, 'middleware');
    assert.equal(ctx.spans[0].parentId, ctx.rootSpanId);
    assert.equal(ctx.spans[0].startMs, 1000);
    assert.equal(ctx.spans[0].durationMs, 5);
    assert.equal(ctx.spans[0].status, 200);
    assert.equal(ctx.spans[0].metadata, null);
  });

  it('should assign unique spanIds to each span', () => {
    const ctx = createSpanContext('trace2');
    ctx.addSpan('a', 'middleware', null, 0, 1, 200);
    ctx.addSpan('b', 'middleware', null, 1, 1, 200);
    assert.notEqual(ctx.spans[0].spanId, ctx.spans[1].spanId);
  });

  it('should accept optional metadata', () => {
    const ctx = createSpanContext('trace3');
    ctx.addSpan('db:query', 'other', null, 0, 10, 200, { query: 'SELECT 1' });
    assert.deepEqual(ctx.spans[0].metadata, { query: 'SELECT 1' });
  });

  it('should default parentId to null when not provided', () => {
    const ctx = createSpanContext('trace4');
    ctx.addSpan('root', 'handler', null, 0, 100, 200);
    assert.equal(ctx.spans[0].parentId, null);
  });
});

describe('buildSpanEvent', () => {
  it('should produce a collector-compatible event object', () => {
    const ctx = createSpanContext('trace-build');
    ctx.addSpan('middleware:cors', 'middleware', ctx.rootSpanId, 5000, 2, 200);
    const span = ctx.spans[0];

    const event = buildSpanEvent('my-api', ctx, span);

    assert.equal(event.type, 'span');
    assert.equal(event.projectName, 'my-api');
    assert.equal(event.traceId, 'trace-build');
    assert.equal(event.spanId, span.spanId);
    assert.equal(event.parentId, ctx.rootSpanId);
    assert.equal(event.name, 'middleware:cors');
    assert.equal(event.spanType, 'middleware');
    assert.equal(event.startMs, 5000);
    assert.equal(event.duration_ms, 2);
    assert.equal(event.status, 200);
    assert.equal(event.metadata, null);
  });

  it('should include metadata when present', () => {
    const ctx = createSpanContext('trace-meta');
    ctx.addSpan('db', 'other', null, 0, 10, 200, { table: 'users' });
    const event = buildSpanEvent('app', ctx, ctx.spans[0]);
    assert.deepEqual(event.metadata, { table: 'users' });
  });
});
