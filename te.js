import { createServer } from 'node:http';
import { env, setEnv } from 'tej-env';
import TejLogger from 'tej-logger';
import rateLimiter from './rate-limit/index.js';
import corsMiddleware from './cors/index.js';
import radarMiddleware from './radar/index.js';

import targetRegistry from './server/targets/registry.js';

import { loadConfigFile, standardizeObj } from './utils/configuration.js';

import targetHandler from './server/handler.js';
import {
  getErrorsLlmConfig,
  validateErrorsLlmAtTakeoff,
  verifyLlmConnection,
} from './utils/errors-llm-config.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { readFrameworkVersion, fmtMs, statusLine } from './utils/startup.js';
import { findTargetFiles } from './utils/auto-register.js';
import { registerDocRoutes } from './auto-docs/ui/docs-ui.js';
import TejError from './server/error.js';

const logger = new TejLogger('Tejas');

/**
 * Performs a graceful shutdown: closes the HTTP server (if started), then exits.
 * Invoked by process-level fatal error handlers. This is used to ensure that the server is closed properly
 * when the process is terminated.
 * @param {number} [exitCode=1]
 */
async function gracefulShutdown(exitCode = 1) {
  const instance = Tejas.instance;
  if (instance?.engine) {
    try {
      await new Promise((resolve) => instance.engine.close(resolve));
    } catch {
      // ignore close errors during shutdown
    }
  }
  process.exit(exitCode);
}

process.on('unhandledRejection', (reason) => {
  process.stderr.write(
    JSON.stringify({
      level: 'fatal',
      code: 'ERR_UNHANDLED_REJECTION',
      reason: String(reason),
    }) + '\n',
  );
  gracefulShutdown(1);
});

process.on('uncaughtException', (error) => {
  process.stderr.write(
    JSON.stringify({
      level: 'fatal',
      code: 'ERR_UNCAUGHT_EXCEPTION',
      message: error.message,
      stack: error.stack,
    }) + '\n',
  );
  gracefulShutdown(1);
});

