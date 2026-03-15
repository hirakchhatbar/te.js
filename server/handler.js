import { env } from 'tej-env';
import TejLogger from 'tej-logger';
import logHttpRequest from '../utils/request-logger.js';

import Ammo from './ammo.js';
import TejError from './error.js';
import targetRegistry from './targets/registry.js';

const errorLogger = new TejLogger('Tejas.Exception');
const logger = new TejLogger('Tejas');
/** Paths we have already warned about (missing allowed methods). */
const warnedPaths = new Set();

const DEFAULT_ALLOWED_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
];

/**
 * Returns the set of allowed HTTP methods (configurable via allowedMethods in tejas.config.json or ALLOWEDMETHODS env).
 * @returns {Set<string>}
 */
const getAllowedMethods = () => {
  const raw = env('ALLOWEDMETHODS');
  if (raw == null) return new Set(DEFAULT_ALLOWED_METHODS);
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',').map((s) => s.trim())
      : [];
  const normalized = arr.map((m) => String(m).toUpperCase()).filter(Boolean);
  return normalized.length > 0
    ? new Set(normalized)
    : new Set(DEFAULT_ALLOWED_METHODS);
};

/**
 * Executes the middleware and handler chain for a given target.
 *
 * @param {Object} target - The target endpoint object.
 * @param {Ammo} ammo - The Ammo instance containing request and response objects.
 * @returns {Promise<void>} A promise that resolves when the chain execution is complete.
 */
const executeChain = async (target, ammo) => {
  let i = 0;

  const chain = targetRegistry.globalMiddlewares.concat(
    target.getMiddlewares(),
  );
  chain.push(target.getHandler());

  const next = async () => {
    // Check if response has already been sent (e.g., by passport.authenticate redirect)
    if (ammo.res.headersSent || ammo.res.writableEnded || ammo.res.finished) {
      return;
    }

    const middleware = chain[i];
    i++;

    const args =
      middleware.length === 3 ? [ammo.req, ammo.res, next] : [ammo, next];

    try {
      const result = await middleware(...args);

      // Check again after middleware execution (passport might have redirected)
      if (ammo.res.headersSent || ammo.res.writableEnded || ammo.res.finished) {
        return;
      }

      // If middleware returned a promise that resolved, continue chain
      if (result && typeof result.then === 'function') {
        await result;
        // Check one more time after promise resolution
        if (
          ammo.res.headersSent ||
          ammo.res.writableEnded ||
          ammo.res.finished
        ) {
          return;
        }
      }
    } catch (err) {
      // Only handle error if response hasn't been sent
      if (
        !ammo.res.headersSent &&
        !ammo.res.writableEnded &&
        !ammo.res.finished
      ) {
        await errorHandler(ammo, err);
      }
    }
  };

  await next();
};

/**
 * Handles errors: optional logging (log.exceptions) and sending the response via ammo.throw(err).
 * One mechanism — ammo.throw — takes care of everything (no separate "log then send").
 * When errors.llm.enabled, framework-caught errors get the same LLM-inferred response as explicit ammo.throw().
 * When ammo.throw() returns a Promise (LLM path), waits for it to complete.
 *
 * @param {Ammo} ammo - The Ammo instance containing request and response objects.
 * @param {Error} err - The error object to handle.
 * @returns {Promise<void>}
 */
const errorHandler = async (ammo, err) => {
  // Pass false as second arg to suppress tej-logger's Console.trace() double-stack output.
  if (env('LOG_EXCEPTIONS')) errorLogger.error(err, false);

  const result = ammo.throw(err);
  if (result != null && typeof result.then === 'function') {
    await result;
  }
};

/**
 * Main request handler function.
 *
 * @param {http.IncomingMessage} req - The HTTP request object.
 * @param {http.ServerResponse} res - The HTTP response object.
 * @returns {Promise<void>} A promise that resolves when the request handling is complete.
 */
const handler = async (req, res) => {
  const allowedMethods = getAllowedMethods();
  const method = req.method ? String(req.method).toUpperCase() : '';
  if (!method || !allowedMethods.has(method)) {
    res.writeHead(405, {
      'Content-Type': 'text/plain',
      Allow: [...allowedMethods].join(', '),
    });
    res.end('Method Not Allowed');
    return;
  }

  const url = (req.url ?? '/').split('?')[0] || '/';
  const match = targetRegistry.aim(url);
  const ammo = new Ammo(req, res);

  try {
    // Enhance ammo for all requests (matched or not) so global middlewares
    // always receive a fully-populated ammo (method flags, headers, payload, etc.).
    await ammo.enhance();

    if (match && match.target) {
      const allowedMethods = match.target.getMethods();
      if (allowedMethods != null && allowedMethods.length > 0) {
        const method = ammo.method && String(ammo.method).toUpperCase();
        if (!method || !allowedMethods.includes(method)) {
          ammo.res.setHeader('Allow', allowedMethods.join(', '));
          await errorHandler(ammo, new TejError(405, 'Method Not Allowed'));
          return;
        }
      } else if (env('WARN_MISSING_ALLOWED_METHODS') !== 'false') {
        const path = match.target.getPath();
        if (!warnedPaths.has(path)) {
          warnedPaths.add(path);
          logger.warn(`Endpoint missing allowed methods: ${path}`);
        }
      }

      // Add route parameters to ammo.params and ammo.payload
      ammo.params = match.params || {};
      if (match.params && Object.keys(match.params).length > 0) {
        Object.assign(ammo.payload, match.params);
      }

      if (env('LOG_HTTP_REQUESTS')) logHttpRequest(ammo);
      await executeChain(match.target, ammo);
    } else {
      if (req.url === '/') {
        ammo.defaultEntry();
      } else {
        // Run global middlewares (CORS preflight, auth, logging, etc.) even for
        // unmatched routes. A pseudo-target with no route-specific middlewares
        // is used so the 404 response is sent at the end of the global chain.
        await executeChain(
          {
            getMiddlewares: () => [],
            getHandler: () => async () => {
              if (!ammo.res.headersSent) {
                await errorHandler(
                  ammo,
                  new TejError(404, `URL not found: ${url}`),
                );
              }
            },
          },
          ammo,
        );
      }
    }
  } catch (err) {
    await errorHandler(ammo, err);
  }
};

export default handler;
