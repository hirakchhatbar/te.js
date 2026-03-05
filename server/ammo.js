import { statusAndData } from './ammo/dispatch-helper.js';
import {
  isStatusCode,
  toStatusCode,
  toStatusMessage,
} from '../utils/status-codes.js';
import html from '../utils/tejas-entrypoint-html.js';
import ammoEnhancer from './ammo/enhancer.js';
import TejError from './error.js';
import { getErrorsLlmConfig } from '../utils/errors-llm-config.js';
import { inferErrorFromContext } from './errors/llm-error-service.js';
import { captureCodeContext } from './errors/code-context.js';

/**
 * Detect if the value is a throw() options object (per-call overrides).
 * @param {unknown} v
 * @returns {v is { useLlm?: boolean, messageType?: 'endUser'|'developer' }}
 */
function isThrowOptions(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = /** @type {Record<string, unknown>} */ (v);
  const hasUseLlm = 'useLlm' in o;
  const hasMessageType =
    'messageType' in o &&
    (o.messageType === 'endUser' || o.messageType === 'developer');
  return hasUseLlm || hasMessageType === true;
}

/**
 * Ammo class for handling HTTP requests and responses.
 *
 * @description
 * Ammo is a utility class that simplifies HTTP request handling and response generation.
 * It provides methods for processing requests, sending responses, and handling errors.
 *
 * @example
 *
 * if (ammo.GET) {
 *   ammo.fire(200, { message: 'Hello World' });
 * } else {
 *   ammo.notAllowed();
 * }
 */
class Ammo {
  /**
   * Creates a new Ammo instance.
   *
   * @param {http.IncomingMessage} req - The HTTP request object
   * @param {http.ServerResponse} res - The HTTP response object
   *
   * @description
   * Initializes a new Ammo instance with the provided request and response objects.
   * Sets up default values for various properties that will be populated by the enhance method.
   */
  constructor(req, res) {
    this.req = req;
    this.res = res;

    this.GET = false;
    this.POST = false;
    this.PUT = false;
    this.DELETE = false;
    this.PATCH = false;
    this.HEAD = false;
    this.OPTIONS = false;

    // Request related data
    this.ip = undefined;
    this.headers = undefined;
    this.payload = undefined;
    this.method = undefined;

    // URL related data
    this.protocol = undefined;
    this.hostname = undefined;
    this.path = undefined;
    this.endpoint = undefined;

    this.fullURL = undefined;

    // Response related data
    this.dispatchedData = undefined;
  }

  /**
   * Enhances the Ammo instance with request data and sets HTTP method flags.
   *
   * @description
   * This method processes the request and sets various properties on the Ammo instance:
   * - HTTP method flags (GET, POST, PUT, etc.)
   * - Request data (IP, headers, payload, method)
   * - URL data (protocol, hostname, path, endpoint, fullURL)
   *
   * This method should be called before using any other Ammo methods.
   *
   * @returns {Promise<void>} A promise that resolves when enhancement is complete
   *
   * @example
   * const ammo = new Ammo(req, res);
   * await ammo.enhance();
   * // Now you can use ammo.GET, ammo.path, etc.
   */
  async enhance() {
    await ammoEnhancer(this);

    this.GET = this.method === 'GET' || this.method === 'HEAD';
    this.POST = this.method === 'POST';
    this.PUT = this.method === 'PUT';
    this.DELETE = this.method === 'DELETE';
    this.PATCH = this.method === 'PATCH';
    this.HEAD = this.method === 'HEAD';
    this.OPTIONS = this.method === 'OPTIONS';
  }

  /**
   * Sends a response to the client with the specified data and status code.
   *
   * @param {number|any} [arg1] - If a number, treated as status code. Otherwise treated as data to send.
   * @param {any} [arg2] - If arg1 is a number, this is the data to send. Otherwise ignored.
   * @param {string} [arg3] - Optional content type override.
   *
   * @description
   * The fire method is flexible and can handle different argument patterns:
   *
   * 1. No arguments: Sends a 204 No Content response
   * 2. Single number: Sends a response with the given status code
   * 3. Single non-number: Sends a 200 OK response with the given data
   * 4. Two arguments (number, data): Sends a response with the given status code and data
   * 5. Three arguments: Sends a response with the given status code, data, and content type
   *
   * The fire method can be used with any HTTP status code, including error codes (4xx, 5xx).
   * For error responses, you can use either fire() or throw(). The main difference is that
   * throw() can accept an Error instance and has special handling for it, while fire() only
   * accepts status codes, strings, or other data types.
   *
   * @example
   * // Send a 200 OK response with JSON data
   * ammo.fire(200, { message: 'Success' });
   *
   * @example
   * // Send a 404 Not Found response with custom message
   * ammo.fire(404, 'Resource not found');
   *
   * @example
   * // Send a 500 Internal Server Error response
   * ammo.fire(500, 'Something went wrong');
   *
   * @example
   * // Send HTML content with custom content type
   * ammo.fire(200, '<html><body>Hello</body></html>', 'text/html');
   *
   * @example
   * // Send just a status code (will use default status message)
   * ammo.fire(204);
   *
   * @example
   * // Send just data (will use 200 status code)
   * ammo.fire({ message: 'Success' });
   * ammo.fire('Hello World');
   */
  fire() {
    const { statusCode, data, contentType } = statusAndData(arguments);
    const contentTypeHeader = { 'Content-Type': contentType };

    this.dispatchedData = data;

    this.res.writeHead(statusCode, contentTypeHeader);
    this.res.write(data ?? '');
    this.res.end();
  }

