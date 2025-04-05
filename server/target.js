import TejLogger from 'tej-logger';

import isMiddlewareValid from './targets/middleware-validator.js';
import Endpoint from './endpoint.js';

import TargetRegistry from './targets/registry.js';
const targetRegistry = new TargetRegistry();

const logger = new TejLogger('Target');

class Target {
  constructor(base = '') {
    this.base = base;
    this.useCache = false;
    this.clearCache = false;
    this.targetMiddlewares = [];
  }

  base(base) {
    if (!base || !base.startsWith('/')) return;
    this.base = base;
  }

  midair() {
    if (!arguments) return;
    const middlewares = [...arguments];

    const validMiddlewares = middlewares.filter(isMiddlewareValid);
    this.targetMiddlewares = this.targetMiddlewares.concat(validMiddlewares);
  }

  register() {
    let args = arguments;
    if (!args) return;

    const path = args[0];
    const shoot = args[args.length - 1];
    const middlewares = Array.from(args).slice(1, args.length - 1);

    try {
      const endpoint = new Endpoint();
      endpoint
        .setPath(this.base, path)
        .setMiddlewares(middlewares)
        .setHandler(shoot);

      targetRegistry.targets.push(endpoint);
    } catch (error) {
      logger.error(`Error registering target ${path}: ${error.message}`);
    }
  }
}

export default Target;
