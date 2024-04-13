import isMiddlewareValid from '../../utils/middleware-validator.js';
import TargetRegistry from './registry.js';

const targetRegistry = new TargetRegistry();

const isEndpointValid = (endpoint) => {
  if (typeof endpoint !== 'string') return false;
  if (endpoint.length === 0) return false;
  return endpoint[0] === '/';
};

const isShootValid = (shoot) => typeof shoot === 'function';

const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

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
    let allowedMethods = validMethods;
    let args = arguments;
    if (!args) return;

    if (validMethods.includes(args[0])) {
      allowedMethods = [args[0]];
      args = arguments[1];
    }

    const endpoint = args[0];
    const shoot = args[args.length - 1];
    const middlewares = Array.from(args).slice(1, args.length - 1);

    if (!isEndpointValid(endpoint)) return;
    if (!isShootValid(shoot)) return;

    const validMiddlewares = middlewares.filter(isMiddlewareValid);

    targetRegistry.targets.push({
      allowedMethods: allowedMethods.length > 0 ? allowedMethods : validMethods,
      endpoint: this.base + endpoint,
      middlewares: this.targetMiddlewares.concat(validMiddlewares),
      shoot,
    });
  }
}

export default Target;
