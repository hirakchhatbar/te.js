# Getting Started with Tejas

Tejas is a lightweight Node.js framework for building powerful backend services. It features an intuitive API with aviation-inspired naming conventions.

## Prerequisites

- Node.js 18.x or higher
- npm or yarn

## Installation

```bash
npm install te.js
```

## Quick Start

### 1. Create Your Application

Create an `index.js` file:

```javascript
import Tejas from 'te.js';

const app = new Tejas();

app.takeoff();
```

### 2. Create Your First Route

Create a `targets` directory and add `hello.target.js`:

```javascript
import { Target } from 'te.js';

const target = new Target('/hello');

target.register('/', (ammo) => {
  ammo.fire({ message: 'Hello, World!' });
});

target.register('/greet/:name', (ammo) => {
  const { name } = ammo.payload;
  ammo.fire({ message: `Hello, ${name}!` });
});
```

### 3. Run Your Application

```bash
node index.js
```

Your server is now running on `http://localhost:1403`

## Core Concepts

### Terminology

Tejas uses aviation-inspired naming:

| Term | Express Equivalent | Description |
|------|-------------------|-------------|
| `Tejas` | `express()` | Main application instance |
| `Target` | `Router` | Route grouping |
| `Ammo` | `req` + `res` | Request/response wrapper |
| `fire()` | `res.send()` | Send response |
| `throw()` | Error response | Send error |
| `midair()` | `use()` | Register middleware |
| `takeoff()` | `listen()` | Start server |

### Basic Structure

```
my-app/
├── index.js              # Application entry point
├── tejas.config.json     # Optional configuration
├── targets/              # Route definitions
│   ├── user.target.js
│   ├── auth.target.js
│   └── api/
│       └── v1.target.js
└── middlewares/          # Custom middleware
    └── auth.js
```

## Next Steps

- [Configuration](./configuration.md) - Learn about configuration options
- [Routing](./routing.md) - Deep dive into the routing system
- [Middleware](./middleware.md) - Add middleware to your application
- [Database](./database.md) - Connect to MongoDB or Redis

## Example Application

Here's a more complete example:

```javascript
import Tejas from 'te.js';

const app = new Tejas({
  port: 3000,
  log: {
    http_requests: true,
    exceptions: true
  }
});

// Global middleware
app.midair((ammo, next) => {
  console.log(`${ammo.method} ${ammo.path}`);
  next();
});

// Start with Redis and rate limiting
app
  .withRedis({ url: 'redis://localhost:6379' })
  .withRateLimit({
    maxRequests: 100,
    timeWindowSeconds: 60,
    algorithm: 'sliding-window',
    store: 'redis'
  })
  .takeoff();
```

```javascript
// targets/api.target.js
import { Target } from 'te.js';

const api = new Target('/api');

// GET /api/status
api.register('/status', (ammo) => {
  if (ammo.GET) {
    ammo.fire({ status: 'operational', timestamp: Date.now() });
  } else {
    ammo.notAllowed();
  }
});

// POST /api/echo
api.register('/echo', (ammo) => {
  if (ammo.POST) {
    ammo.fire(ammo.payload);
  } else {
    ammo.notAllowed();
  }
});
```

