import { env } from 'tej-env';
import ansi from 'ansi-colors';
import TejLogger from 'tej-logger';

const logger = new TejLogger('Tejas.Request');
const { italic, bold, blue, white, bgGreen, bgRed, whiteBright } = ansi;

/**
 * Best-effort field names to mask when logging request/response bodies to the
 * console.  This is a hardcoded safety net — it does not replace the
 * non-bypassable scrubbing enforced by the Radar collector on telemetry data.
 */
const CONSOLE_MASK_FIELDS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'api_key',
  'apikey',
]);

/**
 * Recursively mask sensitive fields in a value for safe console output.
 * Replaces matched key values with `"*"`.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function maskForLog(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(maskForLog);

  const result = {};
  for (const [k, v] of Object.entries(value)) {
    result[k] = CONSOLE_MASK_FIELDS.has(k.toLowerCase()) ? '*' : maskForLog(v);
  }
  return result;
}

function logHttpRequest(ammo, next) {
  if (!env('LOG_HTTP_REQUESTS')) return;

  const startTime = new Date();
  ammo.res.on('finish', () => {
    const res = ammo.res;
    const method = italic(whiteBright(ammo.method));
    const endpoint = bold(ammo.endpoint);
    const statusCode =
      res.statusCode >= 400
        ? bgRed(whiteBright(bold(`✖ ${res.statusCode}`)))
        : bgGreen(whiteBright(bold(`✔ ${res.statusCode}`)));

    const duration = white(`${new Date() - startTime}ms`);

    const maskedPayload = maskForLog(ammo.payload);
    const payload = `${blue('Request')}: ${white(
      JSON.stringify(maskedPayload),
    )}`;

    let maskedResponse = ammo.dispatchedData;
    try {
      maskedResponse = JSON.stringify(
        maskForLog(JSON.parse(ammo.dispatchedData)),
      );
    } catch {
      // Non-JSON response — log as-is
    }
    const dispatchedData = `${blue('Response')}: ${white(maskedResponse)}`;
    const nextLine = '\n';

    logger.log(
      italic(`Incoming request from ${ammo.ip}`),
      nextLine,
      method,
      endpoint,
      statusCode,
      duration,
      nextLine,
      payload,
      nextLine,
      dispatchedData,
    );
  });
}

export default logHttpRequest;
