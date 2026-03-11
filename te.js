import { createServer } from 'node:http';
import { env, setEnv } from 'tej-env';
import TejLogger from 'tej-logger';
import rateLimiter from './rate-limit/index.js';
import corsMiddleware from './cors/index.js';

import targetRegistry from './server/targets/registry.js';
import dbManager from './database/index.js';

import { loadConfigFile, standardizeObj } from './utils/configuration.js';

import targetHandler from './server/handler.js';
import {
  getErrorsLlmConfig,
  validateErrorsLlmAtTakeoff,
} from './utils/errors-llm-config.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { findTargetFiles } from './utils/auto-register.js';
import { registerDocRoutes } from './auto-docs/ui/docs-ui.js';

const logger = new TejLogger('Tejas');

/**
 * Main Tejas Framework Class
 *
 * @class
 * @description
 * Tejas is a Node.js framework for building powerful backend services.
 * It provides features like routing, middleware support, database connections,
 * and automatic target (route) registration.
 */
class Tejas {
  /**
   * Creates a new Tejas instance with the specified configuration
   *
   * @param {Object} [args] - Configuration options for Tejas
   * @param {number} [args.port] - Port number to run the server on (defaults to 1403)
   * @param {Object} [args.log] - Logging configuration
   * @param {boolean} [args.log.http_requests] - Whether to log incoming HTTP requests
   * @param {boolean} [args.log.exceptions] - Whether to log exceptions
   * @param {Object} [args.db] - Database configuration options
   * @param {Object} [args.withRedis] - Redis connection configuration
   * @param {boolean} [args.withRedis.isCluster=false] - Whether to use Redis Cluster
   * @param {Object} [args.withRedis.socket] - Redis socket connection options
   * @param {string} [args.withRedis.socket.host] - Redis server hostname
   * @param {number} [args.withRedis.socket.port] - Redis server port
   * @param {boolean} [args.withRedis.socket.tls] - Whether to use TLS for connection
   * @param {string} [args.withRedis.url] - Redis connection URL (alternative to socket config)
   */
  constructor(args) {
    if (Tejas.instance) return Tejas.instance;
    Tejas.instance = this;

    this.options = args || {};

    this.generateConfiguration();
    this.registerTargetsDir();
  }

  /**
   * Generates and loads configuration from multiple sources
   *
   * @private
   * @description
   * Loads and merges configuration from:
   * 1. tejas.config.json file (lowest priority)
   * 2. Environment variables
   * 3. Constructor options (highest priority)
   *
   * All configuration keys are standardized to uppercase and flattened.
   * Sets default values for required configuration if not provided.
   */
  generateConfiguration() {
    const configVars = standardizeObj(loadConfigFile());
    const envVars = standardizeObj(process.env);
    const userVars = standardizeObj(this.options);

    const config = { ...configVars, ...envVars, ...userVars };

    for (const key in config) {
      if (config.hasOwnProperty(key)) {
        setEnv(key, config[key]);
      }
    }

    // Set default values for required configuration if not provided
    if (!env('PORT')) setEnv('PORT', 1403);
    if (!env('BODY_MAX_SIZE')) setEnv('BODY_MAX_SIZE', 10 * 1024 * 1024); // 10MB default
    if (!env('BODY_TIMEOUT')) setEnv('BODY_TIMEOUT', 30000); // 30 seconds default
  }

  /**
   * Registers global middleware functions
   *
   * @param {...Function} arguments - Middleware functions to register globally
   * @description
   * Middleware functions are executed in order for all incoming requests.
   * Each middleware should have the signature (ammo, next) or (req, res, next).
   *
   * @example
   * app.midair(
   *   (ammo, next) => {
   *     console.log('Request received');
   *     next();
   *   },
   *   authenticationMiddleware
   * );
   */
  midair() {
    if (arguments.length === 0) return;
    targetRegistry.addGlobalMiddleware(...arguments);
  }

