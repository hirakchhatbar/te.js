import isMiddlewareValid from './middleware-validator.js';
import { standardizePath } from './path-validator.js';

class TargetRegistry {
  constructor() {
    if (TargetRegistry.instance) {
      return TargetRegistry.instance;
    }

    TargetRegistry.instance = this;

    // TODO - Add a default target
    this.targets = [];
    this.globalMiddlewares = [];
    /** Current source group (target file id) set by loader before importing a target file. */
    this._currentSourceGroup = null;
  }

  setCurrentSourceGroup(group) {
    this._currentSourceGroup = group ?? null;
  }

  getCurrentSourceGroup() {
    return this._currentSourceGroup;
  }

  addGlobalMiddleware() {
    if (!arguments) return;

    const middlewares = [...arguments];
    const validMiddlewares = middlewares.filter(isMiddlewareValid);
    this.globalMiddlewares = this.globalMiddlewares.concat(validMiddlewares);
  }

  /**
   * @param {Array || Object} targets
   */
  register(targets) {
    if (Array.isArray(targets)) {
      this.targets = this.targets.concat(targets);
    } else {
      this.targets.push(targets);
    }
  }

  /**
   * Matches an endpoint URL to a registered target, supporting parameterized routes.
   *
   * @param {string} endpoint - The endpoint URL to match
   * @returns {Object|null} An object with `target` and `params`, or null if no match
   */
  aim(endpoint) {
    const standardizedEndpoint = standardizePath(endpoint);

    // First, try exact match (most specific)
    const exactMatch = this.targets.find((target) => {
      return target.getPath() === standardizedEndpoint;
    });

    if (exactMatch) {
      return { target: exactMatch, params: {} };
    }

    // Then, try parameterized route matching
    for (const target of this.targets) {
      const targetPath = target.getPath();
      const params = this.matchParameterizedRoute(
        targetPath,
        standardizedEndpoint,
      );

      if (params !== null) {
        return { target, params };
      }
    }

    return null;
  }

  /**
   * Matches a parameterized route pattern against an actual URL.
   *
   * @param {string} pattern - The route pattern (e.g., '/api/categories/:id')
   * @param {string} url - The actual URL to match (e.g., '/api/categories/123')
   * @returns {Object|null} An object with extracted parameters, or null if no match
   */
  matchParameterizedRoute(pattern, url) {
    // Handle root path case
    if (pattern === '/' && url === '/') {
      return {};
    }

    // Split both pattern and URL into segments
    const patternSegments = pattern.split('/').filter((s) => s.length > 0);
    const urlSegments = url.split('/').filter((s) => s.length > 0);

    // If both are empty (root paths), they match
    if (patternSegments.length === 0 && urlSegments.length === 0) {
      return {};
    }

    // Must have same number of segments
    if (patternSegments.length !== urlSegments.length) {
      return null;
    }

    const params = {};

    // Match each segment
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];
      const urlSegment = urlSegments[i];

      // If it's a parameter (starts with :)
      if (patternSegment.startsWith(':')) {
        const paramName = patternSegment.slice(1); // Remove the ':'
        params[paramName] = urlSegment;
      } else if (patternSegment !== urlSegment) {
        // If it's not a parameter and doesn't match, no match
        return null;
      }
    }

    return params;
  }

  /**
   * Get all registered endpoints.
   *
   * @param {boolean|{ detailed?: boolean, grouped?: boolean }} [options] - If boolean, treated as grouped (backward compat).
   *   If object: detailed=true returns full metadata per endpoint; grouped=true returns paths grouped by first segment.
   * @returns {string[]|Object|Array<{ path: string, metadata: object|null, handler: function }>}
   */
  getAllEndpoints(options = {}) {
    const grouped =
      typeof options === 'boolean' ? options : options && options.grouped;
    const detailed =
      typeof options === 'object' && options && options.detailed === true;

    if (detailed) {
      return this.targets.map((t) => ({
        path: t.getPath(),
        metadata: t.getMetadata(),
        handler: t.getHandler(),
      }));
    }
    if (grouped) {
      return this.targets.reduce((acc, target) => {
        const group = target.getPath().split('/')[1];
        if (!acc[group]) acc[group] = [];
        acc[group].push(target.getPath());
        return acc;
      }, {});
    }
    return this.targets.map((target) => target.getPath());
  }
}

const targetRegistry = new TargetRegistry();
export default targetRegistry;
