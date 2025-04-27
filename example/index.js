import Tejas from 'te.js';

const tejas = new Tejas();

// Configure rate limiting with token bucket algorithm and Redis storage
tejas
  .withRateLimit({
    maxRequests: 100,
    timeWindowSeconds: 60,
    algorithm: 'token-bucket',
    algorithmOptions: {
      refillRate: 2, // 2 tokens per second
      burstSize: 20, // Allow bursts up to 20 requests
    },
    redis: {
      socket: {
        host: 'ec2-54-175-198-215.compute-1.amazonaws.com',
        port: 1403,
      },
    },
    headerFormat: {
      type: 'both', // Use both standard and legacy headers
      draft7: true, // Include policy information
    },
  })
  .withRedis()
  .withMongo()
  .takeoff();
