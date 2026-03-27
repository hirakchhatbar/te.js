import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
import { AsyncLocalStorage } from 'node:async_hooks';
import TejLogger from 'tej-logger';
import { getErrorsLlmConfig } from '../utils/errors-llm-config.js';
import { createSpanContext, buildSpanEvent } from './spans.js';

const logger = new TejLogger('Tejas.Radar');

/**
 * AsyncLocalStorage instance for propagating trace context across async
 * boundaries within a single request.  Middleware sets `{ traceId }` on
 * entry; downstream code can read it via `traceStore.getStore()?.traceId`.
 */
export const traceStore = new AsyncLocalStorage();

/**
 * Attempt to read the `name` field from the nearest package.json at startup.
 * Returns null if the file cannot be read or parsed.
 * @returns {Promise<string|null>}
 */
async function readPackageJsonName() {
  try {
    const raw = await readFile(join(process.cwd(), 'package.json'), 'utf8');
    return JSON.parse(raw).name ?? null;
  } catch (err) {
    logger.warn(`Could not read package.json name: ${err?.message ?? err}`);
    return null;
  }
}

/**
 * Recursively walk a plain object/array and replace the value of any key whose
 * lowercase name appears in `blocklist` with the string `"*"`.  Returns a new
 * deep-cloned structure; the original is never mutated.
 *
 * Non-object values (strings, numbers, null, …) are returned as-is.
 *
 * @param {unknown} value
 * @param {Set<string>} blocklist  Lower-cased field names to mask.
 * @returns {unknown}
 */
function deepMask(value, blocklist) {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => deepMask(item, blocklist));
  }

  const result = Object.create(null);
  for (const [k, v] of Object.entries(value)) {
    result[k] = blocklist.has(k.toLowerCase()) ? '*' : deepMask(v, blocklist);
  }
  return result;
}

/**
 * Build the headers object to include in the metric record based on the
 * `capture.headers` configuration value:
 *   - `false`      → null (default; nothing sent)
 *   - `true`       → shallow copy of all headers
 *   - `string[]`   → object containing only the listed header names
 *
 * @param {Record<string, string>|undefined} rawHeaders
 * @param {boolean|string[]} captureHeaders
 * @returns {Record<string, string>|null}
 */
function buildHeaders(rawHeaders, captureHeaders) {
  if (!captureHeaders || !rawHeaders) return null;
  if (captureHeaders === true) return { ...rawHeaders };
  return Object.fromEntries(
    captureHeaders
      .map((k) => [k, rawHeaders[k.toLowerCase()]])
      .filter(([, v]) => v != null),
  );
}

/**
 * Attempt to parse a JSON string. Returns the parsed value on success, or
 * `null` on failure.  Used for response bodies which may not always be JSON.
 *
 * @param {string|undefined|null} raw
 * @returns {unknown}
 */
function parseJsonSafe(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    logger.warn(`parseJsonSafe: JSON parse failed — ${err?.message ?? err}`);
    return null;
  }
}

const MAX_JSON_BLOB = 8 * 1024;

/**
 * Return `value` if its JSON-serialised size fits within the collector's
 * per-field blob limit, otherwise `null`.  Prevents oversized request/response
 * bodies from causing 422 rejections that drop the entire batch.
 */
function capJsonBlob(value) {
  if (value == null) return null;
  try {
    return JSON.stringify(value).length <= MAX_JSON_BLOB ? value : null;
  } catch {
    return null;
  }
}

/**
 * Factory that returns a te.js-compatible `(ammo, next)` middleware which
 * captures HTTP request metrics and forwards them to the Tejas Radar collector.
 *
 * @param {Object} [config]
 * @param {string} [config.apiKey]           Bearer token (rdr_xxx). Falls back to RADAR_API_KEY env. Required.
 * @param {string} [config.projectName]      Project identifier. Falls back to RADAR_PROJECT_NAME env, then package.json `name`, then "tejas-app".
 * @param {number} [config.flushInterval]    Milliseconds between periodic flushes (default 2000).
 * @param {number} [config.batchSize]        Flush immediately when batch reaches this size (default 100).
 * @param {number} [config.maxQueueSize]     Maximum events held in memory before oldest are dropped (default 10000).
 * @param {Function} [config.transport]      Custom transport `(events) => Promise<{ok, status}>`.
 *                                            Defaults to gzip-compressed HTTP POST to the collector.
 * @param {string[]} [config.ignore]         Request paths to skip (default ['/health']).
 * @param {string} [config.collectorUrl]     Radar collector URL. Falls back to RADAR_COLLECTOR_URL env, then "https://collector.usetejas.com".
 *                                            A future release will support self-hosted Radar collectors.
 * @param {Object}  [config.capture]         Controls what additional data is captured beyond metrics.
 * @param {boolean} [config.capture.request]          Capture and send request body (default false).
 * @param {boolean} [config.capture.response]         Capture and send response body (default false).
 * @param {boolean|string[]} [config.capture.headers] Capture request headers. `true` sends all headers;
 *                                                     a `string[]` sends only the named headers (allowlist);
 *                                                     `false` (default) sends nothing.
 * @param {boolean} [config.capture.logs=false]        Forward TejLogger calls to the collector as app-level
 *                                                     log events. Off by default.
 * @param {string[]} [config.capture.logLevels]        When `capture.logs` is true, only forward these levels
 *                                                     (e.g. `['warn', 'error']`). Defaults to all levels.
 * @param {Object}   [config.mask]           Client-side masking applied before data is sent.
 * @param {string[]} [config.mask.fields]    Extra field names to mask in request/response bodies.
 *                                            These are merged with the collector's server-side GDPR blocklist.
 *                                            Note: the collector enforces its own non-bypassable masking
 *                                            regardless of this setting.
 * @returns {Promise<Function>} Middleware function `(ammo, next)`
 */
