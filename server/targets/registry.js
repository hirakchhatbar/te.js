class TargetRegistry {
  constructor() {
    if (TargetRegistry.instance) {
      return TargetRegistry.instance;
    }

    TargetRegistry.instance = this;
    this.targets = [];
  }

  /**
   * @param {Array || Object} targets
   */
  register(targets) {
    if (Array.isArray(targets)) {
      this.targets.push(...targets);
    } else {
      this.targets.push(targets);
    }
  }

  aim(req) {
    const endpoint = req.url;
    const method = req.method;

    return this.targets.find((target) => {
      return target.endpoint === endpoint && target.method === method;
    });
  }
}

export default TargetRegistry;
