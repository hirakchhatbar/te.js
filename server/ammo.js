import { statusAndData } from './ammo/dispatch-helper.js';
import {
  isStatusCode,
  toStatusCode,
  toStatusMessage,
} from '../utils/status-codes.js';
import html from '../utils/tejas-entrypoint-html.js';
import ammoEnhancer from './ammo/enhancer.js';
import TejError from './error.js';

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

    this.GET = this.method === 'GET';
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
  notAllowed() {
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
   * @param {number|Error|string} [arg1] - Status code, Error object, or error message
   * @param {string} [arg2] - Error message (only used when arg1 is a status code)
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
   * The key difference between throw() and fire() is that throw() can accept an Error instance
   * and has special handling for it. Internally, throw() still calls fire() to send the response.
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
   */
  throw() {
    // Handle different argument patterns
    const args = Array.from(arguments);

    // Case 1: No arguments provided
    if (args.length === 0) {
      this.fire(500, 'Internal Server Error');
      return;
    }

    // Case 2: First argument is a status code
    if (isStatusCode(args[0])) {
      const statusCode = args[0];
      const message = args[1] || toStatusMessage(statusCode);
      this.fire(statusCode, message);
      return;
    }

    // Case 3.1: First argument is an instance of TejError
    if (args[0] instanceof TejError) {
      const error = args[0];
      const statusCode = error.code;
      const message = error.message;

      this.fire(statusCode, message);
      return;
    }

    // Case 3: First argument is an Error object
    if (args[0] instanceof Error) {
      const error = args[0];

      // Check if error message is a numeric status code
      if (!isNaN(parseInt(error.message))) {
        const statusCode = parseInt(error.message);
        const message = toStatusMessage(statusCode) || toStatusMessage(500);
        this.fire(statusCode, message);
        return;
      }

      // Use error message as status code if it's a valid status code string
      const statusCode = toStatusCode(error.message);
      if (statusCode) {
        this.fire(statusCode, error.message);
        return;
      }

      // Default error handling
      this.fire(500, error.message);
      return;
    }

    // Case 4: First argument is a string or other value
    const errorValue = args[0];

    // Check if the string represents a status code
    const statusCode = toStatusCode(errorValue);
    if (statusCode) {
      this.fire(statusCode, toStatusMessage(statusCode));
      return;
    }

    // Default case: treat as error message
    this.fire(500, errorValue.toString());
  }
}

export default Ammo;
