import { Target, TejError } from 'te.js';
import * as cacheService from '../services/cache.service.js';

const cache = new Target('/cache');

// Middleware: require Redis to be available
cache.midair((ammo, next) => {
  if (!cacheService.isAvailable()) {
    throw new TejError(503, 'Cache service unavailable. Set REDIS_URL to enable Redis.');
  }
  next();
});

cache.register('/:key', async (ammo) => {
  if (!ammo.GET) return ammo.notAllowed();

  const { key } = ammo.payload;
  const value = await cacheService.get(key);

  if (value === null) return ammo.notFound();

  ammo.fire({ key, value });
});

cache.register('/', async (ammo) => {
  if (!ammo.POST) return ammo.notAllowed();

  const { key, value, ttl } = ammo.payload;
  if (!key || value === undefined) {
    throw new TejError(400, 'key and value are required');
  }

  await cacheService.set(key, value, ttl ? parseInt(ttl, 10) : undefined);
  ammo.fire(201, { message: 'Cached successfully', key });
});
