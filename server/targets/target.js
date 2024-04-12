import TargetRegistry from "./registry.js";
const targetRegistry = new TargetRegistry();

const isEndpointValid = (endpoint) => {
  if (typeof endpoint !== "string") return false;
  if (endpoint.length === 0) return false;
  return endpoint[0] === "/";
};

const isShootValid = (shoot) => typeof shoot === "function";

const isMiddlewareValid = (middleware) => typeof middleware === "function";

class Target {
  constructor(base = "") {
    this.base = base;
    this.targetMiddlewares = [];
  }

  midair() {
    if (!arguments) return;
    const middlewares = [...arguments];
    const validMiddlewares = middlewares.filter(isMiddlewareValid);
    this.targetMiddlewares = this.targetMiddlewares.concat(validMiddlewares);
  }

  register() {
    if (!arguments) return;
    const endpoint = arguments[0];
    const shoot = arguments[arguments.length - 1];
    const middlewares = Array.from(arguments).slice(1, arguments.length - 1);

    if (!isEndpointValid(endpoint)) return;
    if (!isShootValid(shoot)) return;

    const validMiddlewares = middlewares.filter(isMiddlewareValid);

    targetRegistry.targets.push({
      endpoint: this.base + endpoint,
      middlewares: this.targetMiddlewares.concat(validMiddlewares),
      shoot,
    });
  }
}

export default Target;
