# CLI Reference

Tejas includes a command-line interface for starting your server and generating API documentation.

## Installation

The CLI is included when you install te.js. It is available as the `tejas` command:

```bash
npm install te.js
```

If installed locally, use `npx tejas` to run commands.

## Commands

### tejas fly

Start the Tejas server by running your application's entry point.

```bash
tejas fly [file]
```

**Entry point resolution** (first match wins):

1. CLI argument — `tejas fly app.js`
2. `tejas.config.json` — `"entry": "src/index.js"`
3. `package.json` — `"main": "index.js"`
4. Convention files — `index.js`, `app.js`, or `server.js` in the current directory

**Examples:**

```bash
# Use automatic entry point resolution
npx tejas fly

# Specify an entry file explicitly
npx tejas fly src/server.js
```

The server process inherits your environment and current working directory. Press `Ctrl+C` to stop.

---

### tejas generate:docs

Generate an OpenAPI 3.0 specification from your registered targets using LLM-powered analysis.

```bash
tejas generate:docs [--ci]
```

#### Interactive Mode (default)

Walks you through configuration step by step:

```bash
npx tejas generate:docs
```

You will be prompted for:

| Prompt | Default | Description |
|--------|---------|-------------|
| Targets directory | `targets` | Directory containing `.target.js` files |
| Output file | `./openapi.json` | Where to write the OpenAPI spec |
| API title | `API` | Title in the spec's `info` block |
| API version | `1.0.0` | Version in the spec's `info` block |
| API description | *(empty)* | Optional description |
| LLM provider base URL | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| API key | *(from env)* | LLM provider API key |
| Model | `gpt-4o-mini` | LLM model name |
| Token usage level | `1` | Enhancement depth (1–3) |
| Preview docs? | No | Serve a live Scalar UI preview |

After generation, if you chose to preview, a local server starts on port 3333 (configurable via the `DOCS_PORT` env var).

#### CI Mode

Non-interactive mode for automated pipelines. Uses configuration from `tejas.config.json` and environment variables:

```bash
npx tejas generate:docs --ci
```

**Required environment:**

| Variable | Fallback | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | `OPENAI_API_KEY` | LLM provider API key |

**Optional environment:**

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_BASE_URL` | `https://api.openai.com/v1` | LLM provider base URL |
| `LLM_MODEL` | `gpt-4o-mini` | LLM model name |

All other options are read from the `docs` section of `tejas.config.json`. See [Auto-Documentation](./auto-docs.md) for the full config reference.

---

### tejas docs:on-push

Generate documentation automatically when pushing to your production branch. Designed for use in a git `pre-push` hook.

```bash
tejas docs:on-push
```

This command reads git's pre-push stdin to determine which branch is being pushed. If it matches the configured production branch, it runs `generate:docs` in CI mode.

**Setup with Husky:**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-push": "tejas docs:on-push"
    }
  }
}
```

**Configuration:**

| Source | Key | Default |
|--------|-----|---------|
| `tejas.config.json` | `docs.productionBranch` | `"main"` |
| Environment variable | `DOCS_PRODUCTION_BRANCH` | `"main"` |

If the push is not targeting the production branch, the command exits silently with no action.

---

## Environment Variables Summary

| Variable | Used By | Description |
|----------|---------|-------------|
| `LLM_API_KEY` | `generate:docs`, `docs:on-push` | LLM provider API key |
| `OPENAI_API_KEY` | `generate:docs`, `docs:on-push` | Fallback API key |
| `LLM_BASE_URL` | `generate:docs`, `docs:on-push` | LLM provider endpoint |
| `LLM_MODEL` | `generate:docs`, `docs:on-push` | LLM model name |
| `DOCS_PORT` | `generate:docs` | Preview server port (default `3333`) |
| `DOCS_PRODUCTION_BRANCH` | `docs:on-push` | Branch name to trigger generation |

## Next Steps

- [Auto-Documentation](./auto-docs.md) — Enhancement levels, endpoint metadata, and Scalar UI
- [Configuration](./configuration.md) — Full `tejas.config.json` reference
