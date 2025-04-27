import { createServer } from 'node:http';

import { env, setEnv } from 'tej-env';
import TejLogger from 'tej-logger';

import TargetRegistry from './server/targets/registry.js';

import { loadConfigFile, standardizeObj } from './utils/configuration.js';

import targetHandler from './server/handler.js';
import { findTargetFiles } from './utils/auto-register.js';
import { pathToFileURL } from 'node:url';

const logger = new TejLogger('Tejas');
const targetRegistry = new TargetRegistry();

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
   * @param {Object} [args.db] - Database configuration
   * @param {string} [args.db.type] - Database type ('mongodb', 'mysql', 'postgres', 'sqlite')
   * @param {string} [args.db.uri] - Connection URI for the database
   *
   * @example
   * const app = new Tejas({
   *   port: 3000,
   *   log: {
   *     http_requests: true,
   *     exceptions: true
   *   },
   *   db: {
   *     type: 'mongodb',
   *     uri: 'mongodb://localhost:27017/myapp'
   *   }
   * });
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

    // Load defaults
    if (!env('PORT')) setEnv('PORT', 1403);
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
   * Enables rate limiting for the application
   *
   * @param {Object} options - Rate limiting configuration
   * @param {string} [options.store='memory'] - Storage backend for rate limiting
   * @param {string} [options.algorithm='sliding-window'] - Rate limiting algorithm
   * @description
   * Currently a placeholder for future rate limiting implementation.
   * Will support multiple algorithms and storage backends.
   */
  enableRateLimit(options) {
    // TODO: Implement rate limiting functionality using the provided options
    // Options could be an object with store and algorithm
  }

  /**
   * Starts the Tejas server
   *
   * @description
   * Creates and starts an HTTP server on the configured port.
   *
   * @example
   * const app = new Tejas();
   * app.takeoff(); // Server starts on default port 1403
   */
  takeoff() {
    this.engine = createServer(targetHandler);
    this.engine.listen(env('PORT'), () => {
      logger.info(`Took off from port ${env('PORT')}`);
    });
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
