import { statusAndData } from './ammo/dispatch-helper.js';
import {
  isStatusCode,
  toStatusCode,
  toStatusMessage,
} from '../utils/status-codes.js';
import html from '../utils/tejas-entrypoint-html.js';
import ammoEnhancer from './ammo/enhancer.js';
import TejError from './error.js';

class Ammo {
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

  fire() {
    const { statusCode, data, contentType } = statusAndData(arguments);
    const contentTypeHeader = { 'Content-Type': contentType };

    this.dispatchedData = data;

    this.res.writeHead(statusCode, contentTypeHeader);
    this.res.write(data ?? '');
    this.res.end();
  }

  notFound() {
    throw new TejError(404, 'Not Found');
  }

  notAllowed() {
    throw new TejError(405, 'Method Not Allowed');
  }

  unauthorized() {
    throw new TejError(401, 'Unauthorized');
  }

  defaultEntry() {
    this.fire(html);
  }

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
