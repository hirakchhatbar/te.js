# Middleware

Middleware functions in Tejas intercept requests before they reach your route handlers. They can modify the request, perform checks, or terminate the request early.

## Middleware Signature

Tejas supports two middleware signatures:

### Tejas Style (Recommended)

```javascript
const middleware = (ammo, next) => {
  // Do something
  next(); // Continue to next middleware/handler
};
```

### Express Style (Compatible)

```javascript
const middleware = (req, res, next) => {
  // Express-style middleware
  next();
};
```

Tejas automatically detects which style you're using based on the function's argument count.

## Middleware Levels

### 1. Global Middleware

Applied to **all routes** in your application:

```javascript
import Tejas from 'te.js';

const app = new Tejas();

// Add global middleware
app.midair((ammo, next) => {
  console.log(`[${new Date().toISOString()}] ${ammo.method} ${ammo.path}`);
  next();
});

// Multiple middleware in one call
app.midair(
  loggingMiddleware,
  corsMiddleware,
  compressionMiddleware
);

app.takeoff();
```

### 2. Target Middleware

Applied to **all routes in a Target**:

```javascript
import { Target } from 'te.js';

const api = new Target('/api');

// All /api/* routes require authentication
api.midair(authMiddleware);

api.register('/users', handler);    // Protected
api.register('/posts', handler);    // Protected
api.register('/comments', handler); // Protected
```

### 3. Route Middleware

Applied to a **specific route** only:

```javascript
// Only /admin routes require admin privileges
target.register('/admin', authMiddleware, adminMiddleware, (ammo) => {
  ammo.fire({ admin: 'panel' });
});

// Public route - no middleware
target.register('/public', (ammo) => {
  ammo.fire({ public: true });
});
```

## Execution Order

Middleware executes in this order:

```
Request
   │
   ▼
┌──────────────────┐
│ Global Middleware │  (app.midair)
└──────────────────┘
   │
   ▼
┌──────────────────┐
│ Target Middleware │  (target.midair)
└──────────────────┘
   │
   ▼
┌──────────────────┐
│ Route Middleware  │  (in register())
└──────────────────┘
   │
   ▼
┌──────────────────┐
│ Route Handler     │
└──────────────────┘
   │
   ▼
Response
```

## Common Middleware Patterns

### Authentication

```javascript
// middleware/auth.js
import { TejError } from 'te.js';

export const authMiddleware = async (ammo, next) => {
  const token = ammo.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new TejError(401, 'No token provided');
  }
  
  try {
    const user = await verifyToken(token);
    ammo.user = user; // Attach user to ammo
    next();
  } catch (error) {
    throw new TejError(401, 'Invalid token');
  }
};
```

### Logging

```javascript
// middleware/logging.js
export const loggingMiddleware = (ammo, next) => {
  const start = Date.now();
  
  // Store original fire method
  const originalFire = ammo.fire.bind(ammo);
  
  // Override to log after response
  ammo.fire = (...args) => {
    const duration = Date.now() - start;
    console.log(`${ammo.method} ${ammo.path} - ${duration}ms`);
    originalFire(...args);
  };
  
  next();
};
```

### CORS

```javascript
// middleware/cors.js
export const corsMiddleware = (ammo, next) => {
  ammo.res.setHeader('Access-Control-Allow-Origin', '*');
  ammo.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ammo.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (ammo.OPTIONS) {
    return ammo.fire(204);
  }
  
  next();
};
```

### Rate Limiting Check

```javascript
// middleware/rate-check.js
export const rateLimitCheck = (ammo, next) => {
  const remaining = ammo.res.getHeader('RateLimit-Remaining');
  
  if (remaining && parseInt(remaining) < 10) {
    console.warn(`Low rate limit remaining for ${ammo.ip}`);
  }
  
  next();
};
```

### Request Validation

```javascript
// middleware/validate.js
import { TejError } from 'te.js';

export const validateBody = (schema) => {
  return (ammo, next) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = ammo.payload[field];
      
      if (rules.required && !value) {
        errors.push(`${field} is required`);
      }
      
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }
    }
    
    if (errors.length > 0) {
      throw new TejError(400, errors.join(', '));
    }
    
    next();
  };
};

// Usage
target.register('/users', 
  validateBody({
    name: { required: true, type: 'string' },
    email: { required: true, type: 'string' }
  }),
  (ammo) => {
    // Payload is validated
    ammo.fire(201, { created: true });
  }
);
```

## Using Express Middleware

Tejas is compatible with Express middleware:

```javascript
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const app = new Tejas();

// Express middleware works directly
app.midair(cors());
app.midair(helmet());
app.midair(compression());

app.takeoff();
```

### Passport.js Integration

```javascript
import passport from 'passport';

const app = new Tejas();

// Initialize passport
app.midair(passport.initialize());

// In your target
target.register('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] }),
  (ammo) => {
    // Redirect handled by passport
  }
);

target.register('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (ammo) => {
    ammo.fire({ user: ammo.req.user });
  }
);
```

## Async Middleware

Middleware can be async:

```javascript
const asyncMiddleware = async (ammo, next) => {
  const result = await someAsyncOperation();
  ammo.asyncResult = result;
  next();
};
```

## Terminating Early

To stop the middleware chain, simply don't call `next()`:

```javascript
const earlyReturn = (ammo, next) => {
  if (someCondition) {
    return ammo.fire(403, 'Forbidden');
    // next() is not called, chain stops
  }
  
  next(); // Continue chain
};
```

## Middleware Factory Pattern

Create configurable middleware:

```javascript
// middleware/cache.js
export const cache = (ttl = 60) => {
  const store = new Map();
  
  return (ammo, next) => {
    const key = ammo.path;
    const cached = store.get(key);
    
    if (cached && Date.now() - cached.time < ttl * 1000) {
      return ammo.fire(cached.data);
    }
    
    const originalFire = ammo.fire.bind(ammo);
    ammo.fire = (...args) => {
      store.set(key, { data: args[0], time: Date.now() });
      originalFire(...args);
    };
    
    next();
  };
};

// Usage
target.register('/expensive', cache(300), (ammo) => {
  const data = expensiveComputation();
  ammo.fire(data);
});
```

## Best Practices

1. **Keep middleware focused** — Each middleware should do one thing
2. **Always call next()** — Unless intentionally terminating the chain
3. **Handle errors** — Use try/catch in async middleware
4. **Use factories** — For configurable middleware
5. **Order matters** — Place authentication before authorization
6. **Don't mutate payload directly** — Add new properties instead

