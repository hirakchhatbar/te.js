import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TejLogger from 'tej-logger';

const logger = new TejLogger('Tejas.Radar');

/**
 * Attempt to read the `name` field from the nearest package.json at startup.
 * Returns null if the file cannot be read or parsed.
 */
function readPackageJsonName() {
  try {
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    return JSON.parse(raw).name ?? null;
  } catch {
    return null;
  }
}

/**
 * Factory that returns a te.js-compatible `(ammo, next)` middleware which
 * captures HTTP request metrics and forwards them to a Tejas Radar collector.
 *
 * @param {Object} [config]
 * @param {string} [config.collectorUrl]   Collector base URL. Falls back to RADAR_COLLECTOR_URL env, then http://localhost:3100.
 * @param {string} [config.apiKey]         Bearer token (rdr_xxx). Falls back to RADAR_API_KEY env.
 * @param {string} [config.projectName]    Project identifier. Falls back to RADAR_PROJECT_NAME env, then package.json `name`, then "tejas-app".
 * @param {number} [config.flushInterval]  Milliseconds between periodic flushes (default 2000).
 * @param {number} [config.batchSize]      Flush immediately when batch reaches this size (default 100).
 * @param {string[]} [config.ignore]       Request paths to skip (default ['/health']).
 * @returns {Function} Middleware function `(ammo, next)`
 */
function radarMiddleware(config = {}) {
  const collectorUrl =
    config.collectorUrl ??
    process.env.RADAR_COLLECTOR_URL ??
    'http://localhost:3100';

  const apiKey = config.apiKey ?? process.env.RADAR_API_KEY ?? null;

  const projectName =
    config.projectName ??
    process.env.RADAR_PROJECT_NAME ??
    readPackageJsonName() ??
    'tejas-app';

  const flushInterval = config.flushInterval ?? 2000;
  const batchSize = config.batchSize ?? 100;
  const ignorePaths = new Set(config.ignore ?? ['/health']);

  if (!apiKey) {
    logger.warn(
      'No API key provided (config.apiKey or RADAR_API_KEY). Radar telemetry disabled.',
    );
    return (_ammo, next) => next();
  }

  logger.info(
    `Radar enabled — project: "${projectName}", collector: ${collectorUrl}`,
  );

  const ingestUrl = `${collectorUrl}/ingest`;
  const authHeader = `Bearer ${apiKey}`;

  /** @type {Array<Object>} */
  let batch = [];

  function flush() {
    if (batch.length === 0) return;
    const payload = batch;
    batch = [];

    fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      logger.warn(`Radar flush failed: ${err.message}`);
    });
  }

  const timer = setInterval(flush, flushInterval);
  if (timer.unref) timer.unref();

  return function radarCapture(ammo, next) {
    const startTime = Date.now();

    ammo.res.on('finish', () => {
      const path = ammo.endpoint ?? ammo.path ?? '/';

      if (ammo.method === 'OPTIONS' || ignorePaths.has(path)) return;

      batch.push({
        type: 'metric',
        projectName,
        method: ammo.method,
        path,
        status: ammo.res.statusCode,
        duration_ms: Date.now() - startTime,
        payload_size: 0,
        response_size: 0,
        timestamp: Date.now(),
      });

      if (batch.length >= batchSize) flush();
    });

    next();
  };
}

export default radarMiddleware;
