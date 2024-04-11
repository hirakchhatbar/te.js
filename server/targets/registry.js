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
    const validMiddlewares = middlewares.filter(
      (middleware) => typeof middleware === "function",
    );
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

  aim(req) {
    const endpoint = req.url.split("?")[0];
    const method = req.method;

    console.log({endpoint, method});

    return this.targets.find((target) => {
      return target.endpoint === endpoint && target.method === method;
    });
  }
}

export default TargetRegistry;
