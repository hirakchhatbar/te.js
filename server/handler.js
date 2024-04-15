import TejLogger from 'tej-logger';
import { env } from 'tej-env';

import Ammo from './ammo.js';
import TargetRegistry from './targets/registry.js';
import logHttpRequest from '../utils/request-logger.js';

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
      const ammo =
        middleware.length === 2 ? args[0] : new Ammo(args[0], args[1]);
      errorHandler(ammo, err);
    }
  };

  await next();
};

const errorHandler = (ammo, err, errCode) => {
  if (env('LOG_EXCEPTIONS')) errorLogger.error(err);

  ammo.throw(errCode, err);
};

const handler = async (req, res) => {
  const target = targetRegistry.aim(req.method, req.url.split('?')[0]);
  const ammo = new Ammo(req, res);
  await ammo.enhance();

  if (env('LOG_HTTP_REQUESTS')) logHttpRequest(ammo);

  try {
    if (target) {
      await executeChain(target, ammo);
    } else {
      if (req.url === '/') {
        ammo.defaultEntry();
      } else {
        errorHandler(
          ammo,
          new Error(
            `No target found for URL ${ammo.fullURL} with method ${ammo.method}`,
          ),
          404,
        );
      }
    }
  } catch (err) {
    errorHandler(ammo, err);
  }
};

export default handler;
