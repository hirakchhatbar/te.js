# Configuration

Tejas provides a flexible configuration system that merges settings from multiple sources.

## Configuration Sources

Settings are loaded from three sources. Later sources override earlier ones:

1. **`tejas.config.json`** — file in your project root (lowest priority)
2. **Environment variables** — from `.env` or system environment
3. **Constructor options** — passed to `new Tejas({...})` (highest priority)

All configuration keys are normalized: nested objects are flattened with underscores and uppercased. For example, `log.http_requests` becomes the environment variable `LOG_HTTP_REQUESTS`.

## Quick Start

The simplest way to configure Tejas is with a `tejas.config.json` file:

```json
{
  "port": 3000,
  "dir": {
    "targets": "targets"
  },
  "log": {
    "http_requests": true,
    "exceptions": true
  }
}
```

Or pass options directly to the constructor:

```javascript
import Tejas from 'te.js';

const app = new Tejas({
  port: 3000,
  log: { http_requests: true }
});

app.takeoff();
```

## Complete Configuration Reference

### Core

| Config Key | Env Variable | Type | Default | Description |
|------------|-------------|------|---------|-------------|
| `entry` | `ENTRY` | string | *(auto-resolved)* | Entry file for `tejas fly`. Falls back to `package.json` `main`, then `index.js` / `app.js` / `server.js` |
| `port` | `PORT` | number | `1403` | Server port |
| `dir.targets` | `DIR_TARGETS` | string | `"targets"` | Directory containing `.target.js` files for auto-discovery |

### Logging

| Config Key | Env Variable | Type | Default | Description |
|------------|-------------|------|---------|-------------|
| `log.http_requests` | `LOG_HTTP_REQUESTS` | boolean | `false` | Log incoming HTTP requests (method, path, status, time) |
| `log.exceptions` | `LOG_EXCEPTIONS` | boolean | `false` | Log unhandled exceptions and errors |

### Request Body

| Config Key | Env Variable | Type | Default | Description |
|------------|-------------|------|---------|-------------|
| `body.max_size` | `BODY_MAX_SIZE` | number | `10485760` (10 MB) | Maximum request body size in bytes. Requests exceeding this receive a 413 error |
| `body.timeout` | `BODY_TIMEOUT` | number | `30000` (30 s) | Body parsing timeout in milliseconds. Requests exceeding this receive a 408 error |

### Auto-Documentation

These options configure the `tejas generate:docs` CLI command and the auto-documentation system. See [Auto-Documentation](./auto-docs.md) for full details.

| Config Key | Env Variable | Type | Default | Description |
|------------|-------------|------|---------|-------------|
| `docs.dirTargets` | `DOCS_DIR_TARGETS` | string | `"targets"` | Target directory for doc generation (can differ from `dir.targets`) |
| `docs.output` | — | string | `"./openapi.json"` | Output path for the generated OpenAPI spec |
| `docs.title` | — | string | `"API"` | API title in the OpenAPI `info` block |
| `docs.version` | — | string | `"1.0.0"` | API version in the OpenAPI `info` block |
| `docs.description` | — | string | `""` | API description |
| `docs.level` | — | number | `1` | LLM enhancement level (1–3). Higher = better docs, more tokens |
| `docs.llm.baseURL` | `LLM_BASE_URL` | string | `"https://api.openai.com/v1"` | LLM provider endpoint |
| `docs.llm.apiKey` | `LLM_API_KEY` | string | — | LLM provider API key |
| `docs.llm.model` | `LLM_MODEL` | string | `"gpt-4o-mini"` | LLM model name |
| `docs.overviewPath` | — | string | `"./API_OVERVIEW.md"` | Path for the generated overview page (level 3 only) |
| `docs.productionBranch` | `DOCS_PRODUCTION_BRANCH` | string | `"main"` | Git branch that triggers `docs:on-push` |

## Configuration File

Create a `tejas.config.json` in your project root:

```json
{
  "entry": "app.js",
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
  },
  "docs": {
    "output": "./openapi.json",
    "title": "My API",
    "version": "1.0.0",
    "level": 2,
    "productionBranch": "main"
  }
}
```

## Environment Variables

Create a `.env` file in your project root. Tejas uses [tej-env](https://www.npmjs.com/package/tej-env) to load it automatically:

```bash
# Server
PORT=3000

# Logging
LOG_HTTP_REQUESTS=true
LOG_EXCEPTIONS=true

# Body limits
BODY_MAX_SIZE=5242880
BODY_TIMEOUT=15000

# Target directory
DIR_TARGETS=targets

# LLM (for tejas generate:docs)
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

## Constructor Options

Pass an object to `new Tejas()` using the same nested structure as `tejas.config.json`:

```javascript
import Tejas from 'te.js';

const app = new Tejas({
  port: 3000,
  log: {
    http_requests: true,
    exceptions: true
  },
  body: {
    max_size: 10 * 1024 * 1024,
    timeout: 30000
  }
});
```

Constructor options have the highest priority and override both the config file and environment variables.

## How Merging Works

All configuration is flattened into a single-level object with uppercased keys:

```javascript
// tejas.config.json
{ "log": { "http_requests": true } }

// Becomes accessible as:
env('LOG_HTTP_REQUESTS') // true
```

The merge order is: config file values, then env vars override those, then constructor options override everything.

## Accessing Configuration at Runtime

Use the `env()` function from `tej-env` to read any configuration value:

```javascript
import { env } from 'tej-env';

target.register('/info', (ammo) => {
  ammo.fire({
    port: env('PORT'),
    maxBodySize: env('BODY_MAX_SIZE')
  });
});
```

## Auto-Registration

Tejas automatically discovers and imports all files ending in `.target.js` from the configured `dir.targets` directory (recursively, including subdirectories):

```
targets/
├── user.target.js      --> Auto-loaded
├── auth.target.js      --> Auto-loaded
├── utils.js            --> Ignored (wrong suffix)
└── api/
    └── v1.target.js    --> Auto-loaded
```

To change the targets directory:

```json
{
  "dir": {
    "targets": "src/routes"
  }
}
```

## Database Configuration

Database connections are configured via `takeoff()` options, not through the config file:

```javascript
app.takeoff({
  withRedis: { url: 'redis://localhost:6379' },
  withMongo: { uri: 'mongodb://localhost:27017/myapp' }
});
```

See [Database Integration](./database.md) for details.

## Next Steps

- [Getting Started](./getting-started.md) — Build your first Tejas application
- [Routing](./routing.md) — Define routes and endpoints
- [Auto-Documentation](./auto-docs.md) — Generate OpenAPI docs from your code
- [CLI Reference](./cli.md) — `tejas fly` and doc generation commands
