import TargetRegistry from './registry.js';

class Target {
  constructor() {
    this.targets = [];
    this.targetRegistry = new TargetRegistry();
  }

  get() {
    const endpoint = arguments[0];
    const shoot = arguments[arguments.length - 1];
    const middlewares = Array.prototype.slice.call(arguments, 1,
        arguments.length - 1);

    this.targets.push({
      method: 'GET',
      endpoint,
      middlewares,
      shoot,
    });
  }

  post() {
    const endpoint = arguments[0];
    const shoot = arguments[arguments.length - 1];
    const middlewares = Array.prototype.slice.call(arguments, 1,
        arguments.length - 1);

    this.targets.push({
      method: 'POST',
      endpoint,
      middlewares,
      shoot,
    });
  }

  put() {
    const endpoint = arguments[0];
    const shoot = arguments[arguments.length - 1];
    const middlewares = Array.prototype.slice.call(arguments, 1,
        arguments.length - 1);

    this.targets.push({
      method: 'PUT',
      endpoint,
      middlewares,
      shoot,
    });
  }

  delete() {
    const endpoint = arguments[0];
    const shoot = arguments[arguments.length - 1];
    const middlewares = Array.prototype.slice.call(arguments, 1,
        arguments.length - 1);

    this.targets.push({
      method: 'GET',
      endpoint,
      middlewares,
      shoot,
    });
  }

  use() {
    const endpoint = arguments[0];
    const router = arguments[arguments.length - 1];
    console.log(endpoint, router);
    const middlewares = Array.prototype.slice.call(arguments, 1,
        arguments.length - 1);

    return

    if (router instanceof Target) {
      console.log("Registering a bunch of targets for", endpoint)
      this.targetRegistry.register(router.targets.map((target) => {
        return {
          ...target,
          endpoint: `${endpoint}${target.endpoint}`,
          middlewares: [...middlewares, ...target.middlewares],
        };
      }));
    } else {
      console.log('targets NOT instanceof this');
    }
  }
}

export default Target;
