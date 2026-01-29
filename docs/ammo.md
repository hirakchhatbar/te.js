# Ammo - Request & Response

The `Ammo` class is Tejas's unified request/response object. It wraps Node.js's `req` and `res` objects, providing a clean API for handling HTTP interactions.

## Overview

Every route handler receives an `ammo` object:

```javascript
target.register('/example', (ammo) => {
  // ammo contains everything you need
  console.log(ammo.method);   // 'GET'
  console.log(ammo.payload);  // { query: 'params', body: 'data' }
  ammo.fire({ success: true });
});
```

## Properties

### HTTP Method Flags

Boolean flags for quick method checking:

```javascript
ammo.GET      // true if GET request
ammo.POST     // true if POST request
ammo.PUT      // true if PUT request
ammo.DELETE   // true if DELETE request
ammo.PATCH    // true if PATCH request
ammo.HEAD     // true if HEAD request
ammo.OPTIONS  // true if OPTIONS request
```

**Usage:**

```javascript
target.register('/resource', (ammo) => {
  if (ammo.GET) {
    return ammo.fire({ items: [] });
  }
  if (ammo.POST) {
    return ammo.fire(201, { created: true });
  }
  ammo.notAllowed();
});
```

### Request Data

| Property | Type | Description |
|----------|------|-------------|
| `ammo.method` | string | HTTP method (`'GET'`, `'POST'`, etc.) |
| `ammo.payload` | object | Combined body, query params, and route params |
| `ammo.headers` | object | Request headers (lowercase keys) |
| `ammo.ip` | string | Client IP address |

### URL Data

| Property | Type | Description |
|----------|------|-------------|
| `ammo.path` | string | Full URL path with query string |
| `ammo.endpoint` | string | Path without query string |
| `ammo.protocol` | string | `'http'` or `'https'` |
| `ammo.hostname` | string | Request hostname |
| `ammo.fullURL` | string | Complete URL |

### Raw Objects

| Property | Type | Description |
|----------|------|-------------|
| `ammo.req` | IncomingMessage | Node.js request object |
| `ammo.res` | ServerResponse | Node.js response object |

## The Payload Object

`ammo.payload` is a merged object containing:

1. **Query parameters** — From the URL query string
2. **Request body** — Parsed JSON, form data, or multipart data
3. **Route parameters** — From parameterized routes (`:id`)

```javascript
// Request: POST /users/123?notify=true
// Body: { "name": "John", "email": "john@example.com" }

target.register('/users/:id', (ammo) => {
  console.log(ammo.payload);
  // {
  //   id: '123',           // Route param
  //   notify: 'true',      // Query param
  //   name: 'John',        // Body
  //   email: 'john@example.com'  // Body
  // }
});
```

## Methods

### fire() — Send Response

The primary method for sending responses:

```javascript
// Send JSON with 200 status (default)
ammo.fire({ message: 'Success' });

// Send with specific status code
ammo.fire(201, { id: 1, created: true });

// Send just a status code
ammo.fire(204);

// Send plain text
ammo.fire('Hello, World!');

// Send HTML with custom content type
ammo.fire(200, '<h1>Hello</h1>', 'text/html');
```

**Signatures:**

```javascript
ammo.fire()                      // 204 No Content
ammo.fire(data)                  // 200 with data
ammo.fire(statusCode)            // Status with default message
ammo.fire(statusCode, data)      // Status with data
ammo.fire(statusCode, data, contentType)  // Full control
```

### throw() — Send Error Response

For error responses:

```javascript
// Send 500 Internal Server Error
ammo.throw();

// Send specific error code
ammo.throw(404);
ammo.throw(404, 'User not found');

// Throw from Error object
ammo.throw(new Error('Something went wrong'));

// Throw TejError
import { TejError } from 'te.js';
throw new TejError(400, 'Invalid input');
```

### redirect() — HTTP Redirect

```javascript
// Temporary redirect (302)
ammo.redirect('/new-location');

// Permanent redirect (301)
ammo.redirect('/new-location', 301);

// External redirect
ammo.redirect('https://example.com');
```

