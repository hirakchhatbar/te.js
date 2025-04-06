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

    this.cacheConfig = null;
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
    const errCode = arguments[0];
    const err = arguments[1];

    let errMsg = err instanceof Error ? err.message : err.toString();

    if (errCode && isStatusCode(errCode)) {
      if (!errMsg) errMsg = toStatusMessage(errCode);
      this.fire(errCode, errMsg);
      return;
    }

    if (err instanceof Error) {
      const errMessage = err.message;

      if (!isNaN(parseInt(errMessage))) {
        // Execute when errMessage is a number. Notice ! in front of isNan
        const message = toStatusMessage(errMessage) ?? toStatusMessage(500);
        this.fire(message, message);
        return;
      }

      const code = toStatusCode(errMsg) ?? 500;
      this.fire(code, errMsg);
      return;
    }

    this.fire(err);
  }
}

export default Ammo;
