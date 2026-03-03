# Auto-Documentation

Tejas can automatically generate an OpenAPI 3.0 specification from your registered targets. An LLM analyzes your handler source code to produce accurate summaries, request/response schemas, and descriptions — then you can serve interactive API docs with a single line of code.

## Quick Start

```bash
# Generate an OpenAPI spec interactively
npx tejas generate:docs
```

```javascript
// Serve the generated docs in your app
app.serveDocs({ specPath: './openapi.json' });
app.takeoff();
```

Visit `http://localhost:1403/docs` to see the interactive Scalar API reference.

## How It Works

```
Target files → Handler analysis → LLM enhancement → OpenAPI 3.0 spec → Scalar UI
```

1. **Handler analysis** — Tejas reads each handler's source code and detects which HTTP methods it handles (`ammo.GET`, `ammo.POST`, etc.). Handlers without method checks are treated as accepting all methods.
2. **LLM enhancement** — The handler source (and optionally its dependencies) is sent to an LLM, which generates summaries, parameter descriptions, request/response schemas, and tags.
3. **Spec generation** — Results are assembled into a valid OpenAPI 3.0 document.
4. **Optional level-3 post-processing** — Tags are reordered by importance and an `API_OVERVIEW.md` page is generated.

## Enhancement Levels

The `level` option controls how much context the LLM receives and how much work it does:

| Level | Name | Context Sent to LLM | Output |
|-------|------|---------------------|--------|
| **1** | Moderate | Handler source code only (~hundreds of tokens per endpoint) | Summaries, schemas, tags |
| **2** | High | Handler + full dependency chain from imports (~thousands of tokens per endpoint) | More accurate schemas and descriptions |
| **3** | Comprehensive | Same as level 2, plus post-processing | Everything from level 2, plus: reordered tags by importance, `API_OVERVIEW.md` page |

Higher levels produce better documentation but use more LLM tokens.

## Endpoint Metadata

You can provide explicit metadata when registering endpoints. This metadata is used directly in the OpenAPI spec and takes priority over LLM-generated content:

```javascript
const users = new Target('/users');

users.register('/', {
  summary: 'User operations',
  description: 'Create and list users',
  methods: ['GET', 'POST'],
  request: {
    name: { type: 'string', required: true },
    email: { type: 'string', required: true }
  },
  response: {
    200: { description: 'Success' },
    201: { description: 'User created' },
    400: { description: 'Validation error' }
  }
}, (ammo) => {
  if (ammo.GET) return ammo.fire(userService.list());
  if (ammo.POST) return ammo.fire(201, userService.create(ammo.payload));
  ammo.notAllowed();
});
```

The metadata object is optional. When omitted, the LLM infers everything from the handler source.

## LLM Provider Configuration

Tejas uses an OpenAI-compatible API for LLM calls. This works with OpenAI, OpenRouter, Ollama, and any provider that implements the OpenAI chat completions endpoint.

### Via `tejas.config.json`

```json
{
  "docs": {
    "llm": {
      "baseURL": "https://api.openai.com/v1",
      "apiKey": "sk-...",
      "model": "gpt-4o-mini"
    }
  }
}
```

### Via Environment Variables

```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

### Using Ollama (Local)

```json
{
  "docs": {
    "llm": {
      "baseURL": "http://localhost:11434/v1",
      "model": "llama3"
    }
  }
}
```

No API key is required for local providers.

## Configuration Reference

All options live under the `docs` key in `tejas.config.json`:

```json
{
  "docs": {
    "dirTargets": "targets",
    "output": "./openapi.json",
    "title": "My API",
    "version": "1.0.0",
    "description": "API description",
    "level": 1,
    "llm": {
      "baseURL": "https://api.openai.com/v1",
      "apiKey": "sk-...",
      "model": "gpt-4o-mini"
    },
    "overviewPath": "./API_OVERVIEW.md",
    "productionBranch": "main"
  }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `dirTargets` | string | `"targets"` | Directory containing `.target.js` files |
| `output` | string | `"./openapi.json"` | Output file path for the generated spec |
| `title` | string | `"API"` | API title in the OpenAPI `info` block |
| `version` | string | `"1.0.0"` | API version in the OpenAPI `info` block |
| `description` | string | `""` | API description |
| `level` | number | `1` | Enhancement level (1–3) |
| `llm` | object | — | LLM provider configuration (see above) |
| `overviewPath` | string | `"./API_OVERVIEW.md"` | Path for the generated overview page (level 3 only) |
| `productionBranch` | string | `"main"` | Branch that triggers `docs:on-push` |

## Serving API Docs

Use `serveDocs()` to serve an interactive [Scalar](https://scalar.com) API reference UI:

```javascript
import Tejas from 'te.js';

const app = new Tejas();

app.serveDocs({ specPath: './openapi.json' });

app.takeoff();
```

This registers two routes:

| Route | Description |
|-------|-------------|
| `GET /docs` | Interactive Scalar API reference UI |
| `GET /docs/openapi.json` | Raw OpenAPI spec JSON |

### serveDocs Options

```javascript
app.serveDocs({
  specPath: './openapi.json',   // Path to the spec file (relative to cwd)
  scalarConfig: {               // Scalar UI configuration
    layout: 'modern',          // 'modern' or 'classic'
    theme: 'default',
    showSidebar: true,
    hideTestRequestButton: false
  }
});
```

See the [Scalar configuration reference](https://scalar.com/products/api-references/configuration) for all available UI options.

## CLI Commands

| Command | Description |
|---------|-------------|
| `tejas generate:docs` | Interactive OpenAPI generation |
| `tejas generate:docs --ci` | Non-interactive mode (for CI/CD) |
| `tejas docs:on-push` | Generate docs when pushing to production branch |

See the [CLI Reference](./cli.md) for full details.

## Workflow Example

A typical workflow for maintaining API docs:

```bash
# 1. Generate docs during development
npx tejas generate:docs

# 2. Serve docs in your app
# (add app.serveDocs({ specPath: './openapi.json' }) to your entry file)

# 3. Auto-regenerate on push to main
# (add tejas docs:on-push to your pre-push hook)
```

## Next Steps

- [CLI Reference](./cli.md) — Detailed CLI command documentation
- [Configuration](./configuration.md) — Full framework configuration reference
- [Routing](./routing.md) — Learn about endpoint metadata

