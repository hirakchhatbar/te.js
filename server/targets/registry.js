class TargetRegistry {
  constructor() {
    if (TargetRegistry.instance) {
      return TargetRegistry.instance;
    }

    TargetRegistry.instance = this;

    // TODO - Add a default target
    this.targets = [];
  }

  /**
   * @param {Array || Object} targets
   */
  register(targets) {
    console.log(targets);
    if (Array.isArray(targets)) {
      this.targets.push(...targets);
    } else {
      this.targets.push(targets);
    }
  }

  aim(req) {
    const endpoint = req.url.split("?")[0];
    const method = req.method;

    return this.targets.find((target) => {
      return target.endpoint === endpoint && target.method === method;
    });
  }
}

export default TargetRegistry;
