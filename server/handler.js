import { env } from 'tej-env';
import TejLogger from 'tej-logger';
import logHttpRequest from '../utils/request-logger.js';

import Ammo from './ammo.js';
import TejError from './error.js';
import TargetRegistry from './targets/registry.js';

const targetRegistry = new TargetRegistry();
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
    const middleware = chain[i];
    i++;

    const args =
      middleware.length === 3 ? [ammo.req, ammo.res, next] : [ammo, next];

    try {
      await middleware(...args);
    } catch (err) {
      errorHandler(ammo, err);
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

  if (err instanceof TejError) return ammo.throw(err.code, err);

  ammo.throw(500, err);
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
  const target = targetRegistry.aim(url);
  const ammo = new Ammo(req, res);

  try {
    if (target) {
      await ammo.enhance();

      if (env('LOG_HTTP_REQUESTS')) logHttpRequest(ammo);
      await executeChain(target, ammo);
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
