import { vi } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  createMockPair,
} from './mock-http.js';

/**
 * Create an Ammo instance with mocked request/response
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Object containing ammo, req, and res
 */
export async function createTestAmmo(options = {}) {
  const { req, res } = createMockPair(options);

  // Dynamically import Ammo to avoid module initialization issues
  const { default: Ammo } = await import('../../server/ammo.js');
  const ammo = new Ammo(req, res);

  return { ammo, req, res };
}

/**
 * Create an enhanced Ammo instance (with enhance() already called)
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Object containing ammo, req, and res
 */
export async function createEnhancedAmmo(options = {}) {
  const { ammo, req, res } = await createTestAmmo(options);

  // Mock the body parser to avoid actual body parsing
  const mockPayload = options.body || {};
  ammo.payload = mockPayload;
  ammo.method = options.method || 'GET';
  ammo.headers = req.headers;
  ammo.ip = req.socket?.remoteAddress || '127.0.0.1';
  ammo.path = options.url || '/';
  ammo.endpoint = options.url || '/';
  ammo.protocol = options.protocol || 'http';
  ammo.hostname = req.headers?.host || 'localhost';
  ammo.fullURL = `${ammo.protocol}://${ammo.hostname}${ammo.path}`;

  // Set HTTP method flags
  ammo.GET = ammo.method === 'GET';
  ammo.POST = ammo.method === 'POST';
  ammo.PUT = ammo.method === 'PUT';
  ammo.DELETE = ammo.method === 'DELETE';
  ammo.PATCH = ammo.method === 'PATCH';
  ammo.HEAD = ammo.method === 'HEAD';
  ammo.OPTIONS = ammo.method === 'OPTIONS';

  return { ammo, req, res };
}

/**
 * Create a fresh TargetRegistry for testing
 * @returns {Object} Fresh registry instance
 */
export function createTestRegistry() {
  // Create a new registry instance (bypasses singleton)
  return {
    targets: [],
    globalMiddlewares: [],
    addGlobalMiddleware(...middlewares) {
      const validMiddlewares = middlewares.filter(
        (m) => typeof m === 'function',
      );
      this.globalMiddlewares = this.globalMiddlewares.concat(validMiddlewares);
    },
    register(targets) {
      if (Array.isArray(targets)) {
        this.targets = this.targets.concat(targets);
      } else {
        this.targets.push(targets);
      }
    },
    aim(endpoint) {
      const standardizedEndpoint =
        endpoint.endsWith('/') && endpoint !== '/'
          ? endpoint.slice(0, -1)
          : endpoint;

      // Exact match
      const exactMatch = this.targets.find(
        (target) => target.getPath() === standardizedEndpoint,
      );
      if (exactMatch) {
        return { target: exactMatch, params: {} };
      }

      // Parameterized route matching
      for (const target of this.targets) {
        const params = this.matchParameterizedRoute(
          target.getPath(),
          standardizedEndpoint,
        );
        if (params !== null) {
          return { target, params };
        }
      }

      return null;
    },
    matchParameterizedRoute(pattern, url) {
      if (pattern === '/' && url === '/') return {};

      const patternSegments = pattern.split('/').filter((s) => s.length > 0);
      const urlSegments = url.split('/').filter((s) => s.length > 0);

      if (patternSegments.length !== urlSegments.length) return null;
      if (patternSegments.length === 0 && urlSegments.length === 0) return {};

      const params = {};
      for (let i = 0; i < patternSegments.length; i++) {
        const patternSegment = patternSegments[i];
        const urlSegment = urlSegments[i];

        if (patternSegment.startsWith(':')) {
          params[patternSegment.slice(1)] = urlSegment;
        } else if (patternSegment !== urlSegment) {
          return null;
        }
      }

      return params;
    },
    getAllEndpoints(grouped) {
      if (grouped) {
        return this.targets.reduce((acc, target) => {
          const group = target.getPath().split('/')[1];
          if (!acc[group]) acc[group] = [];
          acc[group].push(target.getPath());
          return acc;
        }, {});
      }
      return this.targets.map((target) => target.getPath());
    },
    reset() {
      this.targets = [];
      this.globalMiddlewares = [];
    },
  };
}

/**
 * Create a mock endpoint for testing
 * @param {Object} options - Endpoint options
 * @returns {Object} Mock endpoint object
 */
export function createMockEndpoint(options = {}) {
  const path = options.path || '/test';
  const handler = options.handler || vi.fn();
  const middlewares = options.middlewares || [];

  return {
    getPath: () => path,
    getHandler: () => handler,
    getMiddlewares: () => middlewares,
    setPath: vi.fn().mockReturnThis(),
    setHandler: vi.fn().mockReturnThis(),
    setMiddlewares: vi.fn().mockReturnThis(),
  };
}

/**
 * Create a mock middleware function
 * @param {Object} options - Middleware options
 * @returns {Function} Mock middleware
 */