/**
 * Main Tejas Framework Class
 *
 * @class
 * @description
 * Tejas is a Node.js framework for building powerful backend services.
 * It provides features like routing, middleware support,
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
   */
  constructor(args) {
    if (Tejas.instance) return Tejas.instance;
    Tejas.instance = this;
    this.options = args || {};
  }

  /**
   * Generates and loads configuration from multiple sources
   *
   * @private
   * @returns {Promise<void>}
   * @description
   * Loads and merges configuration from:
   * 1. tejas.config.json file (lowest priority)
   * 2. Environment variables
   * 3. Constructor options (highest priority)
   *
   * All configuration keys are standardized to uppercase and flattened.
   * Sets default values for required configuration if not provided.
   */
  async generateConfiguration() {
    const configVars = standardizeObj(await loadConfigFile());
    const envVars = standardizeObj(process.env);
    const userVars = standardizeObj(this.options);

    const config = Object.freeze({ ...configVars, ...envVars, ...userVars });

    for (const key in config) {
      if (Object.hasOwn(config, key)) {
        setEnv(key, config[key]);
      }
    }

    // Set default values for required configuration if not provided
    if (!env('PORT')) setEnv('PORT', 1403);
    if (!env('BODY_MAX_SIZE')) setEnv('BODY_MAX_SIZE', 10 * 1024 * 1024); // 10MB default
    if (!env('BODY_TIMEOUT')) setEnv('BODY_TIMEOUT', 30000); // 30 seconds default

    // Validate port is a usable integer
    const port = Number(env('PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new TejError(
        500,
        `Invalid PORT: "${env('PORT')}" — must be an integer between 1 and 65535`,
        { cause: new Error(`ERR_CONFIG_INVALID`) },
      );
    }
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
   * Automatically registers target files from the configured directory.
   * Returns a Promise so takeoff() can await it — ensures all targets are
   * fully loaded before the server starts accepting connections.
   *
   * @private
   * @returns {Promise<void>}
   * @throws {Error} If target files cannot be registered
   */
  async registerTargetsDir() {
    const baseDir = path.join(process.cwd(), process.env.DIR_TARGETS || '');
    try {
      const targetFiles = await findTargetFiles();
      if (!targetFiles?.length) return;
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
    } catch (err) {
      logger.error(
        `Tejas could not register target files. Error: ${err}`,
        false,
      );
    }
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
  async takeoff() {
    const t0 = Date.now();

    // Load configuration first (async file read)
    await this.generateConfiguration();

    // ── Startup banner ──────────────────────────────────────────────────
    const version = await readFrameworkVersion();
    const port = env('PORT');
    const nodeEnv = process.env.NODE_ENV || 'development';
    const banner = [
      '',
      '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `  Tejas v${version}`,
      `  Port:       ${port}`,
      `  PID:        ${process.pid}`,
      `  Node:       ${process.version}`,
      `  Env:        ${nodeEnv}`,
      '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
    ].join('\n');
    process.stdout.write(banner + '\n');

    // ── Live feature status ────────────────────────────────────────────
    const line = statusLine(process.stdout.isTTY);

    if (this._radarStatus) {
      const s = this._radarStatus;
      line.finish(s.feature, s.ok, s.detail);
    }

    validateErrorsLlmAtTakeoff();
    const errorsLlm = getErrorsLlmConfig();
    if (errorsLlm.enabled) {
      if (errorsLlm.verifyOnStart) {
        line.start('LLM Errors', 'verifying model...');
        const result = await verifyLlmConnection();
        line.finish('LLM Errors', result.status.ok, result.status.detail);
      } else {
        line.finish(
          'LLM Errors',
          true,
          `enabled (${errorsLlm.model || 'default model'}, mode: ${errorsLlm.mode})`,
        );
      }
    }

    await this.registerTargetsDir();

    // ── Start HTTP server ───────────────────────────────────────────────
    this.engine = createServer(targetHandler);
    await new Promise((resolve) => this.engine.listen(port, resolve));
    this.engine.on('error', (err) => logger.error(`Server error: ${err}`));

    process.stdout.write(
      `\n  \x1b[32m\u2708  Ready on port ${port} in ${fmtMs(Date.now() - t0)}\x1b[0m\n\n`,
    );
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
   * @param {boolean} [config.verifyOnStart] - Send a test prompt to the LLM at startup to verify connectivity (default false)
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
      if (config.verifyOnStart != null)
        setEnv('ERRORS_LLM_VERIFY_ON_START', config.verifyOnStart);
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
   * @param {string|Object} [config.store='memory'] - Storage backend: 'memory' (default) or
   *   { type: 'redis', url: 'redis://...', ...redisOptions } for distributed deployments.
   *   In-memory storage is not shared across processes and may be inaccurate in distributed setups.
   * @param {Object} [config.algorithmOptions] - Algorithm-specific options
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
   * Enables Tejas Radar telemetry — captures HTTP request metrics and forwards
   * them to a Radar collector for real-time observability.
   *
   * All options fall back to environment variables and sensible defaults, so
   * the minimum viable call is just `app.withRadar({ apiKey: 'rdr_xxx' })`.
   * The project name is auto-detected from `package.json` if not supplied.
   *
   * @param {Object} [config] - Radar configuration
   * @param {string} [config.collectorUrl]  Collector base URL (default: RADAR_COLLECTOR_URL env or http://localhost:3100)
   * @param {string} [config.apiKey]        Bearer token `rdr_xxx` (default: RADAR_API_KEY env)
   * @param {string} [config.projectName]   Project identifier (default: RADAR_PROJECT_NAME env → package.json name → "tejas-app")
   * @param {number} [config.flushInterval] Milliseconds between periodic flushes (default: 2000)
   * @param {number} [config.batchSize]     Flush immediately when batch reaches this size (default: 100)
   * @param {string[]} [config.ignore]      Request paths to skip (default: ['/health'])
   *
   * @param {Object}  [config.capture]      Controls what additional data is captured and sent to the collector.
   *                                         All capture options default to `false` — nothing beyond standard
   *                                         metrics is sent unless explicitly enabled.
   * @param {boolean} [config.capture.request=false]
   *   Capture and send the request body. The body is a shallow copy of parsed
   *   query params and request body fields merged together. Only JSON-serialisable
   *   content is sent. The collector applies non-bypassable GDPR field masking
   *   server-side regardless of this setting.
   * @param {boolean} [config.capture.response=false]
   *   Capture and send the response body. The response must be valid JSON;
   *   non-JSON responses are recorded as `null`. The collector applies
   *   non-bypassable GDPR field masking server-side.
   * @param {boolean|string[]} [config.capture.headers=false]
   *   Capture request headers. Pass `true` to send all headers, or a `string[]`
   *   allowlist of specific header names to send (e.g. `['content-type', 'x-request-id']`).
   *   The collector always strips sensitive headers (`authorization`, `cookie`,
   *   `set-cookie`, `x-api-key`, etc.) server-side regardless of what is sent.
   *
   * @param {Object}   [config.mask]        Client-side masking applied to request/response bodies
   *                                         before data is sent to the collector.
   * @param {string[]} [config.mask.fields]  Extra field names (case-insensitive) to mask client-side.
   *                                         Matched field values are replaced with `"*"` before leaving
   *                                         the process. Use this for application-specific sensitive fields
   *                                         that are not on the collector's built-in GDPR blocklist.
   *                                         Note: the collector enforces its own non-bypassable masking
   *                                         layer server-side regardless of this setting.
   *
   * @returns {Promise<Tejas>} The Tejas instance for chaining
   *
   * @example
   * await app.withRadar({ apiKey: process.env.RADAR_API_KEY });
   * app.takeoff();
   *
   * @example
   * app.withRadar({
   *   collectorUrl: 'https://collector.example.com',
   *   apiKey: process.env.RADAR_API_KEY,
   *   projectName: 'my-api',
   * });
   *
   * @example
   * // Capture request/response bodies and selected headers,
   * // with extra client-side masking for app-specific fields.
   * app.withRadar({
   *   apiKey: process.env.RADAR_API_KEY,
   *   capture: {
   *     request: true,
   *     response: true,
   *     headers: ['content-type', 'x-request-id'],
   *   },
   *   mask: {
   *     fields: ['account_number', 'internal_id'],
   *   },
   * });
   */
  async withRadar(config = {}) {
    const mw = await radarMiddleware(config);
    if (mw._radarStatus) {
      this._radarStatus = mw._radarStatus;
    }
    this.midair(mw);
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
export {
  contextMiddleware,
  getRequestId,
  getRequestStore,
  requestContext,
} from './server/context/request-context.js';

export default Tejas;

// TODO Ability to register a target (route) from tejas instance
// TODO tejas as CLI tool