### Convenience Error Methods

```javascript
ammo.notFound();     // Throws 404 Not Found
ammo.notAllowed();   // Throws 405 Method Not Allowed
ammo.unauthorized(); // Throws 401 Unauthorized
```

## Working with Headers

### Reading Headers

```javascript
target.register('/example', (ammo) => {
  const authHeader = ammo.headers['authorization'];
  const contentType = ammo.headers['content-type'];
  const userAgent = ammo.headers['user-agent'];
  
  ammo.fire({ userAgent });
});
```

### Setting Response Headers

Use the underlying `res` object:

```javascript
target.register('/example', (ammo) => {
  ammo.res.setHeader('X-Custom-Header', 'value');
  ammo.res.setHeader('Cache-Control', 'max-age=3600');
  
  ammo.fire({ data: 'with headers' });
});
```

## Content Types

`fire()` automatically sets `Content-Type` based on the data:

| Data Type | Content-Type |
|-----------|--------------|
| Object/Array | `application/json` |
| String | `text/plain` |
| Buffer | `application/octet-stream` |

Override with the third parameter:

```javascript
ammo.fire(200, htmlString, 'text/html');
ammo.fire(200, xmlString, 'application/xml');
```

## Examples

### REST API Resource

```javascript
import { Target, TejError } from 'te.js';

const users = new Target('/users');

// GET /users - List all
// POST /users - Create new
users.register('/', async (ammo) => {
  if (ammo.GET) {
    const { page = 1, limit = 10 } = ammo.payload;
    const users = await getUsers(page, limit);
    return ammo.fire({ users, page, limit });
  }
  
  if (ammo.POST) {
    const { name, email } = ammo.payload;
    
    if (!name || !email) {
      throw new TejError(400, 'Name and email are required');
    }
    
    const user = await createUser({ name, email });
    return ammo.fire(201, user);
  }
  
  ammo.notAllowed();
});

// GET /users/:id - Get one
// PUT /users/:id - Update
// DELETE /users/:id - Delete
users.register('/:id', async (ammo) => {
  const { id } = ammo.payload;
  
  if (ammo.GET) {
    const user = await getUser(id);
    if (!user) throw new TejError(404, 'User not found');
    return ammo.fire(user);
  }
  
  if (ammo.PUT) {
    const { name, email } = ammo.payload;
    const user = await updateUser(id, { name, email });
    return ammo.fire(user);
  }
  
  if (ammo.DELETE) {
    await deleteUser(id);
    return ammo.fire(204);
  }
  
  ammo.notAllowed();
});
```

### File Download

```javascript
import fs from 'fs';
import path from 'path';

target.register('/download/:filename', (ammo) => {
  const { filename } = ammo.payload;
  const filepath = path.join('uploads', filename);
  
  if (!fs.existsSync(filepath)) {
    throw new TejError(404, 'File not found');
  }
  
  const file = fs.readFileSync(filepath);
  
  ammo.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  ammo.fire(200, file, 'application/octet-stream');
});
```

### Streaming Response

For large responses, use the raw `res` object:

```javascript
target.register('/stream', (ammo) => {
  ammo.res.setHeader('Content-Type', 'text/event-stream');
  ammo.res.setHeader('Cache-Control', 'no-cache');
  ammo.res.setHeader('Connection', 'keep-alive');
  
  let count = 0;
  const interval = setInterval(() => {
    ammo.res.write(`data: ${JSON.stringify({ count: ++count })}\n\n`);
    
    if (count >= 10) {
      clearInterval(interval);
      ammo.res.end();
    }
  }, 1000);
});
```

## Adding Custom Properties

Extend `ammo` in middleware:

```javascript
// In middleware
const authMiddleware = async (ammo, next) => {
  const token = ammo.headers.authorization;
  const user = await verifyToken(token);
  
  ammo.user = user;        // Add user
  ammo.isAdmin = user.role === 'admin';
  
  next();
};

// In handler
target.register('/profile', authMiddleware, (ammo) => {
  ammo.fire({
    user: ammo.user,
    isAdmin: ammo.isAdmin
  });
});
```

