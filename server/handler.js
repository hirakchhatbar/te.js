import { env } from 'tej-env';
import TejLogger from 'tej-logger';
import logHttpRequest from '../utils/request-logger.js';

import Ammo from './ammo.js';
import TejError from './error.js';
import targetRegistry from './targets/registry.js';

const errorLogger = new TejLogger('Tejas.Exception');

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
        if (ammo.res.headersSent || ammo.res.writableEnded || ammo.res.finished) {
          return;
        }
      }
    } catch (err) {
      // Only handle error if response hasn't been sent
      if (!ammo.res.headersSent && !ammo.res.writableEnded && !ammo.res.finished) {
        errorHandler(ammo, err);
      }
    }
  };

  await next();
};

/**
 * Handles errors by logging them and sending an appropriate response.
 *
 * @param {Ammo} ammo - The Ammo instance containing request and response objects.
 * @param {Error} err - The error object to handle.
 */
const errorHandler = (ammo, err) => {
  if (env('LOG_EXCEPTIONS')) errorLogger.error(err);

  if (err instanceof TejError) return ammo.throw(err);
  return ammo.throw(err);
};

/**
 * Main request handler function.
 *
 * @param {http.IncomingMessage} req - The HTTP request object.
 * @param {http.ServerResponse} res - The HTTP response object.
 * @returns {Promise<void>} A promise that resolves when the request handling is complete.
 */
const handler = async (req, res) => {
  const url = req.url.split('?')[0];
  const match = targetRegistry.aim(url);
  const ammo = new Ammo(req, res);

  try {
    if (match && match.target) {
      await ammo.enhance();

      // Add route parameters to ammo.payload
      if (match.params && Object.keys(match.params).length > 0) {
        Object.assign(ammo.payload, match.params);
      }

      if (env('LOG_HTTP_REQUESTS')) logHttpRequest(ammo);
      await executeChain(match.target, ammo);
    } else {
      if (req.url === '/') {
        ammo.defaultEntry();
      } else {
        errorHandler(ammo, new TejError(404, `URL not found: ${url}`));
      }
    }
  } catch (err) {
    errorHandler(ammo, err);
  }
};

export default handler;