  /**
   * Redirects to the specified URL.
   *
   * @param {string} url - The URL to redirect to
   * @param {number} [statusCode=302] - HTTP status code for redirect (default: 302)
   *
   * @description
   * Sends an HTTP redirect response to the specified URL.
   * Uses 302 (Found/Temporary Redirect) by default.
   * Common status codes:
   * - 301: Moved Permanently
   * - 302: Found (Temporary Redirect)
   * - 303: See Other
   * - 307: Temporary Redirect (maintains HTTP method)
   * - 308: Permanent Redirect (maintains HTTP method)
   *
   * @example
   * // Temporary redirect (302)
   * ammo.redirect('/new-location');
   *
   * @example
   * // Permanent redirect (301)
   * ammo.redirect('/new-location', 301);
   */
  redirect(url, statusCode = 302) {
    this.res.writeHead(statusCode, { Location: url });
    this.res.end();
  }

  /**
   * Throws a 404 Not Found error.
   *
   * @description
   * This is a convenience method that throws a 404 Not Found error.
   * It's equivalent to calling `throw(404) ` or `fire(404)`.
   *
   * @throws {TejError} Always throws a TejError with status code 404
   *
   * @example
   * // If resource not found
   * if (!resource) {
   *   ammo.notFound();
   * }
   */
  notFound() {
    throw new TejError(404, 'Not Found');
  }

  /**
   * Throws a 405 Method Not Allowed error.
   *
   * @description
   * This is a convenience method that throws a 405 Method Not Allowed error.
   * It's equivalent to calling `throw(405)` or `fire(405)`.
   *
   * @throws {TejError} Always throws a TejError with status code 405
   *
   * @example
   * // If method not allowed
   * if (!allowedMethods.includes(ammo.method)) {
   *   ammo.notAllowed();
   * }
   */
  /**
   * Restricts the handler to the given HTTP method(s). If the request method is not in the list,
   * sets the Allow header and throws 405 Method Not Allowed.
   *
   * @param {...string} methods - Allowed methods (e.g. 'GET', 'POST'). Case-insensitive.
   * @throws {TejError} 405 when the request method is not allowed
   *
   * @example
   * target.register('/health', (ammo) => {
   *   ammo.only('GET');
   *   ammo.fire({ status: 'ok' });
   * });
   */
  only(...methods) {
    const allowed = methods.map((m) => String(m).toUpperCase());
    const method = this.method ? String(this.method).toUpperCase() : '';
    if (!method || !allowed.includes(method)) {
      this.res.setHeader('Allow', allowed.join(', '));
      throw new TejError(405, 'Method Not Allowed');
    }
  }

  /**
   * Throws a 405 Method Not Allowed error. Optionally sets the Allow header when allowed methods are provided.
   *
   * @param {...string} [allowedMethods] - Allowed methods for the Allow header (e.g. 'GET', 'POST'). Omit for no header.
   * @throws {TejError} Always throws a TejError with status code 405
   *
   * @example
   * if (!allowedMethods.includes(ammo.method)) {
   *   ammo.notAllowed('GET', 'POST');
   * }
   */
  notAllowed(...allowedMethods) {
    if (allowedMethods.length > 0) {
      this.res.setHeader(
        'Allow',
        allowedMethods.map((m) => String(m).toUpperCase()).join(', '),
      );
    }
    throw new TejError(405, 'Method Not Allowed');
  }

  /**
   * Throws a 401 Unauthorized error.
   *
   * @description
   * This is a convenience method that throws a 401 Unauthorized error.
   * It's equivalent to calling `throw(401) ` or `fire(401)`.
   *
   * @throws {TejError} Always throws a TejError with status code 401
   *
   * @example
   * // If user is not authenticated
   * if (!user) {
   *   ammo.unauthorized();
   * }
   */
  unauthorized() {
    throw new TejError(401, 'Unauthorized');
  }

  /**
   * Sends the default entry point HTML.
   *
   * @description
   * This method sends the default HTML entry point for the application.
   * It's typically used as a fallback when no specific route is matched.
   *
   * @example
   * // In a catch-all route
   * ammo.defaultEntry();
   */
  defaultEntry() {
    this.fire(html);
  }

