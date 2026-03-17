import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import TejLogger from 'tej-logger';

const logger = new TejLogger('Tejas.Radar');

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

/**
 * Factory that returns a te.js-compatible `(ammo, next)` middleware which
 * captures HTTP request metrics and forwards them to the Tejas Radar collector.
 *
 * @param {Object} [config]
 * @param {string} [config.apiKey]           Bearer token (rdr_xxx). Falls back to RADAR_API_KEY env. Required.
 * @param {string} [config.projectName]      Project identifier. Falls back to RADAR_PROJECT_NAME env, then package.json `name`, then "tejas-app".
 * @param {number} [config.flushInterval]    Milliseconds between periodic flushes (default 2000).
 * @param {number} [config.batchSize]        Flush immediately when batch reaches this size (default 100).
 * @param {string[]} [config.ignore]         Request paths to skip (default ['/health']).
 * @param {Object}  [config.capture]         Controls what additional data is captured beyond metrics.
 * @param {boolean} [config.capture.request]          Capture and send request body (default false).
 * @param {boolean} [config.capture.response]         Capture and send response body (default false).
 * @param {boolean|string[]} [config.capture.headers] Capture request headers. `true` sends all headers;
 *                                                     a `string[]` sends only the named headers (allowlist);
 *                                                     `false` (default) sends nothing.
 * @param {Object}   [config.mask]           Client-side masking applied before data is sent.
 * @param {string[]} [config.mask.fields]    Extra field names to mask in request/response bodies.
 *                                            These are merged with the collector's server-side GDPR blocklist.
 *                                            Note: the collector enforces its own non-bypassable masking
 *                                            regardless of this setting.
 * @returns {Promise<Function>} Middleware function `(ammo, next)`
 */
async function radarMiddleware(config = {}) {
  // RADAR_COLLECTOR_URL is an undocumented internal escape hatch used only
  // during local development. In production, telemetry always goes to the
  // hosted collector and this env var should not be set.
  const collectorUrl =
    process.env.RADAR_COLLECTOR_URL ?? 'http://localhost:3100';

  const apiKey = config.apiKey ?? process.env.RADAR_API_KEY ?? null;

  const projectName =
    config.projectName ??
    process.env.RADAR_PROJECT_NAME ??
    (await readPackageJsonName()) ??
    'tejas-app';

  const flushInterval = config.flushInterval ?? 2000;
  const batchSize = config.batchSize ?? 100;
  const ignorePaths = new Set(config.ignore ?? ['/health']);

  const capture = Object.freeze({
    request: config.capture?.request === true,
    response: config.capture?.response === true,
    headers: config.capture?.headers ?? false,
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

  async function flush() {
    if (batch.length === 0) return;
    const payload = batch;
    batch = [];

    try {
      const res = await fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok && !connected) {
        connected = true;
        logger.info(
          `Connected — project: "${projectName}", collector: ${collectorUrl}`,
        );
      } else if (res.status === 401 && connected) {
        connected = false;
        logger.warn('Radar API key rejected by collector.');
      } else if (res.status === 401) {
        logger.warn(
          'Radar API key rejected by collector. Telemetry will not be recorded.',
        );
      }
    } catch (err) {
      logger.warn(`Radar flush failed: ${err.message}`);
    }
  }

  const timer = setInterval(flush, flushInterval);
  if (timer.unref) timer.unref();

  function radarCapture(ammo, next) {
    const startTime = Date.now();

    ammo.res.on('finish', () => {
      const path = ammo.endpoint ?? ammo.path ?? '/';

      if (ammo.method === 'OPTIONS' || ignorePaths.has(path)) return;

      const status = ammo.res.statusCode;
      const errorInfo = ammo._errorInfo ?? null;

      // Build structured error JSON for the logs table when an error occurred.
      let errorField = null;
      if (status >= 400 && errorInfo) {
        errorField = JSON.stringify({
          message: errorInfo.message ?? null,
          type: errorInfo.type ?? null,
          devInsight: errorInfo.devInsight ?? null,
        });
      }

      batch.push({
        type: 'log',
        projectName,
        method: ammo.method,
        path,
        status,
        duration_ms: Date.now() - startTime,
        payload_size: Buffer.byteLength(
          JSON.stringify(ammo.payload ?? {}),
          'utf8',
        ),
        response_size: Buffer.byteLength(ammo.dispatchedData ?? '', 'utf8'),
        timestamp: Date.now(),
        ip: ammo.ip ?? null,
        traceId: null,
        user_agent: ammo.headers?.['user-agent'] ?? null,
        headers: buildHeaders(ammo.headers, capture.headers),
        request_body: capture.request
          ? deepMask(ammo.payload ?? null, clientMaskBlocklist)
          : null,
        response_body: capture.response
          ? deepMask(parseJsonSafe(ammo.dispatchedData), clientMaskBlocklist)
          : null,
        error: errorField,
      });

      // Emit a separate ErrorEvent for error grouping and tracking when status >= 400.
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
          traceId: null,
          timestamp: Date.now(),
        });
      }

      if (batch.length >= batchSize) flush();
    });

    next();
  }

  radarCapture._radarStatus = radarStatus;
  return radarCapture;
}

export default radarMiddleware;