async function radarMiddleware(config = {}) {
  const collectorUrl =
    config.collectorUrl ??
    process.env.RADAR_COLLECTOR_URL ??
    'https://collector.usetejas.com';

  const apiKey = config.apiKey ?? process.env.RADAR_API_KEY ?? null;

  const projectName =
    config.projectName ??
    process.env.RADAR_PROJECT_NAME ??
    (await readPackageJsonName()) ??
    'tejas-app';

  const flushInterval = config.flushInterval ?? 2000;
  const batchSize = config.batchSize ?? 100;
  const maxQueueSize = config.maxQueueSize ?? 10_000;
  const ignorePaths = new Set(config.ignore ?? ['/health']);

  const capture = Object.freeze({
    request: config.capture?.request === true,
    response: config.capture?.response === true,
    headers: config.capture?.headers ?? false,
    logs: config.capture?.logs === true,
    logLevels: config.capture?.logLevels ?? null,
  });

  // Build the client-side field blocklist from developer-supplied extra fields.
  // The collector enforces its own non-bypassable GDPR blocklist server-side;
  // this is an additional best-effort layer for application-specific fields.
  const clientMaskBlocklist = new Set(
    (config.mask?.fields ?? []).map((f) => f.toLowerCase()),
  );

  if (!apiKey) {
    const mw = (_ammo, next) => next();
    mw._radarStatus = {
      feature: 'Radar',
      ok: null,
      detail: 'disabled (no API key)',
    };
    return mw;
  }

  const ingestUrl = `${collectorUrl}/ingest`;
  const healthUrl = `${collectorUrl}/health`;
  const authHeader = `Bearer ${apiKey}`;

  /** @type {Array<Object>} */
  let batch = [];
  let connected = false;
  let retryQueue = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  async function defaultHttpTransport(events) {
    const json = JSON.stringify(events);
    const compressed = await gzipAsync(Buffer.from(json));
    return fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        Authorization: authHeader,
      },
      body: compressed,
    });
  }

  const send = config.transport ?? defaultHttpTransport;

  /** @type {{ feature: string, ok: boolean, detail: string }} */
  let radarStatus;
  try {
    const healthRes = await fetch(healthUrl);
    if (healthRes.ok) {
      radarStatus = {
        feature: 'Radar',
        ok: true,
        detail: `connected (${collectorUrl})`,
      };
    } else {
      radarStatus = {
        feature: 'Radar',
        ok: false,
        detail: `collector returned ${healthRes.status} (${collectorUrl})`,
      };
    }
  } catch (err) {
    radarStatus = {
      feature: 'Radar',
      ok: false,
      detail: `unreachable (${collectorUrl})`,
    };
  }

  async function sendPayload(payload) {
    try {
      const res = await send(payload);
      if (res.ok) {
        if (!connected) {
          connected = true;
          logger.info(
            `Connected — project: "${projectName}", collector: ${collectorUrl}`,
          );
        }
        return true;
      }
      if (res.status === 401) {
        if (connected) connected = false;
        logger.warn(
          'Radar API key rejected by collector. Telemetry will not be recorded.',
        );
        return true;
      }
      return false;
    } catch (err) {
      logger.warn(`Radar flush failed: ${err.message}`);
      return false;
    }
  }

  async function flush() {
    if (retryQueue) {
      const ok = await sendPayload(retryQueue);
      if (ok) {
        retryQueue = null;
        retryCount = 0;
      } else {
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          logger.warn(
            `Radar dropping ${retryQueue.length} events after ${MAX_RETRIES} failed retries`,
          );
          retryQueue = null;
          retryCount = 0;
        }
        return;
      }
    }

    if (batch.length === 0) return;
    const payload = batch;
    batch = [];

    const ok = await sendPayload(payload);
    if (!ok) {
      retryQueue = payload;
      retryCount = 1;
    }
  }

  const timer = setInterval(flush, flushInterval);
  if (timer.unref) timer.unref();

  const captureLevels = capture.logLevels ? new Set(capture.logLevels) : null;

  if (capture.logs) {
    TejLogger.addHook(({ level, identifier, message, metadata }) => {
      if (captureLevels && !captureLevels.has(level)) return;

      const store = traceStore.getStore();
      const traceId = store?.traceId ?? null;

      const metaJson =
        metadata != null
          ? JSON.stringify(metadata).slice(0, MAX_JSON_BLOB)
          : null;

      const event = {
        type: 'app_log',
        projectName,
        level,
        message: `[${identifier}] ${String(message).slice(0, 4096)}`,
        traceId,
        timestamp: Date.now(),
        metadata: metaJson,
      };

      if (batch.length >= maxQueueSize) batch.splice(0, 1);
      batch.push(event);
      if (batch.length >= batchSize) flush();
    });
  }

  function radarCapture(ammo, next) {
    const startTime = Date.now();
    const traceId = randomUUID().replace(/-/g, '');
    const spanCtx = createSpanContext(traceId);

    ammo.res.on('finish', () => {
      const path = ammo.endpoint ?? ammo.path ?? '/';

      if (ammo.method === 'OPTIONS' || ignorePaths.has(path)) return;

      const status = ammo.res.statusCode;
      const endTimestamp = Date.now();
      const duration = endTimestamp - startTime;
      const payloadSize = Buffer.byteLength(
        JSON.stringify(ammo.payload ?? {}),
        'utf8',
      );
      const responseSize = Buffer.byteLength(ammo.dispatchedData ?? '', 'utf8');
      const ip = ammo.ip ?? null;
      const userAgent = ammo.headers?.['user-agent'] ?? null;
      const headers = capJsonBlob(buildHeaders(ammo.headers, capture.headers));
      const requestBody = capture.request
        ? capJsonBlob(deepMask(ammo.payload ?? null, clientMaskBlocklist))
        : null;
      const responseBody = capture.response
        ? capJsonBlob(
            deepMask(parseJsonSafe(ammo.dispatchedData), clientMaskBlocklist),
          )
        : null;

      function pushEvents() {
        const errorInfo = ammo._errorInfo ?? null;

        let errorField = null;
        if (status >= 400 && errorInfo) {
          errorField = JSON.stringify({
            message: errorInfo.message ?? null,
            type: errorInfo.type ?? null,
            devInsight: errorInfo.devInsight ?? null,
            llmEnabled: getErrorsLlmConfig().enabled,
          });
        }

        // Finalize root span — added last so middleware spans already
        // reference rootSpanId as their parentId.
        spanCtx.addSpan(
          `${ammo.method} ${path}`,
          'handler',
          null,
          startTime,
          duration,
          status,
        );

        const spanEvents = spanCtx.spans.map((s) =>
          buildSpanEvent(projectName, spanCtx, s),
        );

        const incoming = (status >= 400 ? 2 : 1) + spanEvents.length;
        if (batch.length + incoming > maxQueueSize) {
          const overflow = batch.length + incoming - maxQueueSize;
          batch.splice(0, overflow);
        }

        batch.push({
          type: 'log',
          projectName,
          method: ammo.method,
          path,
          status,
          duration_ms: duration,
          payload_size: payloadSize,
          response_size: responseSize,
          timestamp: endTimestamp,
          ip,
          traceId,
          user_agent: userAgent,
          headers,
          request_body: requestBody,
          response_body: responseBody,
          error: errorField,
        });

        if (status >= 400) {
          const message = errorInfo?.message ?? `HTTP ${status}`;
          const fingerprint = createHash('sha256')
            .update(`${message}:${path}`)
            .digest('hex');
          batch.push({
            type: 'error',
            projectName,
            fingerprint,
            message,
            stack: errorInfo?.stack ?? null,
            endpoint: `${ammo.method} ${path}`,
            traceId,
            timestamp: endTimestamp,
          });
        }

        for (const spanEvent of spanEvents) {
          batch.push(spanEvent);
        }

        if (batch.length >= batchSize) flush();
      }

      if (ammo._llmPromise) {
        const timeout = new Promise((resolve) => {
          const t = setTimeout(resolve, 30000);
          if (t.unref) t.unref();
        });
        Promise.race([ammo._llmPromise, timeout])
          .catch(() => {})
          .then(pushEvents);
      } else {
        pushEvents();
      }
    });

    traceStore.run({ traceId, spanCtx }, () => next());
  }

  radarCapture._radarStatus = radarStatus;
  return radarCapture;
}

export default radarMiddleware;