export function createMockMiddleware(options = {}) {
  const {
    name = 'mockMiddleware',
    callNext = true,
    delay = 0,
    throwError = null,
    modifyAmmo = null,
  } = options;

  const middleware = vi.fn(async (ammo, next) => {
    if (delay > 0) {
      await sleep(delay);
    }

    if (throwError) {
      throw throwError;
    }

    if (modifyAmmo && typeof modifyAmmo === 'function') {
      modifyAmmo(ammo);
    }

    if (callNext && next) {
      await next();
    }
  });

  // Add name for debugging
  Object.defineProperty(middleware, 'name', { value: name });

  return middleware;
}

/**
 * Create a middleware that uses Express-style signature (req, res, next)
 * @param {Object} options - Middleware options
 * @returns {Function} Mock Express-style middleware
 */
export function createExpressStyleMiddleware(options = {}) {
  const {
    name = 'expressMiddleware',
    callNext = true,
    delay = 0,
    throwError = null,
  } = options;

  const middleware = vi.fn(async (req, res, next) => {
    if (delay > 0) {
      await sleep(delay);
    }

    if (throwError) {
      throw throwError;
    }

    if (callNext && next) {
      await next();
    }
  });

  Object.defineProperty(middleware, 'name', { value: name });

  return middleware;
}

/**
 * Sleep utility for async tests
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function returning boolean
 * @param {Object} options - Wait options
 * @returns {Promise<void>}
 */
export async function waitFor(condition, options = {}) {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`waitFor: Condition not met within ${timeout}ms`);
}

/**
 * Create a mock file object for upload tests
 * @param {Object} options - File options
 * @returns {Object} Mock file object
 */
export function createMockFile(options = {}) {
  return {
    fieldName: options.fieldName || 'file',
    originalFilename: options.filename || 'test.txt',
    filepath: options.filepath || '/tmp/upload_test.txt',
    mimetype: options.mimetype || 'text/plain',
    size: options.size || 1024,
    newFilename: options.newFilename || 'upload_test.txt',
    hash: options.hash || null,
    lastModifiedDate: options.lastModifiedDate || new Date(),
  };
}

/**
 * Create a mock storage for rate limiting tests
 * @returns {Object} Mock storage object
 */
export function createMockStorage() {
  const store = new Map();

  return {
    get: vi.fn((key) => store.get(key)),
    set: vi.fn((key, value, ttl) => {
      store.set(key, value);
      return true;
    }),
    increment: vi.fn((key, amount = 1) => {
      const current = store.get(key) || 0;
      const newValue = current + amount;
      store.set(key, newValue);
      return newValue;
    }),
    decrement: vi.fn((key, amount = 1) => {
      const current = store.get(key) || 0;
      const newValue = Math.max(0, current - amount);
      store.set(key, newValue);
      return newValue;
    }),
    delete: vi.fn((key) => store.delete(key)),
    has: vi.fn((key) => store.has(key)),
    clear: vi.fn(() => store.clear()),
    _store: store, // Expose for testing
  };
}

/**
 * Assert response has expected status and optional body
 * @param {Object} res - Mock response object
 * @param {number} expectedStatus - Expected status code
 * @param {any} expectedBody - Optional expected body (string or object)
 */
export function assertResponse(res, expectedStatus, expectedBody) {
  if (expectedStatus !== undefined) {
    if (res.statusCode !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, got ${res.statusCode}. Body: ${res.getBody()}`,
      );
    }
  }

  if (expectedBody !== undefined) {
    const body = res.getBody();
    if (typeof expectedBody === 'object') {
      const jsonBody = res.getJsonBody();
      if (JSON.stringify(jsonBody) !== JSON.stringify(expectedBody)) {
        throw new Error(
          `Body mismatch. Expected: ${JSON.stringify(expectedBody)}, Got: ${JSON.stringify(jsonBody)}`,
        );
      }
    } else if (body !== expectedBody) {
      throw new Error(`Body mismatch. Expected: ${expectedBody}, Got: ${body}`);
    }
  }
}

/**
 * Mock console methods for cleaner test output
 * @returns {Object} Object with restore function
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();

  return {
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    },
    mocks: {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    },
  };
}

/**
 * Capture all response data for assertion
 * @param {Object} res - Mock response object
 * @returns {Object} Captured response data
 */
export function captureResponse(res) {
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: { ...res.headers },
    body: res.getBody(),
    jsonBody: res.getJsonBody(),
    headersSent: res.headersSent,
    finished: res.finished,
  };
}

export default {
  createTestAmmo,
  createEnhancedAmmo,
  createTestRegistry,
  createMockEndpoint,
  createMockMiddleware,
  createExpressStyleMiddleware,
  sleep,
  waitFor,
  createMockFile,
  createMockStorage,
  assertResponse,
  mockConsole,
  captureResponse,
};
