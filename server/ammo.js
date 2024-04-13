import {statusAndData} from '../utils/ammo-helper.js';
import bodyParser from '../utils/body-parser.js';
import {toStatusCode, toStatusMessage} from '../utils/status-codes.js';

class Ammo {
  constructor(req, res) {
    this.req = req;
    this.res = res;

    this.payload = {};
    this.dispatchedData = '';
    this.headers = {};
    this.method = req.method;
    this.endpoint = req.url;
  }

  async generateHeaders() {
    this.headers = this.req.headers;
  }

  async generatePayload() {
    const obj = {};

    const searchParams = new URLSearchParams(this.req.url.split('?')[1]);
    for (const [key, value] of searchParams) {
      obj[key] = value;
    }

    const body = await bodyParser(this.req);
    if (body) Object.assign(obj, body);
    this.payload = obj;
  }

  dispatch() {
    const {statusCode, data, contentType} = statusAndData(arguments);
    const contentTypeHeader = {'Content-Type': contentType};

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

  throw(err) {
    if (err instanceof Error) {
      const errMsg = err.message;
      if (!isNaN(parseInt(errMsg))) {
        const message = toStatusMessage(errMsg) ?? toStatusMessage(500);
        this.dispatch(errMsg, message);
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
