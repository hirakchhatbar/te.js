import Tejas from 'te.js';

const app = new Tejas();

// Global middleware: request logging
app.midair((ammo, next) => {
  console.log(`[${new Date().toISOString()}] ${ammo.method} ${ammo.path}`);
  next();
});

// Rate limiting (memory store - no Redis required)
app.withRateLimit({
  maxRequests: 60,
  timeWindowSeconds: 60,
});

// Optional: Redis for /cache endpoints. Set REDIS_URL to enable.
const redisUrl = process.env.REDIS_URL;

app.takeoff(
  redisUrl
    ? {
        withRedis: { url: redisUrl },
      }
    : {},
);
