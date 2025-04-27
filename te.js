import { createServer } from 'node:http';
import { env, setEnv } from 'tej-env';
import TejLogger from 'tej-logger';
import rateLimiter from './rate-limit/index.js';

import targetRegistry from './server/targets/registry.js';
import dbManager from './database/index.js';

import { loadConfigFile, standardizeObj } from './utils/configuration.js';

import targetHandler from './server/handler.js';
import { findTargetFiles } from './utils/auto-register.js';
import { pathToFileURL } from 'node:url';

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
   * @param {...Function} middlewares - Middleware functions to register globally
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
    findTargetFiles()
      .then((targetFiles) => {
        if (targetFiles) {
          for (const file of targetFiles) {
            import(pathToFileURL(`${file.parentPath}/${file.name}`));
          }
        }
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
   * @param {boolean} [options.withRedis.isCluster=false] - Whether this is a Redis cluster connection
   * @param {Object} [options.withRedis.url] - Redis connection URL and other options (https://redis.io/docs/latest/develop/clients/nodejs/connect/)
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
    this.engine = createServer(targetHandler);
    this.engine.listen(env('PORT'), async () => {
      logger.info(`Took off from port ${env('PORT')}`);

      if (withRedis) await dbManager.initializeConnection('redis', withRedis);
      if (withMongo) await dbManager.initializeConnection('mongodb', withMongo);
    });

    this.engine.on('error', (err) => {
      logger.error(`Server error: ${err}`);
    });
  }

  withRedis(config) {
    if (config) {
      dbManager.initializeConnection('redis', config);
    } else {
      logger.warn(
        'No Redis configuration provided. Skipping Redis connection.',
      );
    }
    return this;
  }

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
   * Adds global rate limiting to all endpoints
   *
   * @param {Object} config - Rate limiting configuration
   * @param {number} [config.maxRequests=60] - Maximum number of requests allowed in the time window
   * @param {number} [config.timeWindowSeconds=60] - Time window in seconds
   * @param {string} [config.algorithm='sliding-window'] - Rate limiting algorithm ('token-bucket', 'sliding-window', or 'fixed-window')
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
