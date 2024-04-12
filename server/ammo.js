import bodyParser from "../utils/body-parser.js";
import status from "statuses";

class Ammo {
  constructor(req, res) {
    this.req = req;
    this.res = res;

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

  send() {
    let data = arguments[0];
    if (arguments.length > 1) {
      const statusCode = arguments[0];
      data = arguments[1];
      if (!data) data = status[statusCode];
    }

    if (typeof data === "object") {
      this.res.writeHead(200, { "Content-Type": "application/json" });
      this.res.write(JSON.stringify(data));
      this.res.end();
      return;
    }

    if (typeof data === "string") {
      this.res.writeHead(200, { "Content-Type": "text/html" });
      this.res.write(data);
      this.res.end();
      return;
    }

    if (typeof data === "number") {
      this.res.writeHead(data, { "Content-Type": "text/plain" });
      this.res.write(status[data]);
      this.res.end();
      return;
    }

    this.res.writeHead(200, { "Content-Type": "text/plain" });
    this.res.write(data);
    this.res.end();
  }

  sendPretty(data) {
    this.send({

    })
  }
}

export default Ammo;
