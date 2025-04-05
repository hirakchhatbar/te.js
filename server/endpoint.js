import isMiddlewareValid from './targets/middleware-validator.js';
import { isPathValid, standardizePath } from './targets/path-validator.js';
import isShootValid from './targets/shoot-validator.js';

class Endpoint {
  constructor() {
    this.path = '';
    this.middlewares = [];
    this.handler = null;
  }

  setPath(base, path) {
    const standardizedBase = standardizePath(base);
    const standardizedPath = standardizePath(path);

    let fullPath = `${standardizedBase}${standardizedPath}`;
    if (fullPath.length === 0) fullPath = '/';

    if (!isPathValid(fullPath)) return this;

    this.path = fullPath;
    return this;
  }

  setMiddlewares(middlewares) {
    const validMiddlewares = middlewares.filter(isMiddlewareValid);
    if (validMiddlewares.length === 0) return this;

    this.middlewares = this.middlewares.concat(validMiddlewares);
    return this;
  }

  setHandler(handler) {
    if (!isShootValid(handler)) return this;
    this.handler = handler;

    return this;
  }

  getPath() {
    return this.path;
  }

  getMiddlewares() {
    return this.middlewares;
  }

  getHandler() {
    return this.handler;
  }
}

export default Endpoint;