  /**
   * Automatically registers target files from the configured directory
   *
   * @private
   * @description
   * Searches for and registers all files ending in 'target.js' from the
   * directory specified by DIR_TARGETS environment variable.
   * Target files define routes and their handlers.
   *
   * @throws {Error} If target files cannot be registered
   */
  registerTargetsDir() {
    const baseDir = path.join(process.cwd(), process.env.DIR_TARGETS || '');
    findTargetFiles()
      .then((targetFiles) => {
        if (!targetFiles?.length) return;
        (async () => {
          for (const file of targetFiles) {
            const parentPath = file.path || '';
            const fullPath = path.isAbsolute(parentPath)
              ? path.join(parentPath, file.name)
              : path.join(baseDir, parentPath, file.name);
            const relativePath = path.relative(baseDir, fullPath);
            const groupId =
              relativePath.replace(/\.target\.js$/i, '').replace(/\\/g, '/') ||
              'index';
            targetRegistry.setCurrentSourceGroup(groupId);
            try {
              await import(pathToFileURL(fullPath).href);
            } finally {
              targetRegistry.setCurrentSourceGroup(null);
            }
          }
        })().catch((err) => {
          logger.error(
            `Tejas could not register target files. Error: ${err}`,
            false,
          );
        });
      })
      .catch((err) => {
        logger.error(
          `Tejas could not register target files. Error: ${err}`,
          false,
        );
      });
  }

  /**
   * Starts the Tejas server
   *
   * @param {Object} [options] - Server configuration options
   * @param {Object} [options.withRedis] - Redis connection options
   * @param {Object} [options.withMongo] - MongoDB connection options (https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/)
   * @description
   * Creates and starts an HTTP server on the configured port.
   * Optionally initializes Redis and/or MongoDB connections if configuration is provided.
   * For Redis, accepts cluster flag and all connection options supported by node-redis package.
   * For MongoDB, accepts all connection options supported by the official MongoDB Node.js driver.
   *
   * @example
   * const app = new Tejas();
   *
   * // Start server with Redis and MongoDB
   * app.takeoff({
   *   withRedis: {
   *     url: 'redis://alice:foobared@awesome.redis.server:6380',
   *     isCluster: false
   *   },
   *   withMongo: { url: 'mongodb://localhost:27017/mydatabase' }
   * });
   *
   * // Start server with only Redis using defaults
   * app.takeoff({
   *   withRedis: { url: 'redis://localhost:6379' }
   * });
   *
   * // Start server without databases
   * app.takeoff(); // Server starts on default port 1403
   */
  takeoff({ withRedis, withMongo } = {}) {
    validateErrorsLlmAtTakeoff();
    const errorsLlm = getErrorsLlmConfig();
    if (errorsLlm.enabled) {
      logger.info(
        `errors.llm enabled successfully — baseURL: ${errorsLlm.baseURL}, model: ${errorsLlm.model}, messageType: ${errorsLlm.messageType}, apiKey: ${errorsLlm.apiKey ? '***' : '(missing)'}`,
      );
    }
    this.engine = createServer(targetHandler);
    this.engine.listen(env('PORT'), async () => {
      logger.info(`Took off from port ${env('PORT')}`);

      if (withRedis) await this.withRedis(withRedis);
      if (withMongo) await this.withMongo(withMongo);
    });

    this.engine.on('error', (err) => {
      logger.error(`Server error: ${err}`);
    });
  }

  /**
   * Initializes a Redis connection
   *
   * @param {Object} [config] - Redis connection configuration
   * @param {boolean} [config.isCluster=false] - Whether to use Redis Cluster
   * @param {Object} [config.socket] - Redis socket connection options
   * @param {string} [config.socket.host] - Redis server hostname
   * @param {number} [config.socket.port] - Redis server port
   * @param {boolean} [config.socket.tls] - Whether to use TLS for connection
   * @param {string} [config.url] - Redis connection URL (alternative to socket config)
   * @returns {Promise<Tejas>} Returns a Promise that resolves to this instance for chaining
   *
   * @example
   * // Initialize Redis with URL
   * await app.withRedis({
   *   url: 'redis://localhost:6379'
   * }).withRateLimit({
   *   maxRequests: 100,
   *   store: 'redis'
   * });
   *
   * @example
   * // Initialize Redis with socket options
   * await app.withRedis({
   *   socket: {
   *     host: 'localhost',
   *     port: 6379
   *   }
   * });
   */
  async withRedis(config) {
    if (config) {
      await dbManager.initializeConnection('redis', config);
    } else {
      logger.warn(
        'No Redis configuration provided. Skipping Redis connection.',
      );
    }

    return this;
  }

