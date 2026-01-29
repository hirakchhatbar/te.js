<p align="center">
  <img src="https://tejas-documentation.vercel.app/tejas-logo.svg" alt="Tejas Logo" width="200">
</p>

<h1 align="center">Tejas</h1>

<p align="center">
  <strong>A Node.js Framework for Powerful Backend Services</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/te.js"><img src="https://img.shields.io/npm/v/te.js.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/te.js"><img src="https://img.shields.io/npm/dm/te.js.svg" alt="npm downloads"></a>
  <a href="https://github.com/hirakchhatbar/te.js/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/te.js.svg" alt="license"></a>
</p>

<p align="center">
  <a href="https://tejas-documentation.vercel.app">Documentation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="./docs">Full Docs</a>
</p>

---

## What is Tejas?

Tejas (meaning "radiance" in Hindi) is a modern, lightweight Node.js framework designed for building robust backend services. It offers an intuitive API with aviation-inspired naming conventions, making your code both expressive and enjoyable to write.

```javascript
import Tejas, { Target } from 'te.js';

const app = new Tejas();
const api = new Target('/api');

api.register('/hello/:name', (ammo) => {
  ammo.fire({ message: `Hello, ${ammo.payload.name}!` });
});

app.takeoff();
```

## Features

- **Simple Routing** — Clean, method-agnostic URL structures with parameterized routes
- **Express Compatible** — Use existing Express middleware alongside Tejas middleware
- **Built-in Rate Limiting** — Three algorithms (Token Bucket, Sliding Window, Fixed Window)
- **Database Ready** — First-class support for MongoDB and Redis
- **File Uploads** — Easy file handling with size limits and type validation
- **Robust Error Handling** — Your app stays running even with uncaught exceptions
- **Request Logging** — Built-in HTTP request and exception logging
- **Auto-Discovery** — Automatic route registration from target files

## Quick Start

### Installation

```bash
npm install te.js
```

### Create Your App

```javascript
// index.js
import Tejas from 'te.js';

const app = new Tejas({ port: 3000 });
app.takeoff();
```

### Define Routes

```javascript
// targets/user.target.js
import { Target } from 'te.js';

const users = new Target('/users');

users.register('/', (ammo) => {
  if (ammo.GET) {
    ammo.fire([{ id: 1, name: 'John' }]);
  } else if (ammo.POST) {
    const { name, email } = ammo.payload;
    ammo.fire(201, { id: 2, name, email });
  } else {
    ammo.notAllowed();
  }
});

users.register('/:id', (ammo) => {
  const { id } = ammo.payload;
  ammo.fire({ id, name: 'John Doe' });
});
```

### Run

```bash
node index.js
# Server running at http://localhost:3000
```

## Core Concepts

| Tejas Term | Purpose | Express Equivalent |
|------------|---------|-------------------|
| `Tejas` | Application instance | `express()` |
| `Target` | Route group/router | `Router()` |
| `Ammo` | Request/response context | `req` + `res` |
| `fire()` | Send response | `res.send()` |
| `midair()` | Register middleware | `use()` |
| `takeoff()` | Start server | `listen()` |

## Configuration

Tejas supports multiple configuration sources (in order of priority):

1. **Constructor options** (highest)
2. **Environment variables**
3. **tejas.config.json** (lowest)

```javascript
// Using constructor options
const app = new Tejas({
  port: 3000,
  log: {
    http_requests: true,
    exceptions: true
  }
});
```

```json
// tejas.config.json
{
  "port": 3000,
  "dir": {
    "targets": "targets"
  },
  "log": {
    "http_requests": true
  }
}
```

## Database Integration

### Redis

```javascript
const app = new Tejas();

app
  .withRedis({ url: 'redis://localhost:6379' })
  .takeoff();
```

### MongoDB

```javascript
app.takeoff({
  withMongo: { uri: 'mongodb://localhost:27017/myapp' }
});
```

## Rate Limiting

Protect your API with built-in rate limiting:

```javascript
app
  .withRedis({ url: 'redis://localhost:6379' })
  .withRateLimit({
    maxRequests: 100,
    timeWindowSeconds: 60,
    algorithm: 'sliding-window', // or 'token-bucket', 'fixed-window'
    store: 'redis' // or 'memory'
  })
  .takeoff();
```

## File Uploads

```javascript
import { Target, TejFileUploader } from 'te.js';

const upload = new TejFileUploader({
  destination: 'uploads/',
  maxFileSize: 5 * 1024 * 1024 // 5MB
});

const target = new Target('/files');

target.register('/upload', upload.file('avatar'), (ammo) => {
  ammo.fire({ file: ammo.payload.avatar });
});
```

## Middleware

### Global Middleware

```javascript
app.midair((ammo, next) => {
  console.log(`${ammo.method} ${ammo.path}`);
  next();
});
```

### Target Middleware

```javascript
const api = new Target('/api');

api.midair(authMiddleware);

api.register('/protected', (ammo) => {
  ammo.fire({ secret: 'data' });
});
```

### Route Middleware

```javascript
api.register('/admin', adminOnly, (ammo) => {
  ammo.fire({ admin: true });
});
```

### Express Compatibility

```javascript
// Express-style middleware works too!
app.midair((req, res, next) => {
  req.customData = 'hello';
  next();
});
```

## Error Handling

```javascript
import { TejError } from 'te.js';

target.register('/resource/:id', async (ammo) => {
  const resource = await findResource(ammo.payload.id);
  
  if (!resource) {
    throw new TejError(404, 'Resource not found');
  }
  
  ammo.fire(resource);
});
```

## Project Structure

```
my-app/
├── index.js
├── tejas.config.json
├── targets/
│   ├── user.target.js
│   ├── auth.target.js
│   └── api/
│       └── products.target.js
└── middlewares/
    ├── auth.js
    └── logging.js
```

## API Reference

### Tejas Class

```javascript
const app = new Tejas(options);

app.midair(middleware)      // Add global middleware
app.withRedis(config)       // Initialize Redis connection
app.withMongo(config)       // Initialize MongoDB connection
app.withRateLimit(config)   // Enable rate limiting
app.takeoff(options)        // Start the server
```

### Target Class

```javascript
const target = new Target('/base');

target.midair(middleware)           // Add target-level middleware
target.register(path, ...handlers)  // Register an endpoint
```

### Ammo Object

```javascript
// Properties
ammo.GET, ammo.POST, ammo.PUT, ammo.DELETE  // HTTP method flags
ammo.payload    // Request body + query params + route params
ammo.headers    // Request headers
ammo.ip         // Client IP address
ammo.path       // Request path
ammo.method     // HTTP method string

// Methods
ammo.fire(data)              // Send 200 response
ammo.fire(status, data)      // Send response with status
ammo.throw(error)            // Send error response
ammo.redirect(url)           // Redirect
ammo.notFound()              // 404 response
ammo.notAllowed()            // 405 response
ammo.unauthorized()          // 401 response
```

## Documentation

For comprehensive documentation, see the [docs folder](./docs) or visit [tejas-documentation.vercel.app](https://tejas-documentation.vercel.app).

- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/configuration.md)
- [Routing](./docs/routing.md)
- [Middleware](./docs/middleware.md)
- [Database](./docs/database.md)
- [Rate Limiting](./docs/rate-limiting.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC © [Hirak Chhatbar](https://github.com/hirakchhatbar)
