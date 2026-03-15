import isMiddlewareValid from './targets/middleware-validator.js';
import { isPathValid, standardizePath } from './targets/path-validator.js';
import isShootValid from './targets/shoot-validator.js';

/**
 * Represents a single route endpoint: a path, handler, optional middlewares,
 * allowed HTTP methods, and documentation metadata.
 *
 * Use the fluent builder methods to configure before registering with a Target.
 */
class Endpoint {
  /**
   * Create a new Endpoint with empty defaults.
   */
  constructor() {
    this.path = '';
    this.middlewares = [];
    this.handler = null;
    this.metadata = null;
    /** Allowed HTTP methods (e.g. ['GET', 'POST']). null = method-agnostic. */
    this.methods = null;
    /** Source group (e.g. target file id) for grouping in docs. Set by loader before register(). */
    this.group = null;
  }

  /**
   * Set the full path by combining a base path and a path segment.
   * @param {string} base - Base path (e.g. '/api')
   * @param {string} path - Route path segment (e.g. '/users')
   * @returns {Endpoint}
   */
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

  setMetadata(metadata) {
    this.metadata = metadata ?? null;
    return this;
  }

  /**
   * @param {string[]|null} methods - Allowed HTTP methods (e.g. ['GET', 'POST']). null = method-agnostic.
   */
  setMethods(methods) {
    if (methods == null) {
      this.methods = null;
      return this;
    }
    const arr = Array.isArray(methods) ? methods : [methods];
    let normalized = arr.map((m) => String(m).toUpperCase()).filter(Boolean);
    if (normalized.includes('GET') && !normalized.includes('HEAD')) {
      normalized = [...normalized, 'HEAD'];
    }
    this.methods = normalized.length > 0 ? normalized : null;
    return this;
  }

  setGroup(group) {
    this.group = group ?? null;
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

  getMetadata() {
    return this.metadata;
  }

  getMethods() {
    return this.methods;
  }

  getGroup() {
    return this.group;
  }
}

export default Endpoint;
