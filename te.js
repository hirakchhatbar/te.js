import { createServer } from 'node:http';

import { env, setEnv } from 'tej-env';
import TejLogger from 'tej-logger';

import TargetRegistry from './server/targets/registry.js';
import Target from './server/target.js';

import { loadConfigFile, standardizeObj } from './utils/configuration.js';

import targetHandler from './server/handler.js';

class Tejas {
  /*
   * Constructor for Tejas
   * @param {Object} options - Options for Tejas
   * @param {Number} options.port - Port to run Tejas on
   * @param {Boolean} options.log.http_requests - Whether to log incoming HTTP requests
   * @param {Boolean} options.log.exceptions - Whether to log exceptions
   */
  constructor(options) {
    if (Tejas.instance) return Tejas.instance;

    this.generateConfiguration(options);
    this.logger = new TejLogger('Tejas');
    this.targetRegistry = new TargetRegistry();
    this.checklist = [];

    Tejas.instance = this;
  }

  generateConfiguration(options) {
    const configVars = standardizeObj(loadConfigFile());
    const envVars = standardizeObj(process.env);
    const userVars = standardizeObj(options);

    const config = { ...configVars, ...envVars, ...userVars };
    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        setEnv(key, config[key]);
      }
    }

    // Load defaults
    if (!env('PORT')) setEnv('PORT', 1403);
  }

  midair() {
    if (!arguments) return;
    this.targetRegistry.addGlobalMiddleware(...arguments);
  }

  takeoff() {
    this.engine = createServer(targetHandler);
    this.engine.listen(env('PORT'), () => {
      this.logger.info(`Tejas took off from port ${env('PORT')}`);
    });

    this.engine.on('listening', () => {
      for (const next of this.checklist) {
        if (typeof next === 'function') next();
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

export { Tejas, Target };