  /**
   * Initializes a MongoDB connection
   *
   * @param {Object} [config] - MongoDB connection configuration
   * @param {string} [config.uri] - MongoDB connection URI
   * @param {Object} [config.options] - Additional MongoDB connection options
   * @returns {Tejas} Returns a Promise that resolves to this instance for chaining
   *
   * @example
   * // Initialize MongoDB with URI
   * await app.withMongo({
   *   uri: 'mongodb://localhost:27017/myapp'
   * });
   *
   * @example
   * // Initialize MongoDB with options
   * await app.withMongo({
   *   uri: 'mongodb://localhost:27017/myapp',
   *   options: {
   *     useNewUrlParser: true,
   *     useUnifiedTopology: true
   *   }
   * });
   *
   * @example
   * // Chain database connections
   * await app
   *   .withMongo({
   *     uri: 'mongodb://localhost:27017/myapp'
   *   })
   *   .withRedis({
   *     url: 'redis://localhost:6379'
   *   })
   *   .withRateLimit({
   *     maxRequests: 100,
   *     store: 'redis'
   *   });
   */
  withMongo(config) {
    if (config) {
      dbManager.initializeConnection('mongodb', config);
    } else {
      logger.warn(
        'No MongoDB configuration provided. Skipping MongoDB connection.',
      );
    }
    return this;
  }

  /**
   * Enables LLM-inferred error codes and messages for ammo.throw() and framework-caught errors.
   * Call before takeoff(). Remaining options can come from env/tejas.config.json (LLM_* / ERRORS_LLM_*).
   * Validation runs at takeoff.
   *
   * @param {Object} [config] - Optional errors.llm overrides
   * @param {string} [config.baseURL] - LLM provider endpoint (e.g. https://api.openai.com/v1)
   * @param {string} [config.apiKey] - LLM provider API key
   * @param {string} [config.model] - Model name (e.g. gpt-4o-mini)
   * @param {'endUser'|'developer'} [config.messageType] - Default message tone
   * @param {'sync'|'async'} [config.mode] - 'sync' blocks the response until LLM returns (default); 'async' responds immediately with 500 and dispatches LLM result to a channel
   * @param {number} [config.timeout] - LLM fetch timeout in milliseconds (default 10000)
   * @param {'console'|'log'|'both'} [config.channel] - Output channel for async mode results (default 'console')
   * @param {string} [config.logFile] - Path to JSONL log file used by 'log' and 'both' channels (default './errors.llm.log')
   * @param {number} [config.rateLimit] - Max LLM calls per minute across all requests (default 10)
   * @param {boolean} [config.cache] - Cache LLM results by throw site + error message to avoid repeated calls (default true)
   * @param {number} [config.cacheTTL] - How long cached results are reused in milliseconds (default 3600000 = 1 hour)
   * @returns {Tejas} The Tejas instance for chaining
   *
   * @example
   * app.withLLMErrors();
   * app.takeoff();
   *
   * @example
   * app.withLLMErrors({ baseURL: 'https://api.openai.com/v1', apiKey: process.env.OPENAI_KEY, model: 'gpt-4o-mini' });
   * app.takeoff();
   *
   * @example
   * app.withLLMErrors({ mode: 'async', channel: 'both', rateLimit: 20 });
   * app.takeoff();
   */
  withLLMErrors(config) {
    setEnv('ERRORS_LLM_ENABLED', true);
    if (config && typeof config === 'object') {
      if (config.baseURL != null) setEnv('ERRORS_LLM_BASE_URL', config.baseURL);
      if (config.apiKey != null) setEnv('ERRORS_LLM_API_KEY', config.apiKey);
      if (config.model != null) setEnv('ERRORS_LLM_MODEL', config.model);
      if (config.messageType != null)
        setEnv('ERRORS_LLM_MESSAGE_TYPE', config.messageType);
      if (config.mode != null) setEnv('ERRORS_LLM_MODE', config.mode);
      if (config.timeout != null) setEnv('ERRORS_LLM_TIMEOUT', config.timeout);
      if (config.channel != null) setEnv('ERRORS_LLM_CHANNEL', config.channel);
      if (config.logFile != null) setEnv('ERRORS_LLM_LOG_FILE', config.logFile);
      if (config.rateLimit != null)
        setEnv('ERRORS_LLM_RATE_LIMIT', config.rateLimit);
      if (config.cache != null) setEnv('ERRORS_LLM_CACHE', config.cache);
      if (config.cacheTTL != null)
        setEnv('ERRORS_LLM_CACHE_TTL', config.cacheTTL);
    }
    return this;
  }

