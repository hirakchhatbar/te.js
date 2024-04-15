import { statusAndData } from './ammo/dispatch-helper.js';
import {
  isStatusCode,
  toStatusCode,
  toStatusMessage,
} from '../utils/status-codes.js';
import html from '../utils/tejas-entrypoint-html.js';
import ammoEnhancer from './ammo/enhancer.js';

class Ammo {
  constructor(req, res) {
    this.req = req;
    this.res = res;

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
    this.throw(new Error('Not Found'));
  }

  notAllowed() {
    this.throw(new Error('Method Not Allowed'));
  }

  unauthorized() {
    this.throw(new Error('Unauthorized'));
  }

  defaultEntry() {
    this.fire(html);
  }

  throw() {
    const err = arguments[0];
    const errCode = arguments[1];

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
        this.dispatch(message, message);
        return;
      }

      const code = toStatusCode(errMsg) ?? 500;
      this.dispatch(code, errMsg);
      return;
    }

    this.dispatch(err);
  }
}

export default Ammo;
