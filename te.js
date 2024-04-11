import { createServer } from "node:http";

import TejLogger from "./logger/index.js";
import ConfigController from "./utils/config-controller.js";

import TargetRegistry from "./server/targets/registry.js";
import Target from "./server/targets/target.js";
import targetHandler from "./server/targets/handler.js";

class Tejas {
  /*
   * Constructor for Tejas
   * @param {Object} options - Options for Tejas
   * @param {Boolean} options.debug - Debug mode
   * @param {Number} options.port - Port to listen on
   * @param {Boolean} options.mongoDB - Whether to connect to MongoDB
   */
  constructor(options) {
    if (Tejas.instance) return Tejas.instance;

    this.config = new ConfigController(options).generate();
    this.logger = new TejLogger("Tejas");
    this.targetRegistry = new TargetRegistry();
    this.checklist = [];

    Tejas.instance = this;
  }

  midair() {
    if (!arguments) return;
    this.targetRegistry.addGlobalMiddleware(...arguments);
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

export {Tejas, Target};
