import TejLogger from 'tej-logger';

const logger = new TejLogger('MiddlewareValidator');

const isMiddlewareValid = (middleware) => {
  if (typeof middleware !== 'function') {
    logger.error(`Middleware ${middleware} should be a function. Skipping...`);
    return false;
  }

  const args = middleware.length;
  if (args !== 2 && args !== 3) {
    logger.error(
        `Middleware ${middleware.name} should have 2 arguments (ammo, next) or 3 arguments (req, res, next). Skipping...`);
    return false;
  }

  return true;
};

export default isMiddlewareValid;
