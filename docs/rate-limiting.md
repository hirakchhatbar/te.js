# Rate Limiting

Tejas includes a powerful rate limiting system to protect your API from abuse. It supports multiple algorithms and storage backends.

## Quick Start

```javascript
import Tejas from 'te.js';

const app = new Tejas();

app
  .withRateLimit({
    maxRequests: 100,
    timeWindowSeconds: 60,
  })
  .takeoff();
```

This limits all endpoints to 100 requests per minute per IP address.

## Configuration Options

```javascript
app.withRateLimit({
  // Core settings
  maxRequests: 100, // Maximum requests in time window
  timeWindowSeconds: 60, // Time window in seconds

  // Algorithm selection
  algorithm: 'sliding-window', // 'sliding-window' | 'token-bucket' | 'fixed-window'

  // Storage backend
  store: 'memory', // 'memory' or { type: 'redis', url: '...' }

  // Custom key generator (defaults to IP-based)
  keyGenerator: (ammo) => ammo.ip,

  // Algorithm-specific options
  algorithmOptions: {},

  // Key prefix for storage keys (useful for namespacing)
  keyPrefix: 'rl:',

  // Header format
  headerFormat: {
    type: 'standard', // 'standard' | 'legacy' | 'both'
    draft7: false, // Include RateLimit-Policy header (e.g. "100;w=60")
    draft8: false, // Use delta-seconds for RateLimit-Reset instead of Unix timestamp
  },

  // Custom handler when rate limited
  onRateLimited: (ammo) => {
    ammo.fire(429, { error: 'Slow down!' });
  },
});
```

## Algorithms

### Sliding Window (Default)

Best for smooth, accurate rate limiting. Prevents the "burst at window boundary" problem.

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  algorithm: 'sliding-window',
});
```

**How it works:** Calculates the request rate using a weighted combination of the current and previous time windows.

### Token Bucket

Best for APIs that allow occasional bursts while maintaining a long-term average rate.

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  algorithm: 'token-bucket',
  algorithmOptions: {
    refillRate: 1.67, // Tokens per second (100/60)
    burstSize: 150, // Maximum tokens (allows 50% burst)
  },
});
```

**How it works:** Tokens are added at a steady rate. Each request consumes a token. Allows bursts up to `burstSize`.

### Fixed Window

Simplest algorithm. Good for basic use cases.

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  algorithm: 'fixed-window',
  algorithmOptions: {
    strictWindow: true, // Align to clock boundaries
  },
});
```

**How it works:** Counts requests in fixed time windows (e.g., every minute). Can allow 2x requests at window boundaries.

## Storage Backends

### Memory (Default)

Good for single-server deployments:

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  store: 'memory',
});
```

**Pros:** No external dependencies, fast  
**Cons:** Not shared between server instances — may be inaccurate in distributed deployments

> **Warning:** If you run multiple server instances (e.g. behind a load balancer), each instance tracks its own counters independently. Use Redis storage below for accurate distributed rate limiting.

### Redis

For distributed / multi-instance deployments where counters must be shared:

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  store: {
    type: 'redis',
    url: 'redis://localhost:6379',
  },
});
```

The `redis` npm package is auto-installed on first use if not already present. Any additional properties in the `store` object are forwarded to the node-redis `createClient` call.

**Pros:** Shared across all server instances, persistent  
**Cons:** Requires a Redis server, slightly higher latency

## Custom Key Generation

By default, rate limiting is based on client IP. Customize this:

### By User ID

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  keyGenerator: (ammo) => ammo.user?.id || ammo.ip,
});
```

### By API Key

```javascript
app.withRateLimit({
  maxRequests: 1000,
  timeWindowSeconds: 60,
  keyGenerator: (ammo) => ammo.headers['x-api-key'] || ammo.ip,
});
```

### By Endpoint

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  keyGenerator: (ammo) => `${ammo.ip}:${ammo.endpoint}`,
});
```

## Response Headers

Rate limit headers are automatically added to responses:

### Standard Headers (Default)

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1706540400
```

### Legacy Headers

```javascript
app.withRateLimit({
  headerFormat: { type: 'legacy' },
});
```

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706540400
```

### Both Header Types

```javascript
app.withRateLimit({
  headerFormat: { type: 'both' },
});
```

### Draft 7 Policy Header

```javascript
app.withRateLimit({
  headerFormat: { type: 'standard', draft7: true },
});
```

Adds: `RateLimit-Policy: 100;w=60`

## When Rate Limited

### Default Behavior

Returns `429 Too Many Requests` with a `Retry-After` header (seconds until the rate limit resets).

### Custom Handler

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  onRateLimited: (ammo) => {
    ammo.fire(429, {
      error: 'Rate limit exceeded',
      message: 'Please slow down and try again later',
      retryAfter: ammo.res.getHeader('Retry-After'),
    });
  },
});
```

