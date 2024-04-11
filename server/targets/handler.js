import tejRequest from "./../request.js";
import TargetRegistry from "./registry.js";

const targetRegistry = new TargetRegistry();

const handler = async (defaultReq, res) => {
  let req;

  try {
    req = await tejRequest(defaultReq);
  } catch (e) {
    req = defaultReq;
    console.error(e.message);
  }

  const target = targetRegistry.aim(req);

  if (target) {
    const middlewares = targetRegistry.globalMiddlewares.concat(target.middlewares);
    for (const middleware of middlewares) {
      if (typeof middleware !== "function") continue;
      await middleware(req, res);
    }

    await target.shoot(req, res);

  } else {
    if (req.url === '/favicon.ico') {
      res.writeHead(200, {'Content-Type': 'image/x-icon'});
      res.end();
    } else if (req.url === '/') {
      for (const middleware of targetRegistry.globalMiddlewares) {
        if (typeof middleware !== "function") continue;
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
