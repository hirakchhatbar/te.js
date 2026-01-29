# Configuration

Tejas provides a flexible configuration system that merges settings from multiple sources.

## Configuration Sources

Settings are loaded from three sources, with later sources overriding earlier ones:

1. **tejas.config.json** (lowest priority)
2. **Environment variables**
3. **Constructor options** (highest priority)

## Constructor Options

Pass configuration directly when creating a Tejas instance:

```javascript
import Tejas from 'te.js';

const app = new Tejas({
  port: 3000,
  log: {
    http_requests: true,
    exceptions: true
  },
  body: {
    max_size: 10 * 1024 * 1024, // 10MB
    timeout: 30000 // 30 seconds
  }
});
```

## Configuration File

Create a `tejas.config.json` in your project root:

```json
{
  "port": 3000,
  "dir": {
    "targets": "targets"
  },
  "log": {
    "http_requests": true,
    "exceptions": true
  },
  "body": {
    "max_size": 5242880,
    "timeout": 15000
  }
}
```

## Environment Variables

Configuration can also come from environment variables. Nested keys are flattened with underscores:

```bash
PORT=3000
LOG_HTTP_REQUESTS=true
LOG_EXCEPTIONS=true
BODY_MAX_SIZE=5242880
BODY_TIMEOUT=15000
DIR_TARGETS=targets
```

## Available Options

### Core Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | `1403` | Server port number |
| `dir.targets` | string | `"targets"` | Directory containing target files |

### Logging

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `log.http_requests` | boolean | `false` | Log incoming HTTP requests |
| `log.exceptions` | boolean | `false` | Log exceptions and errors |

### Request Body

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `body.max_size` | number | `10485760` | Maximum request body size (bytes) |
| `body.timeout` | number | `30000` | Body parsing timeout (ms) |

## Configuration Merging

All configuration is merged and flattened. Nested objects become uppercase keys with underscores:

```javascript
// This configuration:
{
  log: {
    http_requests: true
  }
}

// Becomes accessible as:
env('LOG_HTTP_REQUESTS') // true
```

## Example: Full Configuration

### tejas.config.json

```json
{
  "port": 1403,
  "dir": {
    "targets": "src/targets"
  },
  "log": {
    "http_requests": true,
    "exceptions": true
  },
  "body": {
    "max_size": 5242880,
    "timeout": 15000
  }
}
```

### .env file

```bash
PORT=3000
NODE_ENV=production
```

### index.js

```javascript
import Tejas from 'te.js';

const app = new Tejas({
  port: process.env.NODE_ENV === 'production' ? 8080 : 3000,
  log: {
    http_requests: process.env.NODE_ENV !== 'production'
  }
});

app.takeoff();
```

**Result:**
- In development: Port 3000, HTTP logging enabled
- In production: Port 8080, HTTP logging disabled

## Accessing Configuration

Use the `env()` function from `tej-env` to access configuration values:

```javascript
import { env } from 'tej-env';

// In your target files or middleware
target.register('/config', (ammo) => {
  ammo.fire({
    port: env('PORT'),
    maxBodySize: env('BODY_MAX_SIZE')
  });
});
```

## Database Configuration

Database connections are configured separately via the `takeoff()` method or fluent API:

```javascript
// Via takeoff options
app.takeoff({
  withRedis: {
    url: 'redis://localhost:6379'
  },
  withMongo: {
    uri: 'mongodb://localhost:27017/myapp'
  }
});

// Or via fluent API
app
  .withRedis({ url: 'redis://localhost:6379' })
  .withMongo({ uri: 'mongodb://localhost:27017/myapp' })
  .takeoff();
```

See [Database Integration](./database.md) for detailed database configuration options.

## Auto-Registration

Tejas automatically discovers and loads target files from the configured directory. Files must end with `.target.js`:

```
targets/
├── user.target.js      ✓ Auto-loaded
├── auth.target.js      ✓ Auto-loaded
├── utils.js            ✗ Not loaded (wrong suffix)
└── api/
    └── v1.target.js    ✓ Auto-loaded
```

To change the targets directory:

```json
{
  "dir": {
    "targets": "src/routes"
  }
}
```

