/**
 * @fileoverview Base error class for the Tejas framework.
 *
 * All errors thrown by the framework extend TejError. The constructor
 * accepts the HTTP status code as the first argument (matching the existing
 * call signature `new TejError(statusCode, message)`) and derives a
 * machine-readable `code` string of the form `ERR_HTTP_<statusCode>`.
 *
 * Well-known codes are available as named constants on `TejError` for
 * callers that want expressive error codes without hardcoding numbers.
 */

/**
 * Base framework error class.
 *
 * @extends {Error}
 *
 * @example
 * throw new TejError(404, 'Not Found');
 * // error.statusCode === 404
 * // error.code      === 'ERR_HTTP_404'
 *
 * @example
 * // With cause chaining
 * throw new TejError(500, 'Database failure', { cause: originalError });
 */
class TejError extends Error {
  /**
   * @param {number} statusCode   - HTTP status code (e.g. 404, 500)
   * @param {string} message      - Human-readable description
   * @param {{ cause?: Error }} [options] - Optional native cause for chaining
   */
  constructor(statusCode, message, options) {
    super(message, options);
    this.name = this.constructor.name;
    /** @type {number} HTTP status code */
    this.statusCode = statusCode;
    /** @type {string} Machine-readable error code derived from status */
    this.code = `ERR_HTTP_${statusCode}`;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Named error codes for common framework scenarios.
 * Use these instead of hardcoding numeric status codes at call sites.
 */
TejError.CODES = Object.freeze({
  ERR_ROUTING_FAILED: 'ERR_ROUTING_FAILED',
  ERR_INVALID_DEPENDENCY: 'ERR_INVALID_DEPENDENCY',
  ERR_PLUGIN_LOAD_FAILED: 'ERR_PLUGIN_LOAD_FAILED',
  ERR_CONFIG_INVALID: 'ERR_CONFIG_INVALID',
  ERR_STREAM_OVERFLOW: 'ERR_STREAM_OVERFLOW',
  ERR_AUTH_FAILED: 'ERR_AUTH_FAILED',
  ERR_NOT_FOUND: 'ERR_HTTP_404',
  ERR_METHOD_NOT_ALLOWED: 'ERR_HTTP_405',
  ERR_UNAUTHORIZED: 'ERR_HTTP_401',
  ERR_BAD_REQUEST: 'ERR_HTTP_400',
  ERR_INTERNAL: 'ERR_HTTP_500',
});

export default TejError;
