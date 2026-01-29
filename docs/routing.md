# Routing with Targets

Tejas uses a **Target-based** routing system. A Target is similar to an Express Router—it groups related endpoints under a common base path.

## Creating a Target

```javascript
import { Target } from 'te.js';

const target = new Target('/api');
```

## Registering Endpoints

Use `register()` to add endpoints to a target:

```javascript
target.register('/users', (ammo) => {
  ammo.fire([{ id: 1, name: 'John' }]);
});
```

This creates a route at `GET /api/users`.

## Method Handling

Tejas routes are **method-agnostic** by default. Use the method flags on `ammo` to handle different HTTP methods:

```javascript
target.register('/users', (ammo) => {
  if (ammo.GET) {
    // Handle GET /api/users
    ammo.fire([{ id: 1, name: 'John' }]);
  } else if (ammo.POST) {
    // Handle POST /api/users
    const { name, email } = ammo.payload;
    ammo.fire(201, { id: 2, name, email });
  } else {
    ammo.notAllowed();
  }
});
```

### Available Method Flags

- `ammo.GET`
- `ammo.POST`
- `ammo.PUT`
- `ammo.DELETE`
- `ammo.PATCH`
- `ammo.HEAD`
- `ammo.OPTIONS`

## Parameterized Routes

Use `:param` syntax for dynamic route segments:

```javascript
target.register('/users/:id', (ammo) => {
  const { id } = ammo.payload;
  ammo.fire({ userId: id });
});

target.register('/users/:userId/posts/:postId', (ammo) => {
  const { userId, postId } = ammo.payload;
  ammo.fire({ userId, postId });
});
```

Route parameters are automatically extracted and added to `ammo.payload`.

## Query Parameters

Query parameters are also available in `ammo.payload`:

```javascript
// Request: GET /api/users?page=2&limit=10

target.register('/users', (ammo) => {
  const { page, limit } = ammo.payload;
  ammo.fire({ page, limit }); // { page: "2", limit: "10" }
});
```

## Route Priority

Routes are matched in the following order:

1. **Exact matches** (most specific)
2. **Parameterized routes** (in registration order)

```javascript
// These don't conflict:
target.register('/users/me', handler);      // Exact match for /users/me
target.register('/users/:id', handler);     // Matches /users/123, /users/john
```

## Target-Level Middleware

Apply middleware to all routes in a target:

```javascript
const api = new Target('/api');

// This middleware runs for ALL /api/* routes
api.midair((ammo, next) => {
  console.log('API request:', ammo.path);
  next();
});

api.register('/users', handler);
api.register('/posts', handler);
```

## Route-Specific Middleware

Apply middleware to individual routes:

```javascript
import { authMiddleware } from './middleware/auth.js';

target.register('/public', (ammo) => {
  ammo.fire({ public: true });
});

// Auth middleware only for this route
target.register('/private', authMiddleware, (ammo) => {
  ammo.fire({ private: true, user: ammo.user });
});

// Multiple middleware
target.register('/admin', authMiddleware, adminMiddleware, (ammo) => {
  ammo.fire({ admin: true });
});
```

## File Organization

### Recommended Structure

```
targets/
├── index.target.js       # Root routes (/)
├── user.target.js        # User routes (/user)
├── auth.target.js        # Auth routes (/auth)
└── api/
    ├── v1.target.js      # API v1 routes (/api/v1)
    └── v2.target.js      # API v2 routes (/api/v2)
```

### Example: user.target.js

```javascript
import { Target } from 'te.js';
import { authMiddleware } from '../middleware/auth.js';

const users = new Target('/users');

// Public route
users.register('/register', (ammo) => {
  if (!ammo.POST) return ammo.notAllowed();
  
  const { email, password, name } = ammo.payload;
  // ... create user
  ammo.fire(201, { message: 'User created' });
});

// Protected routes
users.midair(authMiddleware);

users.register('/profile', (ammo) => {
  if (ammo.GET) {
    ammo.fire({ user: ammo.user });
  } else if (ammo.PUT) {
    // ... update profile
    ammo.fire({ message: 'Profile updated' });
  } else {
    ammo.notAllowed();
  }
});

users.register('/:id', (ammo) => {
  if (!ammo.GET) return ammo.notAllowed();
  
  const { id } = ammo.payload;
  // ... fetch user by id
  ammo.fire({ id, name: 'John Doe' });
});
```

## Listing All Routes

Get all registered endpoints programmatically:

```javascript
import { listAllEndpoints } from 'te.js';

// Get flat list
const routes = listAllEndpoints();
// ['/api/users', '/api/posts', '/auth/login', ...]

// Get grouped by first path segment
const grouped = listAllEndpoints(true);
// {
//   api: ['/api/users', '/api/posts'],
//   auth: ['/auth/login', '/auth/register']
// }
```

## Complete Example

```javascript
// targets/products.target.js
import { Target, TejError } from 'te.js';
import { authMiddleware, adminMiddleware } from '../middleware/index.js';

const products = new Target('/products');

// Public: List all products
products.register('/', (ammo) => {
  if (!ammo.GET) return ammo.notAllowed();
  
  const { category, page = 1, limit = 10 } = ammo.payload;
  // ... fetch products
  ammo.fire({ products: [], page, limit });
});

// Public: Get single product
products.register('/:id', (ammo) => {
  if (!ammo.GET) return ammo.notAllowed();
  
  const { id } = ammo.payload;
  const product = findProduct(id);
  
  if (!product) {
    throw new TejError(404, 'Product not found');
  }
  
  ammo.fire(product);
});

// Protected: Create product (admin only)
products.register('/create', authMiddleware, adminMiddleware, (ammo) => {
  if (!ammo.POST) return ammo.notAllowed();
  
  const { name, price, description } = ammo.payload;
  // ... create product
  ammo.fire(201, { id: 'new-id', name, price });
});

// Protected: Update product (admin only)
products.register('/:id/update', authMiddleware, adminMiddleware, (ammo) => {
  if (!ammo.PUT) return ammo.notAllowed();
  
  const { id, ...updates } = ammo.payload;
  // ... update product
  ammo.fire({ message: 'Product updated' });
});
```

