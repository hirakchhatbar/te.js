import { createServer } from "node:http";
import targetHandler from "./server/targets/handler.js";

import TargetRegistry from "./server/targets/registry.js";
import ConfigController from "./utils/config-controller.js";
import TejLogger from "./logger/index.js";

import Target from "./server/targets/target.js";
const router = new Target();

class Tejas {
  /*
   * Constructor for Tejas
   * @param {Object} options - Options for Tejas
   * @param {Boolean} options.debug - Debug mode
   * @param {Number} options.port - Port to listen on
   * @param {Boolean} options.mongoDB - Whether to connect to MongoDB
   */
  constructor(options) {
    this.config = new ConfigController(options).generate();
    this.logger = new TejLogger("Tejas");
    this.targetRegistry = new TargetRegistry();
    this.checklist = [];
  }

  target(router) {
    if (router instanceof Target) this.targetRegistry.register(router.targets);
    else console.error("Router is not an instance of Target");
  }

  takeoff() {
    this.engine = createServer(targetHandler);
    this.engine.listen(this.config.port, () => {
      this.logger.info(`Tejas took off from port ${this.config.port}`);
    });

    this.engine.on("listening", () => {
      for (const next of this.checklist) {
        if (typeof next === "function") next();
        else
          this.logger.error(
            `Checklist item ${next} is not a function. Skipping...`,
          );
      }
    });
  }

  onRunway(...checklist) {
    this.checklist.push(...checklist);
  }
}

export { Tejas, router};
