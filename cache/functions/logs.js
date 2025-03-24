import TejLogger from 'tej-logger';

const logger = new TejLogger('CACHE');

const print = (action, key, ttl, time) => {
  switch (action) {
    case 'get':
      logger.info(`GET: ${key} in ${time}ms`);
      break;

    case 'set':
      if (ttl) logger.info(`SET: ${key} with TTL ${ttl} in ${time}ms`);
      else logger.info(`SET: ${key} in ${time}ms`);
      break;

    case 'del':
      logger.info(`DEL: ${key} in ${time}ms`);
      break;

    case 'miss':
      logger.info(`MISS: ${key}`);
      break;

    case 'evict':
      logger.info(`EVICT: ${key}`);
      break;

    case 'expired':
      logger.info(`EXPIRED: ${key}`);
      break;

    default:
      logger.info(`Cache action: ${action} in ${time}ms`);
  }
};

export default print;
