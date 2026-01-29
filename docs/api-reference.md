# API Reference

Complete API documentation for the Tejas framework.

---

## Tejas Class

The main application class.

### Constructor

```javascript
import Tejas from 'te.js';

const app = new Tejas(options);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | `1403` | Server port |
| `log.http_requests` | boolean | `false` | Enable request logging |
| `log.exceptions` | boolean | `false` | Enable error logging |
| `body.max_size` | number | `10485760` | Max body size (bytes) |
| `body.timeout` | number | `30000` | Body parsing timeout (ms) |
| `dir.targets` | string | `"targets"` | Targets directory |

### Methods

#### midair(...middlewares)

Register global middleware.

```javascript
app.midair(middleware1, middleware2);
```

#### withRedis(config)

Initialize Redis connection.

```javascript
app.withRedis({
  url: 'redis://localhost:6379',
  isCluster: false
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | - | Redis connection URL |
| `isCluster` | boolean | `false` | Use Redis Cluster |
| `socket.host` | string | - | Redis host |
| `socket.port` | number | - | Redis port |
| `socket.tls` | boolean | `false` | Use TLS |

**Returns:** `Promise<Tejas>` (for chaining)

#### withMongo(config)

Initialize MongoDB connection.

```javascript
app.withMongo({
  uri: 'mongodb://localhost:27017/myapp',
  options: {}
});
```

| Option | Type | Description |
|--------|------|-------------|
| `uri` | string | MongoDB connection URI |
| `options` | object | MongoDB driver options |

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
| `algorithm` | string | `'sliding-window'` | Rate limiting algorithm |
| `store` | string | `'memory'` | Storage backend |
| `keyGenerator` | function | IP-based | Key generation function |
| `headerFormat.type` | string | `'standard'` | Header format |
| `onRateLimited` | function | - | Custom rate limit handler |

**Returns:** `Tejas` (for chaining)

#### takeoff(options)

Start the HTTP server.

```javascript
app.takeoff();

// With database initialization
app.takeoff({
  withRedis: { url: 'redis://localhost:6379' },
  withMongo: { uri: 'mongodb://localhost:27017/db' }
});
```

---

## Target Class

Route grouping class.

### Constructor

```javascript
import { Target } from 'te.js';

const target = new Target(basePath);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `basePath` | string | `''` | Base path for all routes |

### Methods

#### midair(...middlewares)

Add target-level middleware.

```javascript
target.midair(authMiddleware, loggingMiddleware);
```

#### register(path, ...middlewaresAndHandler)

Register an endpoint.

```javascript
// Without middleware
target.register('/path', handler);

// With middleware
target.register('/path', middleware1, middleware2, handler);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Route path (supports `:param`) |
| `middlewares` | function[] | Optional middleware |
| `handler` | function | Route handler `(ammo) => {}` |

---

## Ammo Class

Request/response wrapper.

### Properties

#### HTTP Method Flags

| Property | Type | Description |
|----------|------|-------------|
| `GET` | boolean | Is GET request |
| `POST` | boolean | Is POST request |
| `PUT` | boolean | Is PUT request |
| `DELETE` | boolean | Is DELETE request |
| `PATCH` | boolean | Is PATCH request |
| `HEAD` | boolean | Is HEAD request |
| `OPTIONS` | boolean | Is OPTIONS request |

#### Request Data

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | HTTP method string |
| `payload` | object | Body + query params + route params |
| `headers` | object | Request headers |
| `ip` | string | Client IP address |

#### URL Data

| Property | Type | Description |
|----------|------|-------------|
| `path` | string | Full URL path |
| `endpoint` | string | Path without query string |
| `protocol` | string | `'http'` or `'https'` |
| `hostname` | string | Request hostname |
| `fullURL` | string | Complete URL |

#### Raw Objects

| Property | Type | Description |
|----------|------|-------------|
| `req` | IncomingMessage | Node.js request |
| `res` | ServerResponse | Node.js response |

### Methods

#### fire(data) / fire(status, data) / fire(status, data, contentType)

Send response.

```javascript
ammo.fire({ data: 'value' });        // 200 with JSON
ammo.fire(201, { created: true });   // Custom status
ammo.fire(200, html, 'text/html');   // Custom content type
```

#### throw(error) / throw(status, message)

Send error response.

```javascript
ammo.throw(404);                     // 404 with default message
ammo.throw(404, 'Not found');        // 404 with message
ammo.throw(new Error('Failed'));     // 500 with error message
```

#### redirect(url, statusCode)

HTTP redirect.

```javascript
ammo.redirect('/new-path');          // 302 redirect
ammo.redirect('/new-path', 301);     // 301 permanent
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | - | Redirect URL |
| `statusCode` | number | `302` | HTTP status |

#### notFound()

Throw 404 error.

```javascript
ammo.notFound();
```

#### notAllowed()

Throw 405 error.

```javascript
ammo.notAllowed();
```

#### unauthorized()

Throw 401 error.

```javascript
ammo.unauthorized();
```

---

## TejError Class

Custom error class for HTTP errors.

### Constructor

```javascript
import { TejError } from 'te.js';

throw new TejError(statusCode, message);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `statusCode` | number | HTTP status code |
| `message` | string | Error message |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `code` | number | HTTP status code |
| `message` | string | Error message |
| `name` | string | `'TejError'` |

---

## TejFileUploader Class

File upload handler.

### Constructor

```javascript
import { TejFileUploader } from 'te.js';

const upload = new TejFileUploader(options);
```

| Option | Type | Description |
|--------|------|-------------|
| `destination` | string | Upload directory |
| `name` | string | Custom filename |
| `maxFileSize` | number | Max file size (bytes) |

### Methods

#### file(...fieldNames)

Single file upload middleware.

```javascript
target.register('/upload', upload.file('avatar'), handler);
```

**Returns:** Middleware function

#### files(...fieldNames)

Multiple files upload middleware.

```javascript
target.register('/upload', upload.files('photos', 'documents'), handler);
```

**Returns:** Middleware function

### Uploaded File Object

```javascript
{
  filename: string,      // Original filename
  extension: string,     // File extension
  path: {
    absolute: string,    // Absolute path
    relative: string     // Relative path
  },
  mimetype: string,      // MIME type
  size: {
    value: number,       // Size value
    symbol: string       // Size unit (KB, MB, etc.)
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

**Returns:** `string[]` or `object`

---

## Middleware Signatures

### Tejas Style

```javascript
const middleware = (ammo, next) => {
  // Access ammo properties
  next();
};
```

### Express Style

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

// Get configuration value
const port = env('PORT');

// Set configuration value
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
const status = dbManager.hasConnection('redis');
// { exists: boolean, initializing: boolean }

// Close connections
await dbManager.closeConnection('redis');
await dbManager.closeAllConnections();

// Get all active connections
const connections = dbManager.getActiveConnections();
```

