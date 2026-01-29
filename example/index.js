import Tejas from 'te.js';

const tejas = new Tejas();

// Configure rate limiting with token bucket algorithm and Redis storage
tejas
  .withRedis({
    url: 'redis://ec2-54-175-198-215.compute-1.amazonaws.com:1403',
  })
  .withRateLimit({
    maxRequests: 100,
    timeWindowSeconds: 60,
    algorithm: 'token-bucket',
    store: 'redis',
  })
  .takeoff();
