import TargetRegistry from "./registry.js";
const targetRegistry = new TargetRegistry();

const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
const isMethodAllowed = (method) => methods.includes(method.toUpperCase());

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
    const method = arguments[0];
    const endpoint = arguments[1];
    const shoot = arguments[arguments.length - 1];
    const middlewares = Array.from(arguments).slice(2, arguments.length - 1);

    if (!isMethodAllowed(method)) return;
    if (!isEndpointValid(endpoint)) return;
    if (!isShootValid(shoot)) return;

    const validMiddlewares = middlewares.filter(isMiddlewareValid);

    targetRegistry.targets.push({
      method,
      endpoint: this.base + endpoint,
      middlewares: this.targetMiddlewares.concat(validMiddlewares),
      shoot,
    });
  }
}

export default Target;
