import TejError from '../server/error.js';
import FixedWindowRateLimiter from './algorithms/fixed-window.js';
import SlidingWindowRateLimiter from './algorithms/sliding-window.js';
import TokenBucketRateLimiter from './algorithms/token-bucket.js';

/**
 * Creates a rate limiting middleware function with the specified algorithm and storage
 *
 * @param {Object} options - Configuration options for the rate limiter
 * @param {number} options.maxRequests - Maximum number of requests allowed within the time window
 * @param {number} options.timeWindowSeconds - Time window in seconds
 * @param {string} [options.algorithm='sliding-window'] - Rate limiting algorithm to use:
 *                                                     - 'token-bucket': Best for handling traffic bursts
 *                                                     - 'sliding-window': Best for smooth rate limiting
 *                                                     - 'fixed-window': Simplest approach
 * @param {string|Object} [options.store='memory'] - Storage backend to use:
 *                                         - 'memory': In-memory storage (default, single-instance only)
 *                                         - { type: 'redis', url: 'redis://...' }: Redis storage for distributed deployments.
 *                                           The redis npm package is auto-installed on first use.
 *                                           Any extra properties are forwarded to node-redis createClient.
 * @param {Object} [options.algorithmOptions] - Algorithm-specific options
 * @param {Function} [options.keyGenerator] - Optional function to generate unique identifiers
 * @param {Object} [options.headerFormat] - Rate limit header format configuration
 * @param {string} [options.headerFormat.type='standard'] - Type of headers to use:
 *                                                       - 'legacy': Use X-RateLimit-* headers
 *                                                       - 'standard': Use RateLimit-* headers (draft 6+)
 *                                                       - 'both': Use both legacy and standard headers
 * @param {boolean} [options.headerFormat.draft7=false] - Whether to include draft 7 policy header
 * @param {boolean} [options.headerFormat.draft8=false] - Whether to include draft 8 reset format
 * @param {Function} [options.onRateLimited] - Optional callback when rate limit is exceeded
 * @returns {Function} Middleware function for use with te.js
 */
function rateLimiter(options) {
  const {
    algorithm = 'sliding-window',
    store = 'memory',
    keyGenerator = (ammo) => ammo.ip,
    headerFormat = { type: 'standard' },
    onRateLimited,
    ...limiterOptions
  } = options;

  const configMap = Object.create(null);
  configMap['token-bucket'] = 'tokenBucketConfig';
  configMap['sliding-window'] = 'slidingWindowConfig';
  configMap['fixed-window'] = 'fixedWindowConfig';

  const configKey = configMap[algorithm];
  if (!configKey) {
    throw new TejError(
      400,
      `Invalid algorithm: ${algorithm}. Must be one of: ${Object.keys(configMap).join(', ')}`,
    );
  }

  if (typeof store === 'object' && store.type === 'redis' && !store.url) {
    throw new TejError(
      400,
      `Redis store requires a url. Provide store: { type: "redis", url: "redis://..." }`,
    );
  }

  const limiterConfig = Object.freeze({
    maxRequests: limiterOptions.maxRequests,
    timeWindowSeconds: limiterOptions.timeWindowSeconds,
    [configKey]: limiterOptions.algorithmOptions || {},
    store,
  });

  // Create the appropriate limiter instance
  let limiter;
  switch (algorithm) {
    case 'token-bucket':
      limiter = new TokenBucketRateLimiter(limiterConfig);
      break;
    case 'sliding-window':
      limiter = new SlidingWindowRateLimiter(limiterConfig);
      break;
    case 'fixed-window':
      limiter = new FixedWindowRateLimiter(limiterConfig);
      break;
    default:
      throw new TejError(400, 'Invalid algorithm specified');
  }

  // Helper to set headers based on format
  const setRateLimitHeaders = (ammo, result) => {
    const { type = 'standard', draft7 = false, draft8 = false } = headerFormat;
    const useStandard = type === 'standard' || type === 'both';
    const useLegacy = type === 'legacy' || type === 'both';

    if (useStandard) {
      // Standard headers (draft 6+)
      ammo.res.setHeader('RateLimit-Limit', limiter.options.maxRequests);
      ammo.res.setHeader('RateLimit-Remaining', result.remainingRequests);

      // Draft 8 uses delta-seconds format
      if (draft8) {
        const resetDelta = result.resetTime - Math.floor(Date.now() / 1000);
        ammo.res.setHeader('RateLimit-Reset', resetDelta);
      } else {
        ammo.res.setHeader('RateLimit-Reset', result.resetTime);
      }

      // Draft 7 added optional policy information
      if (draft7) {
        const policy = `${limiter.options.maxRequests};w=${limiter.options.timeWindowSeconds}`;
        ammo.res.setHeader('RateLimit-Policy', policy);
      }
    }

    if (useLegacy) {
      // Legacy X- headers
      ammo.res.setHeader('X-RateLimit-Limit', limiter.options.maxRequests);
      ammo.res.setHeader('X-RateLimit-Remaining', result.remainingRequests);
      ammo.res.setHeader('X-RateLimit-Reset', result.resetTime);
    }

    // Always set Retry-After on 429 responses
    if (!result.success) {
      const retryAfter = result.resetTime - Math.floor(Date.now() / 1000);
      ammo.res.setHeader('Retry-After', retryAfter);
    }
  };

  // Return middleware function
  return async (ammo, next) => {
    const key = keyGenerator(ammo) ?? ammo.ip ?? 'unknown';
    const result = await limiter.consume(key);

    setRateLimitHeaders(ammo, result);

    if (!result.success) {
      if (onRateLimited) {
        return onRateLimited(ammo);
      }
      return ammo.throw(429, 'Too Many Requests');
    }

    await next();
  };
}

export default rateLimiter;
