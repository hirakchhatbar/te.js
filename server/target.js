import TejLogger from 'tej-logger';

import isMiddlewareValid from './targets/middleware-validator.js';
import Endpoint from './endpoint.js';

import targetRegistry from './targets/registry.js';

const logger = new TejLogger('Target');

/**
 * Target class represents a base routing configuration for endpoints. Think of it as router in express.
 * It provides functionality to set base paths, add middleware, and register endpoints.
 *
 * @class
 * @example
 * // Create a new target for user-related endpoints
 * const userTarget = new Target('/user');
 *
 * // Add middleware that applies to all user endpoints
 * userTarget.midair(authMiddleware, loggingMiddleware);
 *
 * // Register endpoints
 * userTarget.register('/profile', (ammo) => {
 *   // Handle GET /user/profile
 *   ammo.fire({ name: 'John Doe' });
 * });
 *
 * userTarget.register('/settings', authMiddleware, (ammo) => {
 *   // Handle GET /user/settings with additional auth middleware
 *   ammo.fire({ theme: 'dark' });
 * });
 */
class Target {
  /**
   * Creates a new Target instance.
   *
   * @param {string} [base=''] - The base path for all endpoints registered under this target.
   *                            Must start with '/' if provided.
   * @example
   * const apiTarget = new Target('/api');
   * const userTarget = new Target('/user');
   */
  constructor(base = '') {
    this.base = base;
    this.targetMiddlewares = [];
  }

  /**
   * Sets the base path for the target.
   *
   * @param {string} base - The base path to set. Must start with '/'.
   * @returns {void}
   * @example
   * const target = new Target();
   * target.base('/api/v1');
   */
  base(base) {
    if (!base || !base.startsWith('/')) return;
    this.base = base;
  }

  /**
   * Adds middleware functions to the target.
   * These middleware functions will be applied to all endpoints registered under this target.
   *
   * @param {...Function} middlewares - One or more middleware functions to add.
   * @returns {void}
   * @example
   * // Add authentication middleware to all endpoints
   * target.midair(authMiddleware);
   *
   * // Add multiple middleware functions
   * target.midair(loggingMiddleware, errorHandler, rateLimiter);
   */
  midair() {
    if (!arguments) return;
    const middlewares = [...arguments];

    const validMiddlewares = middlewares.filter(isMiddlewareValid);
    this.targetMiddlewares = this.targetMiddlewares.concat(validMiddlewares);
  }

  /**
   * Registers a new endpoint under this target.
   *
   * @param {string} path - The path for the endpoint, relative to the base path.
   * @param {...Function} [middlewares] - Optional middleware functions specific to this endpoint.
   * @param {Function} shoot - The handler function for the endpoint.
   * @returns {void}
   * @throws {Error} If there's an error registering the endpoint.
   * @example
   * // Register a simple endpoint
   * target.register('/hello', (ammo) => {
   *   ammo.fire({ message: 'Hello World' });
   * });
   *
   * // Register an endpoint with specific middleware
   * target.register('/protected', authMiddleware, (ammo) => {
   *   ammo.fire({ data: 'Protected data' });
   * });
   *
   * // Register an endpoint with multiple middleware
   * target.register('/api/data',
   *   authMiddleware,
   *   rateLimiter,
   *   (ammo) => {
   *     ammo.fire({ data: 'Rate limited data' });
   *   }
   * );
   */
  register() {
    const args = Array.from(arguments);
    if (args.length < 2) {
      logger.error('register(path, [...middlewares], handler) requires at least path and handler. Skipping.');
      return;
    }

    const path = args[0];
    const shoot = args[args.length - 1];

    if (typeof path !== 'string') {
      logger.error(`register() path must be a string, got ${typeof path}. Skipping.`);
      return;
    }
    if (typeof shoot !== 'function') {
      logger.error(`register() last argument (handler) must be a function, got ${typeof shoot}. Skipping.`);
      return;
    }

    const second = args[1];
    const isPlainObject = (v) =>
      typeof v === 'object' &&
      v !== null &&
      !Array.isArray(v) &&
      (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
    const isMetadataObject = isPlainObject(second);

    let middlewares;
    let metadata = null;
    if (isMetadataObject && args.length >= 3) {
      metadata = second;
      middlewares = args.slice(2, -1);
    } else {
      middlewares = args.slice(1, -1);
    }

    try {
      const endpoint = new Endpoint();
      endpoint.setPath(this.base, path);
      if (!endpoint.getPath()) {
        logger.error(`Invalid path for endpoint "${path}". Skipping.`);
        return;
      }
      endpoint.setMiddlewares(middlewares);
      endpoint.setHandler(shoot);
      if (!endpoint.getHandler()) {
        logger.error(`Invalid handler for endpoint "${path}". Skipping.`);
        return;
      }
      if (metadata !== null) {
        endpoint.setMetadata(metadata);
      }
      const group = targetRegistry.getCurrentSourceGroup();
      if (group != null) {
        endpoint.setGroup(group);
      }

      targetRegistry.targets.push(endpoint);
    } catch (error) {
      logger.error(`Error registering target ${path}: ${error.message}`);
    }
  }
}

export default Target;
