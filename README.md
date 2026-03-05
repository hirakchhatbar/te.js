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
  <a href="#ai-assisted-setup-mcp">AI Setup (MCP)</a> •
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

- **AI-Native (MCP)** — Ship with an MCP server so AI assistants can scaffold projects, generate routes, and write correct code with full framework knowledge
- **Simple Routing** — Clean, method-agnostic URL structures with parameterized routes
- **Express Compatible** — Use existing Express middleware alongside Tejas middleware
- **Zero-Config Error Handling** — No try-catch needed! Tejas catches all errors automatically. Opt in to have an LLM determine error code and message when you don't specify them (see [Error Handling](./docs/error-handling.md))
- **Built-in Rate Limiting** — Three algorithms (Token Bucket, Sliding Window, Fixed Window) with memory or Redis storage
- **Method Safety & CORS** — Opt-in method restriction per route (`register(path, { methods }, handler)` or `ammo.only('GET')`), global allowed-methods filter, and `app.withCORS()` for cross-origin requests
- **Database Ready** — First-class Redis and MongoDB support with auto-install of drivers
- **File Uploads** — Easy file handling with size limits and type validation
- **Auto-Documentation** — Generate OpenAPI specs from your code with LLM-powered analysis (`tejas generate:docs`)
- **Interactive API Docs** — Serve a Scalar API reference UI with `app.serveDocs()`
- **Auto-Discovery** — Automatic route registration from `.target.js` files
- **Request Logging** — Built-in HTTP request and exception logging


## AI-Assisted Setup (MCP)

> **Recommended** — The best way to get started with Tejas in the age of AI.

The [Tejas MCP server](https://www.npmjs.com/package/tejas-mcp) gives your IDE's AI assistant full knowledge of the framework — documentation, code examples, and purpose-built tools to scaffold projects and generate correct code. No more hallucinated APIs.

**Cursor** — add this to `.cursor/mcp.json`:

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

**Other MCP-compatible IDEs** — run `npx tejas-mcp` as the server command (stdio transport, no config needed).

Once connected, prompt your AI with things like *"Scaffold a new te.js project called my-api"* or *"Create a REST API with user CRUD routes"* — the assistant will generate framework-correct code using real te.js patterns.


## Quick Start

### Install

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

| Tejas Term  | Purpose                  | Express Equivalent |
| ----------- | ------------------------ | ------------------ |
| `Tejas`     | Application instance     | `express()`        |
| `Target`    | Route group/router       | `Router()`         |
| `Ammo`      | Request/response context | `req` + `res`      |
| `fire()`    | Send response            | `res.send()`       |
| `midair()`  | Register middleware      | `use()`            |
| `takeoff()` | Start server             | `listen()`         |


## CLI

```bash
tejas fly [file]             # Start the server
tejas generate:docs [--ci]   # Generate OpenAPI docs (interactive or CI mode)
tejas docs:on-push           # Auto-generate docs when pushing to production branch
```


## API Documentation

Generate and serve interactive API docs:

```bash
npx tejas generate:docs
```

```javascript
app.serveDocs({ specPath: './openapi.json' });
app.takeoff();
// Visit http://localhost:1403/docs
```


## Documentation

For comprehensive documentation, see the [docs folder](./docs) or visit [tejas-documentation.vercel.app](https://tejas-documentation.vercel.app).

- [Getting Started](./docs/getting-started.md) — Installation and quick start
- [Configuration](./docs/configuration.md) — All configuration options
- [Routing](./docs/routing.md) — Target-based routing system
- [Ammo](./docs/ammo.md) — Request/response handling
- [Middleware](./docs/middleware.md) — Global, target, and route middleware
- [Error Handling](./docs/error-handling.md) — Zero-config error handling
- [Database](./docs/database.md) — Redis and MongoDB integration
- [Rate Limiting](./docs/rate-limiting.md) — API protection
- [File Uploads](./docs/file-uploads.md) — File handling
- [CLI Reference](./docs/cli.md) — Command-line interface
- [Auto-Documentation](./docs/auto-docs.md) — OpenAPI generation
- [API Reference](./docs/api-reference.md) — Complete API docs


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## License

ISC © [Hirak Chhatbar](https://github.com/hirakchhatbar)
