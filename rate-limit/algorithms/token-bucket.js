import RateLimiter from '../base.js';
import TejError from '../../server/error.js';

/**
 * Token Bucket Rate Limiter Implementation
 *
 * @extends RateLimiter
 * @description
 * The token bucket algorithm provides smooth rate limiting with burst handling capabilities.
 * It maintains a bucket of tokens that refills at a constant rate, allowing for temporary
 * bursts of traffic while maintaining a long-term average rate.
 *
 * Key features:
 * - Smooth rate limiting with continuous token regeneration
 * - Burst handling with configurable burst size
 * - Predictable long-term average rate
 * - Fair distribution of requests over time
 *
 * @example
 * // Create a rate limiter that allows bursts
 * const limiter = new TokenBucketRateLimiter({
 *   maxRequests: 60,        // Base rate: 60 requests per minute
 *   timeWindowSeconds: 60,
 *   tokenBucket: {
 *     refillRate: 1,        // Refill 1 token per second
 *     burstSize: 90         // Allow bursts up to 90 requests
 *   }
 * });
 *
 * // Use the rate limiter in an endpoint
 * async function handleRequest(ip) {
 *   const result = await limiter.consume(ip);
 *   if (!result.success) {
 *     throw new TejError(429, 'Rate limit exceeded');
 *   }
 *   // Handle request...
 * }
 */
class TokenBucketRateLimiter extends RateLimiter {
  constructor(options) {
    if (!options.tokenBucketConfig) {
      options.tokenBucketConfig = {}; // Ensure defaults are set in base class
    }
    super(options);

    if (!this.tokenBucketOptions) {
      throw new TejError(
        400,
        'TokenBucketRateLimiter requires tokenBucketConfig options',
      );
    }
  }

  /**
   * Check if a request should be allowed and update token count
   *
   * @param {string} identifier - Unique identifier for rate limiting (e.g., IP address, user ID)
   * @returns {Promise<Object>} Rate limit check result
   * @returns {boolean} result.success - Whether the request is allowed
   * @returns {number} result.remainingRequests - Number of tokens remaining in the bucket
   * @returns {number} result.resetTime - Unix timestamp when the next token will be added
   */
  async consume(identifier) {
    const key = this.getKey(identifier);
    const now = Date.now();
    const options = this.getAlgorithmOptions('tokenBucketConfig');

    const stored = await this.storage.get(key);
    if (!stored) {
      await this.storage.set(
        key,
        {
          tokens: options.burstSize - 1,
          lastRefill: now,
        },
        this.options.timeWindowSeconds,
      );

      return {
        success: true,
        remainingRequests: options.burstSize - 1,
        resetTime: Math.floor(now / 1000) + this.options.timeWindowSeconds,
      };
    }

    // Calculate token refill based on configured refill rate
    const timePassed = now - stored.lastRefill;
    const refillTokens = Math.floor((timePassed * options.refillRate) / 1000);

    stored.tokens = Math.min(options.burstSize, stored.tokens + refillTokens);
    stored.lastRefill = now;

    if (stored.tokens < 1) {
      const timeToNextToken = Math.ceil(
        ((1 - stored.tokens) / options.refillRate) * 1000,
      );
      return {
        success: false,
        remainingRequests: 0,
        resetTime: Math.floor((now + timeToNextToken) / 1000),
      };
    }

    stored.tokens--;
    await this.storage.set(key, stored, this.options.timeWindowSeconds);

    return {
      success: true,
      remainingRequests: Math.floor(stored.tokens),
      resetTime: Math.floor(now / 1000) + this.options.timeWindowSeconds,
    };
  }
}

export default TokenBucketRateLimiter;
