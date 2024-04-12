import Ammo from '../ammo.js';
import TargetRegistry from './registry.js';

const targetRegistry = new TargetRegistry();

const runMiddlewares = async (target, req, res) => {
  const middlewares = targetRegistry.globalMiddlewares.concat(
      target.middlewares,
  );
  for (const middleware of middlewares) {
    if (typeof middleware !== 'function') continue;
    await middleware(req, res);
  }
};

const handler = async (req, res) => {
  const target = targetRegistry.aim(req.url.split('?')[0]);
  if (target) {
    const ammo = new Ammo(req, res);
    await ammo.generatePayload();
    ammo.target = target;

    await runMiddlewares(target, ammo.req, ammo.res);
    await target.shoot(ammo);

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
