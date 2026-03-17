# Getting Started with Tejas

Tejas is a lightweight Node.js framework for building powerful backend services. It features an intuitive API with aviation-inspired naming conventions.

## Why Tejas?

- **AI-Native** — MCP server gives your AI assistant full framework knowledge for correct code generation
- **Zero-Config Error Handling** — No try-catch needed! Tejas catches all errors automatically
- **Clean, Readable Code** — Aviation-inspired naming makes code self-documenting
- **Express Compatible** — Use your existing Express middleware
- **Built-in Features** — Rate limiting, file uploads out of the box

## AI-Assisted Setup (MCP) — Recommended

The fastest way to start building with Tejas is through your AI assistant. The **Tejas MCP server** (`tejas-mcp`) gives AI tools full access to framework documentation, validated code examples, and purpose-built tools that scaffold projects and generate correct te.js code.

### Setup

**Cursor** — create or edit `.cursor/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "tejas": {
      "command": "npx",
      "args": ["-y", "tejas-mcp"]
    }
  }
}
```

**Other MCP-compatible IDEs** — run `npx tejas-mcp` as the stdio server command. No API keys required.

### What you can do

Once connected, prompt your assistant naturally:

- _"Scaffold a new te.js project called my-api on port 5000"_
- _"Create a REST API with user CRUD routes using te.js"_
- _"Add a /health endpoint that returns system uptime"_

The MCP server provides these tools: `scaffold_project`, `generate_target`, `generate_app_entry`, `generate_config`, `get_documentation`, and `search_docs`.

---

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

| Term        | Express Equivalent | Description               |
| ----------- | ------------------ | ------------------------- |
| `Tejas`     | `express()`        | Main application instance |
| `Target`    | `Router`           | Route grouping            |
| `Ammo`      | `req` + `res`      | Request/response wrapper  |
| `fire()`    | `res.send()`       | Send response             |
| `throw()`   | Error response     | Send error                |
| `midair()`  | `use()`            | Register middleware       |
| `takeoff()` | `listen()`         | Start server              |

### Basic Structure

```
my-app/
├── index.js              # Application entry point
├── tejas.config.json     # Optional configuration
├── .env                  # Environment variables
├── targets/              # Route definitions (auto-discovered)
│   ├── user.target.js
│   ├── auth.target.js
│   └── api/
│       └── v1.target.js
├── services/             # Business logic
│   └── user.service.js
└── middleware/            # Custom middleware
    └── auth.js
```

## Automatic Error Handling

One of Tejas's most powerful features is that **you don't need to write any error handling code**. The framework catches all errors automatically:

```javascript
// ✅ No try-catch needed — if anything throws, Tejas handles it
target.register('/data', async (ammo) => {
  const data = await riskyDatabaseCall();
  const processed = await anotherAsyncOperation(data);
  ammo.fire(processed);
});
```

Your application never crashes from unhandled exceptions, and clients always receive proper error responses. Learn more in [Error Handling](./error-handling.md).

## Next Steps

- [Configuration](./configuration.md) — All configuration options and sources
- [Routing](./routing.md) — Deep dive into the Target-based routing system
- [Ammo](./ammo.md) — Master request/response handling
- [Middleware](./middleware.md) — Global, target, and route-level middleware

- [Error Handling](./error-handling.md) — Zero-config error handling
- [CLI Reference](./cli.md) — `tejas fly` and doc generation commands
- [Auto-Documentation](./auto-docs.md) — Generate OpenAPI specs from your code

## Example Application

Here's a more complete example:

```javascript
import Tejas from 'te.js';

const app = new Tejas({
  port: 3000,
  log: {
    http_requests: true,
    exceptions: true,
  },
});

// Global middleware
app.midair((ammo, next) => {
  console.log(`${ammo.method} ${ammo.path}`);
  next();
});

// Rate limiting (in-memory)
app.withRateLimit({
  maxRequests: 100,
  timeWindowSeconds: 60,
});

// Start the server
app.takeoff();
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
