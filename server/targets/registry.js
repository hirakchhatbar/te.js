import isMiddlewareValid from './middleware-validator.js';

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

  aim(method, endpoint) {
    return this.targets.find((target) => {
      return target.endpoint === endpoint;
    });
  }

  getAllEndpoints(grouped) {
    if (grouped) {
      return this.targets.reduce((acc, target) => {
        const group = target.endpoint.split('/')[1];
        if (!acc[group]) acc[group] = [];
        acc[group].push(target.endpoint);
        return acc;
      }, {});
    } else {
      return this.targets.map((target) => target.endpoint);
    }
  }
}

export default TargetRegistry;
