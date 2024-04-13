import TejLogger from 'tej-logger';
import Ammo from '../ammo.js';
import TargetRegistry from './registry.js';

const targetRegistry = new TargetRegistry();
const errorLogger = new TejLogger('Tejas.Exception');

const executeChain = async (target, ammo) => {
  let i = 0;

  const middlewares = targetRegistry.globalMiddlewares.concat(
      target.middlewares,
  );

  const next = async () => {
    if (i < middlewares.length) {
      const middleware = middlewares[i++];

      const args = middleware.length === 3 ?
          [ammo.req, ammo.res, next] :
          [ammo, next];

      try {
        await middleware(...args);

      } catch (err) {
        const ammo = middleware.length === 2 ?
            args[0] :
            new Ammo(args[0], args[1]);
        errorHandler(ammo, err);
      }

    } else {
      try {
        await target.shoot(ammo);
      } catch (err) {
        errorHandler(ammo, err);
      }
    }
  };

  await next();
};

const errorHandler = (ammo, err) => {
  errorLogger.error(err);
  ammo.throw(err);
};

const handler = async (req, res) => {
  const target = targetRegistry.aim(req.method, req.url.split('?')[0]);
  if (target) {
    const ammo = new Ammo(req, res);
    await ammo.generateHeaders();
    await ammo.generatePayload();
    await executeChain(target, ammo);

  } else {
    if (req.url === '/') {
      for (const middleware of targetRegistry.globalMiddlewares) {
        if (typeof middleware !== 'function') continue;
        await middleware(req, res);
      }

      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<h1>Tejas is flying</h1>');
      res.end();
    } else {
      res.statusCode = 404;
      res.write('Not found');
      res.end();
    }
  }
};

export default handler;
