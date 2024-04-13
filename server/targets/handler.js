import Ammo from "../ammo.js";
import TargetRegistry from "./registry.js";

const targetRegistry = new TargetRegistry();

const executeChain = async (target, ammo) => {
  // Write code to execute chain of middlewares and then final target.shoot() handler
  let i = 0;

  const middlewares = targetRegistry.globalMiddlewares.concat(
    target.middlewares,
  );

  const next = async () => {
    if (i < middlewares.length) {
      await middlewares[i](...ammo, next);
      i++;
    } else {
      await target.shoot(ammo);
    }
  };

  await next();
};

const handler = async (req, res) => {
  const target = targetRegistry.aim(req.method, req.url.split("?")[0]);
  if (target) {
    const ammo = new Ammo(req, res);
    await ammo.generatePayload();
    await executeChain(target, ammo);
  } else {
    if (req.url === "/") {
      for (const middleware of targetRegistry.globalMiddlewares) {
        if (typeof middleware !== "function") continue;
        await middleware(req, res);
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.write("<h1>Tejas is flying</h1>");
      res.end();
    } else {
      res.statusCode = 404;
      res.write("Not found");
      res.end();
    }
  }
};

export default handler;
