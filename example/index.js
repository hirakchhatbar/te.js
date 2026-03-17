import Tejas from 'te.js';

const app = new Tejas();

// Global middleware: request logging
app.midair((ammo, next) => {
  console.log(`[${new Date().toISOString()}] ${ammo.method} ${ammo.path}`);
  next();
});

// Rate limiting
app.withRateLimit({
  maxRequests: 60,
  timeWindowSeconds: 60,
});

// Serve API docs at /docs (requires openapi.json from `tejas generate:docs`)
app.serveDocs({ specPath: './openapi.json' });

app.takeoff();
