import { createServer } from "node:http";
import app from "./routing/app.js";
import TejLogger from "../logger/index.js";
import TejEnv from "./../../tej-env/index.js";

TejEnv.init();

class TejasServer {
  constructor() {
    this.logger = new TejLogger("TejasServer");
    this.PORT = TejEnv.get("PORT") || 3000;
  }

  takeoff() {
    this.server = createServer(app);
    this.server.listen(this.PORT, () => {
      this.logger.info(`Server is running on port ${this.PORT}`);
    });
  }
}

export default TejasServer;
