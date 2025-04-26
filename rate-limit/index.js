// Export rate limiter implementations
export { default as FixedWindowRateLimiter } from './algorithms/fixed-window.js';
export { default as SlidingWindowRateLimiter } from './algorithms/sliding-window.js';
export { default as TokenBucketRateLimiter } from './algorithms/token-bucket.js';

// Export storage implementations for custom storage
export { default as MemoryStorage } from './storage/memory.js';
export { default as RedisStorage } from './storage/redis.js';

/**
 * Example usage with algorithm-specific options at the top level:
 * 
 * // Token Bucket example
 * const tokenBucketLimiter = new TokenBucketRateLimiter({
 *   maxRequests: 10,        // Allow 10 requests
 *   timeWindowSeconds: 60,  // Per 60 seconds
 *   tokenBucketConfig: {    // Algorithm-specific options
 *     refillRate: 0.5,      // Refill 1 token every 2 seconds
 *     burstSize: 15         // Allow bursts up to 15 tokens
 *   }
 * });
 * 
 * // Sliding Window example with weighted previous window
 * const slidingLimiter = new SlidingWindowRateLimiter({
 *   maxRequests: 100,        // Allow 100 requests
 *   timeWindowSeconds: 60,   // Per 60 seconds
 *   slidingWindowConfig: {   // Algorithm-specific options
 *     granularity: 1,        // 1-second precision
 *     weights: {
 *       current: 1,          // Full weight for current window
 *       previous: 0.5        // Half weight for previous window
 *     }
 *   }
 * });
 * 
 * // Fixed Window example with strict time alignment
 * const fixedLimiter = new FixedWindowRateLimiter({
 *   maxRequests: 60,         // Allow 60 requests
 *   timeWindowSeconds: 60,   // Per 60 seconds
 *   fixedWindowConfig: {     // Algorithm-specific options
 *     strictWindow: true     // Align windows with clock minutes
 *   }
 * });
 * 
 * // Using with Redis storage
 * const redisLimiter = new TokenBucketRateLimiter({
 *   maxRequests: 10,
 *   timeWindowSeconds: 60,
 *   redis: {                 // Redis connection options
 *     url: "redis://localhost:6379"
 *   },
 *   tokenBucketConfig: {     // Algorithm-specific options
 *     refillRate: 0.5,
 *     burstSize: 15
 *   }
 * });
 */