# te.js (WIP)

<p align="center"><img src="https://tejas-documentation.vercel.app/tejas-logo.svg" alt="project-image"></p>

<p>A Node Framework For Powerful Backend Services</p>

<h3><a href="https://tejas-documentation.vercel.app" target="_blank">Documentation (WIP)</a></h3>

## Features

- Robust exception handling so that your app never dies even if you forget to catch it.
- Offers a powerful and flexible routing system that enables method-free and clean URL structures.
- Fully compatible with Express middlewares as well as the ability to build te.js middlewares.
- Built-in logger to log all the requests responses and errors to help you debug your application.
- Built-in GUI to manage your application environment variables view logs and run schedulers.
- Real-time insights into the performance health and usage of your application with built-in monitoring.
- Built in alerts via Email SMS or Slack to notify you of any exceptions and malformed requests.
- Highly configurable caching options to cache responses at different levels to improve performance.
- Protect your API from abuse with flexible rate limiting algorithms.

## Rate Limiting

te.js provides three powerful rate limiting algorithms to protect your APIs from abuse:

### Token Bucket Algorithm

Best for APIs that need to handle bursts of traffic while maintaining a long-term rate limit.

```javascript
import { TokenBucketRateLimiter } from 'te.js/rate-limit';

const limiter = new TokenBucketRateLimiter({
  maxRequests: 10, // Allow 10 requests
  timeWindowSeconds: 60, // Per 60 seconds
  tokenBucketConfig: {
    // Algorithm-specific options
    refillRate: 0.5, // Refill 1 token every 2 seconds
    burstSize: 15, // Allow bursts up to 15 tokens
  },
});
```

### Sliding Window Algorithm

Provides smooth rate limiting with weighted windows to prevent traffic spikes.

```javascript
import { SlidingWindowRateLimiter } from 'te.js/rate-limit';

const limiter = new SlidingWindowRateLimiter({
  maxRequests: 100, // Allow 100 requests
  timeWindowSeconds: 60, // Per 60 seconds
  slidingWindowConfig: {
    // Algorithm-specific options
    granularity: 1, // 1-second precision
    weights: {
      current: 1, // Full weight for current window
      previous: 0.5, // Half weight for previous window
    },
  },
});
```

### Fixed Window Algorithm

Simple time-based rate limiting with optional clock alignment.

```javascript
import { FixedWindowRateLimiter } from 'te.js/rate-limit';

const limiter = new FixedWindowRateLimiter({
  maxRequests: 60, // Allow 60 requests
  timeWindowSeconds: 60, // Per 60 seconds
  fixedWindowConfig: {
    // Algorithm-specific options
    strictWindow: true, // Align windows with clock minutes
  },
});
```

### Using Rate Limiters

All rate limiters share a common interface:

```javascript
import { Target, TejError } from 'te.js';

const target = new Target();

target.register('/', async (ammo) => {
  // Check rate limit using client IP as identifier
  const result = await limiter.consume(ammo.ip);

  // Set rate limit headers
  ammo.res.setHeader('X-RateLimit-Limit', limiter.options.maxRequests);
  ammo.res.setHeader('X-RateLimit-Remaining', result.remainingRequests);
  ammo.res.setHeader('X-RateLimit-Reset', result.resetTime);

  if (!result.success) {
    throw new TejError(429, 'Too Many Requests');
  }

  // Your endpoint logic here
  ammo.fire({ message: 'Hello World' });
});
```

### Distributed Rate Limiting with Redis

For distributed applications, use Redis storage:

```javascript
const limiter = new TokenBucketRateLimiter({
  maxRequests: 10,
  timeWindowSeconds: 60,
  redis: {
    // Redis connection options
    url: 'redis://localhost:6379',
  },
  tokenBucketConfig: {
    // Algorithm-specific options
    refillRate: 0.5,
    burstSize: 15,
  },
});
```

Each rate limiter can only use one algorithm at a time. The algorithm is determined by which options object is provided (`tokenBucketConfig`, `slidingWindowConfig`, or `fixedWindowConfig`).
