import isMiddlewareValid from './middleware-validator.js';
import { standardizePath } from './path-validator.js';

class TargetRegistry {
  constructor() {
    if (TargetRegistry.instance) {
      return TargetRegistry.instance;
    }

    TargetRegistry.instance = this;

    // TODO - Add a default target
    this.targets = [];
    this.globalMiddlewares = [];
  }

  addGlobalMiddleware() {
    if (!arguments) return;

    const middlewares = [...arguments];
    const validMiddlewares = middlewares.filter(isMiddlewareValid);
    this.globalMiddlewares = this.globalMiddlewares.concat(validMiddlewares);
  }

  /**
   * @param {Array || Object} targets
   */
  register(targets) {
    if (Array.isArray(targets)) {
      this.targets = this.targets.concat(targets);
    } else {
      this.targets.push(targets);
    }
  }

  aim(endpoint) {
    return this.targets.find((target) => {
      const standardizedEndpoint = standardizePath(endpoint);
      return target.getPath() === standardizedEndpoint;
    });
  }

  getAllEndpoints(grouped) {
    if (grouped) {
      return this.targets.reduce((acc, target) => {
        const group = target.getPath().split('/')[1];
        if (!acc[group]) acc[group] = [];
        acc[group].push(target.getPath());
        return acc;
      }, {});
    } else {
      return this.targets.map((target) => target.getPath());
    }
  }
}

export default TargetRegistry;
