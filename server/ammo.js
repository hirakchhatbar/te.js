import bodyParser from "../utils/body-parser.js";
import { contentType, statusAndData } from "../utils/ammo-helper.js";

class Ammo {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.target = null;

    this.payload = {};
  }

  async generatePayload() {
    const obj = {};

    const searchParams = new URLSearchParams(this.req.url.split("?")[1]);
    for (const [key, value] of searchParams) {
      obj[key] = value;
    }

    const body = await bodyParser(this.req);
    if (body) Object.assign(obj, body);
    this.payload = obj;
  }

  dispatch() {
    const { statusCode, data, contentType } = statusAndData(arguments);
    const contentTypeHeader = { "Content-Type": contentType };

    this.res.writeHead(statusCode, contentTypeHeader);
    this.res.write(data);
    this.res.end();
  }
}

export default Ammo;
