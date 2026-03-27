import { randomBytes } from 'node:crypto';

/**
 * Generate a 16-character hex span ID (matches OpenTelemetry span ID length).
 *
 * @returns {string} 16-char lowercase hex string.
 */
export function createSpanId() {
  return randomBytes(8).toString('hex');
}

/**
 * @typedef {Object} CollectedSpan
 * @property {string}        spanId     Unique span identifier.
 * @property {string}        name       Human-readable span name (e.g. "middleware:auth").
 * @property {string}        type       Span type: "middleware", "handler", or "other".
 * @property {string|null}   parentId   Parent span ID, or null for root spans.
 * @property {number}        startMs    Unix epoch milliseconds when the span started.
 * @property {number}        durationMs Span duration in milliseconds.
 * @property {number}        status     HTTP status code (or 0 if unavailable).
 * @property {Object|null}   metadata   Optional key-value metadata.
 */

/**
 * @typedef {Object} SpanContext
 * @property {string}           traceId     Trace identifier (shared across all spans in a request).
 * @property {string}           rootSpanId  Span ID of the root span (the request itself).
 * @property {CollectedSpan[]}  spans       Accumulated spans for this request.
 * @property {function(string, string, string|null, number, number, number, Object=): void} addSpan
 */

/**
 * Create a span collection context to be stored in AsyncLocalStorage alongside
 * the traceId.  Middleware and handler instrumentation pushes spans here; the
 * radar middleware reads them at response finish time.
 *
 * @param {string} traceId  The trace identifier for this request.
 * @returns {SpanContext}
 */
export function createSpanContext(traceId) {
  const rootSpanId = createSpanId();

  /** @type {CollectedSpan[]} */
  const spans = [];

  /**
   * Record a completed span.
   *
   * @param {string}      name       Human-readable span name.
   * @param {string}      type       Span type ("middleware", "handler", "other").
   * @param {string|null} parentId   Parent span ID, or null for root.
   * @param {number}      startMs    Start time (Unix epoch ms).
   * @param {number}      durationMs Duration in milliseconds.
   * @param {number}      status     HTTP status code.
   * @param {Object}      [metadata] Optional metadata object.
   */
  function addSpan(
    name,
    type,
    parentId,
    startMs,
    durationMs,
    status,
    metadata,
  ) {
    spans.push({
      spanId: createSpanId(),
      name,
      type,
      parentId: parentId ?? null,
      startMs,
      durationMs,
      status,
      metadata: metadata ?? null,
    });
  }

  return { traceId, rootSpanId, spans, addSpan };
}

/**
 * Convert a collected span into the event shape expected by the Radar
 * collector's `SpanEvent` (Rust serde struct).
 *
 * @param {string}        projectName  Project identifier sent with every event.
 * @param {SpanContext}    ctx          The span context holding the traceId.
 * @param {CollectedSpan}  span        The span to convert.
 * @returns {Object} Collector-compatible span event object.
 */
export function buildSpanEvent(projectName, ctx, span) {
  return {
    type: 'span',
    projectName,
    traceId: ctx.traceId,
    spanId: span.spanId,
    parentId: span.parentId,
    name: span.name,
    spanType: span.type,
    startMs: span.startMs,
    duration_ms: span.durationMs,
    status: span.status,
    metadata: span.metadata,
  };
}
