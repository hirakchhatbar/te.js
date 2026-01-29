# Database Integration

Tejas provides built-in support for **MongoDB** and **Redis** databases through a centralized `DatabaseManager`.

## Quick Start

### Redis

```javascript
import Tejas from 'te.js';

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

### Both Together

```javascript
app
  .withRedis({ url: 'redis://localhost:6379' })
  .withMongo({ uri: 'mongodb://localhost:27017/myapp' })
  .takeoff();
```

## Redis Configuration

### Basic Connection

```javascript
app.withRedis({
  url: 'redis://localhost:6379'
});
```

### With Authentication

```javascript
app.withRedis({
  url: 'redis://username:password@hostname:6379'
});

// Or using socket options
app.withRedis({
  socket: {
    host: 'localhost',
    port: 6379
  },
  password: 'your-password'
});
```

### TLS Connection

```javascript
app.withRedis({
  socket: {
    host: 'your-redis-host.com',
    port: 6379,
    tls: true
  }
});
```

### Redis Cluster

```javascript
app.withRedis({
  isCluster: true,
  url: 'redis://node1:6379'
});
```

### All Options

```javascript
app.withRedis({
  url: 'redis://localhost:6379',        // Connection URL
  isCluster: false,                      // Use Redis Cluster
  socket: {
    host: 'localhost',
    port: 6379,
    tls: false
  },
  password: 'secret',                    // Redis password
  database: 0,                           // Database number
  // ... any other node-redis options
});
```

## MongoDB Configuration

### Basic Connection

```javascript
app.withMongo({
  uri: 'mongodb://localhost:27017/myapp'
});
```

### With Options

```javascript
app.withMongo({
  uri: 'mongodb://localhost:27017/myapp',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  }
});
```

### MongoDB Atlas

```javascript
app.withMongo({
  uri: 'mongodb+srv://username:password@cluster.mongodb.net/myapp'
});
```

### Replica Set

```javascript
app.withMongo({
  uri: 'mongodb://host1:27017,host2:27017,host3:27017/myapp?replicaSet=myReplicaSet'
});
```

## Using Database Connections

### Getting Connections

Import the database manager to access connections:

```javascript
import dbManager from 'te.js/database/index.js';

// Get Redis client
const redis = dbManager.getConnection('redis');

// Get MongoDB client
const mongo = dbManager.getConnection('mongodb');
```

### In Route Handlers

```javascript
import { Target } from 'te.js';
import dbManager from 'te.js/database/index.js';

const cache = new Target('/cache');

cache.register('/get/:key', async (ammo) => {
  const redis = dbManager.getConnection('redis');
  const { key } = ammo.payload;
  
  const value = await redis.get(key);
  
  if (!value) {
    return ammo.fire(404, { error: 'Key not found' });
  }
  
  ammo.fire({ key, value });
});

cache.register('/set', async (ammo) => {
  if (!ammo.POST) return ammo.notAllowed();
  
  const redis = dbManager.getConnection('redis');
  const { key, value, ttl } = ammo.payload;
  
  if (ttl) {
    await redis.setEx(key, ttl, value);
  } else {
    await redis.set(key, value);
  }
  
  ammo.fire(201, { message: 'Cached successfully' });
});
```

### MongoDB Example

```javascript
import { Target, TejError } from 'te.js';
import dbManager from 'te.js/database/index.js';

const users = new Target('/users');

users.register('/', async (ammo) => {
  const mongo = dbManager.getConnection('mongodb');
  const db = mongo.db('myapp');
  const collection = db.collection('users');
  
  if (ammo.GET) {
    const users = await collection.find({}).toArray();
    return ammo.fire(users);
  }
  
  if (ammo.POST) {
    const { name, email } = ammo.payload;
    const result = await collection.insertOne({ name, email, createdAt: new Date() });
    return ammo.fire(201, { id: result.insertedId, name, email });
  }
  
  ammo.notAllowed();
});

users.register('/:id', async (ammo) => {
  const mongo = dbManager.getConnection('mongodb');
  const db = mongo.db('myapp');
  const collection = db.collection('users');
  
  const { id } = ammo.payload;
  const { ObjectId } = await import('mongodb');
  
  const user = await collection.findOne({ _id: new ObjectId(id) });
  
  if (!user) {
    throw new TejError(404, 'User not found');
  }
  
  ammo.fire(user);
});
```

## Database Manager API

### Check Connection Status

```javascript
const status = dbManager.hasConnection('redis');
// { exists: true, initializing: false }
```

### Get All Active Connections

```javascript
const connections = dbManager.getActiveConnections();
// Map { 'redis' => {...}, 'mongodb' => {...} }
```

### Close Connections

```javascript
// Close specific connection
await dbManager.closeConnection('redis');

// Close all connections
await dbManager.closeAllConnections();
```

## Caching Pattern

A common pattern using Redis for caching:

```javascript
import { Target } from 'te.js';
import dbManager from 'te.js/database/index.js';

const api = new Target('/api');

// Cache middleware
const withCache = (ttl = 60) => async (ammo, next) => {
  if (!ammo.GET) return next();
  
  const redis = dbManager.getConnection('redis');
  const cacheKey = `cache:${ammo.endpoint}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    ammo.res.setHeader('X-Cache', 'HIT');
    return ammo.fire(JSON.parse(cached));
  }
  
  // Store original fire to intercept
  const originalFire = ammo.fire.bind(ammo);
  ammo.fire = async (...args) => {
    const data = args[0];
    if (typeof data === 'object') {
      await redis.setEx(cacheKey, ttl, JSON.stringify(data));
    }
    ammo.res.setHeader('X-Cache', 'MISS');
    originalFire(...args);
  };
  
  next();
};

api.register('/expensive-data', withCache(300), async (ammo) => {
  // This expensive operation result will be cached for 5 minutes
  const data = await expensiveOperation();
  ammo.fire(data);
});
```

## Session Storage with Redis

```javascript
import { v4 as uuidv4 } from 'uuid';
import dbManager from 'te.js/database/index.js';

const sessionMiddleware = async (ammo, next) => {
  const redis = dbManager.getConnection('redis');
  let sessionId = ammo.headers['x-session-id'];
  
  if (!sessionId) {
    sessionId = uuidv4();
    ammo.res.setHeader('X-Session-ID', sessionId);
    ammo.session = {};
  } else {
    const sessionData = await redis.get(`session:${sessionId}`);
    ammo.session = sessionData ? JSON.parse(sessionData) : {};
  }
  
  // Save session after response
  const originalFire = ammo.fire.bind(ammo);
  ammo.fire = async (...args) => {
    await redis.setEx(
      `session:${sessionId}`,
      3600, // 1 hour TTL
      JSON.stringify(ammo.session)
    );
    originalFire(...args);
  };
  
  next();
};
```

## Connection Events

The underlying clients emit events you can listen to:

```javascript
const redis = dbManager.getConnection('redis');

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});
```

## Best Practices

1. **Initialize early** — Set up connections before `takeoff()`
2. **Handle errors** — Always wrap database operations in try/catch
3. **Use connection pooling** — MongoDB handles this automatically
4. **Close on shutdown** — Clean up connections when app terminates

```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
  await dbManager.closeAllConnections();
  process.exit(0);
});
```