  /**
   * Throws an error response with appropriate status code and message.
   *
   * @param {number|Error|string|object} [arg1] - Status code, Error object, error message, or (when no code) options
   * @param {string|object} [arg2] - Error message (when arg1 is status code) or options (when arg1 is error/empty)
   *
   * @description
   * The throw method is flexible and can handle different argument patterns:
   *
   * 1. No arguments: Sends a 500 Internal Server Error response
   * 2. Status code: Sends a response with the given status code and default message
   * 3. Status code and message: Sends a response with the given status code and message
   * 4. Error object: Extracts status code and message from the error
   * 5. String: Treats as error message with 500 status code
   *
   * When errors.llm.enabled is true and no explicit code/message is given (no args,
   * Error, or string/other), an LLM infers statusCode and message from context.
   * In that case throw() returns a Promise; otherwise it returns undefined.
   *
   * Per-call options (last argument, only when no explicit status code): pass an object
   * with `useLlm` (boolean) and/or `messageType` ('endUser' | 'developer'). Use
   * `useLlm: false` to skip the LLM for this call; use `messageType` to override
   * errors.llm.messageType for this call (end-user-friendly vs developer-friendly message).
   *
   * @example
   * // Throw a 404 Not Found error
   * ammo.throw(404);
   *
   * @example
   * // Throw a 404 Not Found error with custom message
   * ammo.throw(404, 'Resource not found');
   *
   * @example
   * // Throw an error from an Error object
   * ammo.throw(new Error('Something went wrong'));
   *
   * @example
   * // Throw an error with a custom message
   * ammo.throw('Something went wrong');
   *
   * @example
   * // Skip LLM for this call; use default 500
   * ammo.throw(err, { useLlm: false });
   *
   * @example
   * // Force developer-friendly message for this call
   * ammo.throw(err, { messageType: 'developer' });
   *
   * @returns {Promise<void>|void} Promise when LLM path is used; otherwise void
   */
  throw() {
    let args = Array.from(arguments);
    const { enabled: llmEnabled } = getErrorsLlmConfig();

    // Per-call options: last arg can be { useLlm?, messageType? } when call is LLM-eligible (no explicit code).
    const llmEligible =
      args.length === 0 ||
      (!isStatusCode(args[0]) && !(args[0] instanceof TejError));
    let throwOpts = /** @type {{ useLlm?: boolean, messageType?: 'endUser'|'developer' } | null} */ (null);
    if (llmEligible && args.length > 0 && isThrowOptions(args[args.length - 1])) {
      throwOpts = /** @type {{ useLlm?: boolean, messageType?: 'endUser'|'developer' } } */ (args.pop());
    }

    const useLlm =
      llmEnabled &&
      llmEligible &&
      throwOpts?.useLlm !== false;

    if (useLlm) {
      // Use stack from thrown error when available (e.g. handler caught and called ammo.throw(err)) so we capture user code; else current call site.
      const stack =
        args[0] instanceof Error && args[0].stack
          ? args[0].stack
          : new Error().stack;
      return captureCodeContext(stack)
        .then((codeContext) => {
          const context = {
            codeContext,
            method: this.method,
            path: this.path,
            includeDevInsight: true,
            ...(throwOpts?.messageType && { messageType: throwOpts.messageType }),
          };
          if (args[0] !== undefined && args[0] !== null) context.error = args[0];
          return inferErrorFromContext(context);
        })
        .then(({ statusCode, message, devInsight }) => {
          const isProduction = process.env.NODE_ENV === 'production';
          const data =
            !isProduction && devInsight
              ? { message, _dev: devInsight }
              : message;
          this.fire(statusCode, data);
        });
    }

    // Sync path: explicit code/message or useLlm: false
    if (args.length === 0) {
      this.fire(500, 'Internal Server Error');
      return;
    }

    if (isStatusCode(args[0])) {
      const statusCode = args[0];
      const message = args[1] || toStatusMessage(statusCode);
      this.fire(statusCode, message);
      return;
    }

    if (args[0] instanceof TejError) {
      const error = args[0];
      this.fire(error.code, error.message);
      return;
    }

    if (args[0] instanceof Error) {
      const error = args[0];
      if (!isNaN(parseInt(error.message))) {
        const statusCode = parseInt(error.message);
        const message = toStatusMessage(statusCode) || toStatusMessage(500);
        this.fire(statusCode, message);
        return;
      }
      const statusCode = toStatusCode(error.message);
      if (statusCode) {
        this.fire(statusCode, error.message);
        return;
      }
      this.fire(500, error.message);
      return;
    }

    const errorValue = args[0];
    const statusCode = toStatusCode(errorValue);
    if (statusCode) {
      this.fire(statusCode, toStatusMessage(statusCode));
      return;
    }
    this.fire(500, errorValue.toString());
  }
}

export default Ammo;
