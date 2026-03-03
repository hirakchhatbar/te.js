# API Reference

Complete API documentation for the Tejas framework.

---

## Tejas Class

The main application class. Only one instance exists per process (singleton).

### Constructor

```javascript
import Tejas from 'te.js';

const app = new Tejas(options);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entry` | string | *(auto-resolved)* | Entry file for `tejas fly` |
| `port` | number | `1403` | Server port |
| `log.http_requests` | boolean | `false` | Enable request logging |
| `log.exceptions` | boolean | `false` | Enable error logging |
| `body.max_size` | number | `10485760` (10 MB) | Max body size (bytes) |
| `body.timeout` | number | `30000` (30 s) | Body parsing timeout (ms) |
| `dir.targets` | string | `"targets"` | Directory for auto-discovered `.target.js` files |

See [Configuration](./configuration.md) for all options including the `docs` section.

### Methods

#### midair(...middlewares)

Register global middleware. These run for every incoming request.

```javascript
app.midair(middleware1, middleware2);
```

#### withRedis(config)

Initialize a Redis connection. Auto-installs the `redis` package if needed.

```javascript
app.withRedis({
  url: 'redis://localhost:6379',
  isCluster: false
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | — | Redis connection URL |
| `isCluster` | boolean | `false` | Use Redis Cluster |
| `socket.host` | string | — | Redis host |
| `socket.port` | number | — | Redis port |
| `socket.tls` | boolean | `false` | Use TLS |
| `password` | string | — | Redis password |

**Returns:** `Promise<Tejas>` (for chaining)

#### withMongo(config)

Initialize a MongoDB connection. Auto-installs `mongoose` if needed.

```javascript
app.withMongo({
  uri: 'mongodb://localhost:27017/myapp'
});
```

| Option | Type | Description |
|--------|------|-------------|
| `uri` | string | MongoDB connection URI |

**Returns:** `Tejas` (for chaining)

#### withRateLimit(config)

Enable global rate limiting.

```javascript
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
  algorithm: 'sliding-window',
  store: 'memory'
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRequests` | number | `60` | Max requests per window |
| `timeWindowSeconds` | number | `60` | Time window in seconds |
| `algorithm` | string | `'sliding-window'` | `'sliding-window'`, `'token-bucket'`, or `'fixed-window'` |
| `store` | string | `'memory'` | `'memory'` or `'redis'` |
| `keyGenerator` | function | `(ammo) => ammo.ip` | Generates unique key per client |
| `keyPrefix` | string | `'rl:'` | Storage key prefix |
| `headerFormat.type` | string | `'standard'` | `'standard'`, `'legacy'`, or `'both'` |
| `headerFormat.draft7` | boolean | `false` | Include `RateLimit-Policy` header |
| `headerFormat.draft8` | boolean | `false` | Use delta-seconds for `RateLimit-Reset` |
| `onRateLimited` | function | — | Custom handler when rate limited |

**Returns:** `Tejas` (for chaining)

#### serveDocs(config)

Serve an interactive API documentation UI (Scalar) from a pre-generated OpenAPI spec.

```javascript
app.serveDocs({
  specPath: './openapi.json',
  scalarConfig: { layout: 'modern', theme: 'default' }
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `specPath` | string | `'./openapi.json'` | Path to the OpenAPI spec file |
| `scalarConfig` | object | *(defaults)* | Scalar UI configuration options |

Registers `GET /docs` (HTML UI) and `GET /docs/openapi.json` (spec JSON).

**Returns:** `Tejas` (for chaining)

#### takeoff(options)

Start the HTTP server. Optionally initializes database connections.

```javascript
app.takeoff();

app.takeoff({
  withRedis: { url: 'redis://localhost:6379' },
  withMongo: { uri: 'mongodb://localhost:27017/db' }
});
```

---

## Target Class

Route grouping class (equivalent to Express `Router`).

### Constructor

```javascript
import { Target } from 'te.js';

const target = new Target(basePath);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `basePath` | string | `''` | Base path for all routes in this target |

### Methods

#### midair(...middlewares)

Add target-level middleware that runs for all routes in this target.

```javascript
target.midair(authMiddleware, loggingMiddleware);
```

#### register(path, [metadata], ...middlewares, handler)

Register an endpoint.

```javascript
// Basic
target.register('/path', handler);

// With middleware
target.register('/path', middleware1, middleware2, handler);

// With metadata (for auto-docs)
target.register('/path', {
  summary: 'Description',
  methods: ['GET', 'POST'],
  request: { name: { type: 'string', required: true } },
  response: { 200: { description: 'Success' } }
}, middleware1, handler);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Route path (supports `:param` for parameters) |
| `metadata` | object | *(optional)* Metadata for OpenAPI generation |
| `middlewares` | function[] | *(optional)* Route-specific middleware |
| `handler` | function | Route handler `(ammo) => {}` (always the last argument) |

---

## Ammo Class

Request/response wrapper created for each incoming request.

### Properties

#### HTTP Method Flags

| Property | Type | Description |
|----------|------|-------------|
| `GET` | boolean | `true` if GET request |
| `POST` | boolean | `true` if POST request |
| `PUT` | boolean | `true` if PUT request |
| `DELETE` | boolean | `true` if DELETE request |
| `PATCH` | boolean | `true` if PATCH request |
| `HEAD` | boolean | `true` if HEAD request |
| `OPTIONS` | boolean | `true` if OPTIONS request |

#### Request Data

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | HTTP method string (e.g. `'GET'`) |
| `payload` | object | Merged: query params + body + route params (route params have highest priority) |
| `headers` | object | Request headers (lowercase keys) |
| `ip` | string | Client IP address |

#### URL Data

| Property | Type | Description |
|----------|------|-------------|
| `path` | string | Full URL path with query string |
| `endpoint` | string | Path without query string |
| `protocol` | string | `'http'` or `'https'` |
| `hostname` | string | Request hostname |
| `fullURL` | string | Complete URL |

#### Raw Objects

| Property | Type | Description |
|----------|------|-------------|
| `req` | IncomingMessage | Node.js request object |
| `res` | ServerResponse | Node.js response object |

#### Response Data

| Property | Type | Description |
|----------|------|-------------|
| `dispatchedData` | any | The data sent via the most recent `fire()` call. `undefined` until `fire()` is called |

### Methods

#### fire()

Send a response to the client.

| Signature | Status | Body | Content-Type |
|-----------|--------|------|-------------|
| `fire()` | 204 | *(empty)* | — |
| `fire("text")` | 200 | text | `text/plain` |
| `fire({ json })` | 200 | JSON string | `application/json` |
| `fire(201)` | 201 | status message | `text/plain` |
| `fire(201, data)` | 201 | data | auto-detected |
| `fire(200, html, "text/html")` | 200 | html | `text/html` |

#### throw()

Send an error response.

| Signature | Behavior |
|-----------|----------|
| `throw()` | 500 "Internal Server Error" |
| `throw(404)` | 404 with default status message |
| `throw(404, "msg")` | 404 with custom message |
| `throw(new TejError(code, msg))` | Uses TejError's code and message |
| `throw(new Error("msg"))` | 500 with error message |

#### redirect(url, statusCode)

HTTP redirect.

```javascript
ammo.redirect('/new-path');        // 302 temporary
ammo.redirect('/new-path', 301);   // 301 permanent
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | — | Redirect URL |
| `statusCode` | number | `302` | HTTP status code |

#### notFound()

Throws 404 Not Found.

#### notAllowed()

Throws 405 Method Not Allowed.

#### unauthorized()

Throws 401 Unauthorized.

#### defaultEntry()

Sends the default Tejas HTML entry page. Used internally for the root `/` route when no target matches.

---

## TejError Class

Custom error class for HTTP errors.

```javascript
import { TejError } from 'te.js';

throw new TejError(statusCode, message);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `statusCode` | number | HTTP status code |
| `message` | string | Error message |

| Property | Type | Description |
|----------|------|-------------|
| `code` | number | HTTP status code |
| `message` | string | Error message |
| `name` | string | `'TejError'` |

### BodyParserError

A subclass of `TejError` thrown during request body parsing:

| Status | Condition |
|--------|-----------|
| 400 | Malformed JSON, invalid URL-encoded data, or corrupted multipart data |
| 408 | Body parsing timed out |
| 413 | Request body exceeds `body.max_size` |
| 415 | Unsupported content type |

---

## TejFileUploader Class

File upload handler as middleware.

### Constructor

```javascript
import { TejFileUploader } from 'te.js';

const upload = new TejFileUploader(options);
```

| Option | Type | Description |
|--------|------|-------------|
| `destination` | string | Directory to save uploaded files |
| `name` | string | Optional custom filename |
| `maxFileSize` | number | Max file size in bytes (throws 413 if exceeded) |

### Methods

#### file(...fieldNames)

Returns middleware for single file upload per field.

```javascript
target.register('/upload', upload.file('avatar'), handler);
```

#### files(...fieldNames)

Returns middleware for multiple files per field, grouped by field name.

```javascript
target.register('/upload', upload.files('photos', 'documents'), handler);
```

### Uploaded File Object

```javascript
{
  filename: string,      // Original filename
  extension: string,     // File extension
  path: {
    absolute: string,    // Absolute path on disk
    relative: string     // Relative to cwd
  },
  mimetype: string,      // MIME type
  size: {
    value: number,       // Numeric size value
    symbol: string       // Unit: 'B', 'KB', 'MB', etc.
  }
}
```

---

## Utility Functions

### listAllEndpoints(grouped)

Get all registered endpoints.

```javascript
import { listAllEndpoints } from 'te.js';

const routes = listAllEndpoints();       // ['/', '/users', '/api/data']
const grouped = listAllEndpoints(true);  // { users: [...], api: [...] }
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `grouped` | boolean | `false` | Group by first path segment |

---

## Middleware Signatures

Tejas detects the middleware style by argument count:

### Tejas Style (2 arguments)

```javascript
const middleware = (ammo, next) => {
  // Access ammo properties
  next();
};
```

### Express Style (3 arguments)

```javascript
const middleware = (req, res, next) => {
  // Access req, res directly
  next();
};
```

---

## Environment Access

```javascript
import { env, setEnv } from 'tej-env';

const port = env('PORT');
setEnv('CUSTOM_VAR', 'value');
```

---

## Database Manager

```javascript
import dbManager from 'te.js/database/index.js';

// Get connection
const redis = dbManager.getConnection('redis');
const mongo = dbManager.getConnection('mongodb');

// Check connection status
const status = dbManager.hasConnection('redis', {});
// { exists: boolean, initializing: boolean }

// Close connections
await dbManager.closeConnection('redis');
await dbManager.closeAllConnections();

// Get all active connections
const connections = dbManager.getActiveConnections();
// Returns: Map
```

---

## RateLimitStorage Base Class

Abstract base class for custom rate limit storage backends:

```javascript
import RateLimitStorage from 'te.js/rate-limit/storage/base.js';

class CustomStorage extends RateLimitStorage {
  async get(key) { }       // Return object or null
  async set(key, value, ttl) { }  // Store with TTL (seconds)
  async increment(key) { }  // Return new value or null
  async delete(key) { }     // Remove key
}
```