  /**
   * Adds global rate limiting to all endpoints
   *
   * @param {Object} config - Rate limiting configuration
   * @param {number} [config.maxRequests=60] - Maximum number of requests allowed in the time window
   * @param {number} [config.timeWindowSeconds=60] - Time window in seconds
   * @param {string} [config.algorithm='sliding-window'] - Rate-limiting algorithm ('token-bucket', 'sliding-window', or 'fixed-window')
   * @param {Object} [config.algorithmOptions] - Algorithm-specific options
   * @param {Object} [config.redis] - Redis configuration for distributed rate limiting
   * @param {Function} [config.keyGenerator] - Function to generate unique identifiers (defaults to IP-based)
   * @param {Object} [config.headerFormat] - Rate limit header format configuration
   * @returns {Tejas} The Tejas instance for chaining
   *
   */
  withRateLimit(config) {
    if (!config) {
      logger.warn(
        'No rate limit configuration provided. Skipping rate limit setup.',
      );
      return this;
    }

    this.midair(rateLimiter(config));
    return this;
  }

  /**
   * Adds CORS middleware. Sets Access-Control-* headers and responds to OPTIONS preflight with 204.
   *
   * @param {Object} [config] - CORS configuration
   * @param {string|string[]|((origin: string) => boolean)} [config.origin='*'] - Allowed origin(s)
   * @param {string[]} [config.methods] - Allowed methods (default: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
   * @param {string[]} [config.allowedHeaders=['Content-Type','Authorization']] - Allowed request headers
   * @param {boolean} [config.credentials=false] - Allow credentials
   * @param {number} [config.maxAge] - Preflight cache max age in seconds
   * @returns {Tejas} The Tejas instance for chaining
   *
   * @example
   * app.withCORS({
   *   origin: ['https://example.com'],
   *   methods: ['GET', 'POST', 'PUT', 'DELETE'],
   *   allowedHeaders: ['Content-Type', 'Authorization'],
   *   credentials: true,
   *   maxAge: 86400,
   * });
   */
  withCORS(config = {}) {
    this.midair(corsMiddleware(config));
    return this;
  }

  /**
   * Serves the API documentation at GET /docs and GET /docs/openapi.json from a pre-generated spec file.
   * Generate the spec with `tejas generate:docs`, then call this to serve it on your app.
   * Uses Scalar API Reference; default layout is 'classic' so the test request appears on the same page (not in a dialog).
   *
   * @param {Object} [config] - Configuration
   * @param {string} [config.specPath='./openapi.json'] - Path to the OpenAPI spec JSON file (relative to process.cwd())
   * @param {object} [config.scalarConfig] - Optional Scalar API Reference config (e.g. { layout: 'modern' } for dialog try-it)
   * @returns {Tejas} The Tejas instance for chaining
   *
   * @example
   * app.serveDocs({ specPath: './openapi.json' });
   * app.serveDocs({ specPath: './openapi.json', scalarConfig: { layout: 'modern' } });
   * app.takeoff();
   */
  serveDocs(config = {}) {
    const specPath = path.resolve(
      process.cwd(),
      config.specPath || './openapi.json',
    );
    const { scalarConfig } = config;
    const getSpec = async () => {
      const content = await readFile(specPath, 'utf8');
      return JSON.parse(content);
    };
    registerDocRoutes(
      { getSpec, specUrl: '/docs/openapi.json', scalarConfig },
      targetRegistry,
    );
    return this;
  }
}

const listAllEndpoints = (grouped = false) => {
  return targetRegistry.getAllEndpoints(grouped);
};

export { default as Target } from './server/target.js';
export { default as TejFileUploader } from './server/files/uploader.js';
export { default as TejError } from './server/error.js';
export { listAllEndpoints };

export default Tejas;

// TODO Ability to register a target (route) from tejas instance
// TODO tejas as CLI tool
