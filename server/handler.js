import { env } from 'tej-env';
import TejLogger from 'tej-logger';
import logHttpRequest from '../utils/request-logger.js';

import Ammo from './ammo.js';
import TejError from './error.js';
import TargetRegistry from './targets/registry.js';

const targetRegistry = new TargetRegistry();
const errorLogger = new TejLogger('Tejas.Exception');

const executeChain = async (target, ammo) => {
  let i = 0;

  const chain = targetRegistry.globalMiddlewares.concat(target.middlewares);
  chain.push(target.shoot);

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

const errorHandler = (ammo, err) => {
  if (env('LOG_EXCEPTIONS')) errorLogger.error(err);

  if (err instanceof TejError) return ammo.throw(err.code, err);

  ammo.throw(500, err);
};

const handler = async (req, res) => {
  const target = targetRegistry.aim(req.method, req.url.split('?')[0]);
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
        errorHandler(
          ammo,
          new TejError(
            404,
            `No target found for URL ${ammo.fullURL} with method ${ammo.method}`,
          ),
        );
      }
    }
  } catch (err) {
    errorHandler(ammo, err);
  }
};

export default handler;