## Route-Specific Rate Limiting

Apply different limits to different routes using middleware:

```javascript
import Tejas, { Target } from 'te.js';
import rateLimiter from 'te.js/rate-limit/index.js';

const app = new Tejas();
const api = new Target('/api');

// Strict limit for auth endpoints
const authLimiter = rateLimiter({
  maxRequests: 5,
  timeWindowSeconds: 60,
  algorithm: 'fixed-window',
});

// Relaxed limit for read operations
const readLimiter = rateLimiter({
  maxRequests: 1000,
  timeWindowSeconds: 60,
  algorithm: 'sliding-window',
});

// Apply to specific routes
api.register('/login', authLimiter, (ammo) => {
  // Login logic
});

api.register('/data', readLimiter, (ammo) => {
  // Data retrieval
});
```

## Algorithm Comparison

| Algorithm          | Best For            | Burst Handling     | Accuracy | Memory |
| ------------------ | ------------------- | ------------------ | -------- | ------ |
| **Sliding Window** | Most APIs           | Smooth             | High     | Medium |
| **Token Bucket**   | Burst-tolerant APIs | Allows bursts      | Medium   | Low    |
| **Fixed Window**   | Simple cases        | Poor at boundaries | Low      | Low    |

## Examples

### API with Different Tiers

```javascript
const tierLimits = {
  free: { maxRequests: 100, timeWindowSeconds: 3600 },
  pro: { maxRequests: 1000, timeWindowSeconds: 3600 },
  enterprise: { maxRequests: 10000, timeWindowSeconds: 3600 },
};

app.withRateLimit({
  ...tierLimits.free, // Default to free tier
  keyGenerator: (ammo) => {
    const tier = ammo.user?.tier || 'free';
    return `${tier}:${ammo.user?.id || ammo.ip}`;
  },
  algorithmOptions: {
    // Dynamically set limits based on tier
    getLimits: (key) => {
      const tier = key.split(':')[0];
      return tierLimits[tier] || tierLimits.free;
    },
  },
});
```

### Endpoint-Specific with Global Fallback

```javascript
// Global rate limit
app.withRateLimit({
  maxRequests: 1000,
  timeWindowSeconds: 60,
});

// Stricter limit for expensive endpoints
const expensiveLimiter = rateLimiter({
  maxRequests: 10,
  timeWindowSeconds: 60,
});

api.register('/search', expensiveLimiter, (ammo) => {
  // Search logic
});

api.register('/export', expensiveLimiter, (ammo) => {
  // Export logic
});
```

## Monitoring

Check rate limit status in your handlers:

```javascript
target.register('/status', (ammo) => {
  ammo.fire({
    limit: ammo.res.getHeader('RateLimit-Limit'),
    remaining: ammo.res.getHeader('RateLimit-Remaining'),
    reset: ammo.res.getHeader('RateLimit-Reset'),
  });
});
```

## Custom Storage Backend

Extend the `RateLimitStorage` base class to create your own storage backend:

```javascript
import RateLimitStorage from 'te.js/rate-limit/storage/base.js';

class PostgresStorage extends RateLimitStorage {
  async get(key) {
    // Retrieve rate limit data for key
    // Return object or null if not found
  }

  async set(key, value, ttl) {
    // Store rate limit data with TTL (seconds)
  }

  async increment(key) {
    // Increment counter, return new value or null
  }

  async delete(key) {
    // Delete rate limit data for key
  }
}
```

The built-in `MemoryStorage` and `RedisStorage` backends both extend this base class.

## Best Practices

1. **Use Redis in production** — Memory store doesn't share counters across instances; use `store: { type: 'redis', url: '...' }` for distributed deployments
2. **Set appropriate limits** — Too strict frustrates users, too lenient invites abuse
3. **Different limits for different endpoints** — Auth endpoints need stricter limits
4. **Include headers** — Help clients self-regulate
5. **Provide clear error messages** — Tell users when they can retry
6. **Consider user tiers** — Premium users may need higher limits
7. **Monitor and adjust** — Track rate limit hits and adjust accordingly
