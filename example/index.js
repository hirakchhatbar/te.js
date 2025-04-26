import Tejas, { Target, TejError } from 'te.js';
import { SlidingWindowRateLimiter } from '../rate-limit/index.js';

// Create rate limiter instance with weighted windows
const rateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 5,         // Allow 5 requests
  timeWindowSeconds: 30,   // Per 30 second window
  keyPrefix: 'rl:',       // Storage key prefix
  algorithmOptions: {
    slidingWindow: {
      granularity: 1,    // 1-second precision
      weights: {
        current: 1,      // Full weight for current window
        previous: 0.5    // Half weight for previous window
      }
    }
  }
});

const target = new Target();

// Handle rate-limited endpoints directly
target.register('/', async (ammo) => {
  // Use IP address as identifier for rate limiting
  const result = await rateLimiter.consume(ammo.ip);
  
  // Set rate limit headers
  ammo.res.setHeader('X-RateLimit-Limit', rateLimiter.options.maxRequests);
  ammo.res.setHeader('X-RateLimit-Remaining', result.remainingRequests);
  ammo.res.setHeader('X-RateLimit-Reset', result.resetTime);

  if (!result.success) {
    throw new TejError(429, 'Too Many Requests');
  }

  // Your actual endpoint logic here
  ammo.fire({ 
    message: 'Hello from rate-limited endpoint!',
    note: 'This endpoint uses sliding window rate limiting with weighted windows'
  });
});

const tejas = new Tejas();
tejas.takeoff();