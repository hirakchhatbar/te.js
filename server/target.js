import isMiddlewareValid from './targets/middleware-validator.js';
import TargetRegistry from './targets/registry.js';

const targetRegistry = new TargetRegistry();

const isEndpointValid = (endpoint) => {
  if (typeof endpoint !== 'string') return false;
  if (endpoint.length === 0) return false;
  return endpoint[0] === '/';
};

const isShootValid = (shoot) => typeof shoot === 'function';

class Target {
  constructor(base = '') {
    this.base = base;
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

    const endpoint = args[0];
    if (!isEndpointValid(endpoint)) return;

    const shoot = args[args.length - 1];
    if (!isShootValid(shoot)) return;

    const middlewares = Array.from(args).slice(1, args.length - 1);
    const validMiddlewares = middlewares.filter(isMiddlewareValid);

    targetRegistry.targets.push({
      endpoint: this.base + endpoint,
      middlewares: this.targetMiddlewares.concat(validMiddlewares),
      shoot,
    });
  }
}

export default Target;
