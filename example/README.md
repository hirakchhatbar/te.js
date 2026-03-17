# te.js Example

A comprehensive example demonstrating te.js framework features: routing, middleware, rate limiting, file uploads, and services.

## Quick Start

```bash
npm install
npm start
```

Server runs at `http://localhost:1403`

## Project Structure

```
example/
├── index.js              # App setup, global middleware, rate limit
├── targets/              # Routes + handlers
│   ├── index.target.js   # /, /health, /routes
│   └── users.target.js   # CRUD + file uploads (/users, /users/:id, …)
└── services/             # Business logic
    └── user.service.js  # In-memory user CRUD
```

## Endpoints

### Index

| Method | Path      | Description                          |
| ------ | --------- | ------------------------------------ |
| GET    | `/`       | Default HTML entry                   |
| GET    | `/health` | Health check                         |
| GET    | `/routes` | List all registered routes (grouped) |

### Users

| Method | Path                            | Description                       |
| ------ | ------------------------------- | --------------------------------- |
| GET    | `/users`                        | List all users                    |
| POST   | `/users`                        | Create user (JSON body)           |
| GET    | `/users/:id`                    | Get user by id                    |
| PUT    | `/users/:id`                    | Update user                       |
| DELETE | `/users/:id`                    | Delete user                       |
| POST   | `/users/:id/updateProfileImage` | Single file (field: image)        |
| POST   | `/users/:id/uploadDocuments`    | Multiple files (field: documents) |

### Errors (LLM-inferred when `errors.llm.enabled`)

| Method | Path               | Description                                                         |
| ------ | ------------------ | ------------------------------------------------------------------- |
| GET    | `/errors/throw`    | Explicit `ammo.throw()` with no args — LLM infers from code context |
| GET    | `/errors/crash`    | Throws an error — framework catches and uses same `ammo.throw(err)` |
| GET    | `/errors/explicit` | Explicit `ammo.throw(400, 'Bad request')` — LLM not used            |

Requires `errors.llm.enabled` and `LLM_*` (or `ERRORS_LLM_*`) env vars: baseURL, apiKey, model.

## curl Examples

```bash
# Health check
curl http://localhost:1403/health

# List routes
curl http://localhost:1403/routes

# Users CRUD
curl -X POST http://localhost:1403/users -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com"}'
curl http://localhost:1403/users
curl http://localhost:1403/users/1
curl -X PUT http://localhost:1403/users/1 -H "Content-Type: application/json" -d '{"name":"Jane"}'
curl -X DELETE http://localhost:1403/users/1

# File upload (single)
curl -X POST http://localhost:1403/users/1/updateProfileImage -F "image=@./photo.jpg"

# File upload (multiple)
curl -X POST http://localhost:1403/users/1/uploadDocuments -F "documents=@./doc1.pdf" -F "documents=@./doc2.pdf"

# LLM error handling (requires errors.llm.enabled + LLM_* or ERRORS_LLM_* in .env)
curl http://localhost:1403/errors/throw
curl http://localhost:1403/errors/crash
curl http://localhost:1403/errors/explicit

```

## Features Demonstrated

- **Routing** — Flat targets, parameterized paths (`:id`)
- **HTTP methods** — `ammo.GET`, `ammo.POST`, `ammo.notAllowed()`
- **Body parsing** — JSON, multipart/form-data
- **Error handling** — `TejError`, `ammo.notFound()`, `ammo.throw()`; optional **LLM-inferred errors** (`errors.llm.enabled`) — one mechanism for explicit and framework-caught errors (see `/errors/*`)
- **File uploads** — `TejFileUploader.file()`, `TejFileUploader.files()`
- **Middleware** — Global (`app.midair`), target-level (`target.midair`)
- **Rate limiting** — Memory store (60 req/min)
- **Services** — Business logic in `services/`
- **listAllEndpoints** — Route discovery at `/routes`

## Documentation generation

Generate OpenAPI docs and serve them at `/docs`:

```bash
npx tejas generate:docs
```

Then use `app.serveDocs({ specPath: './openapi.json' })` in `index.js` (already configured in this example).

### Generate docs on push to production (inbuilt)

To regenerate docs automatically when pushing to your production branch:

1. **Configure** the production branch and (optionally) doc options in `tejas.config.json`:

```json
"docs": {
  "dirTargets": "targets",
  "output": "./openapi.json",
  "productionBranch": "main"
}
```

Set `LLM_API_KEY` (or `OPENAI_API_KEY`) in the environment for non-interactive generation.

2. **Add a pre-push hook** (e.g. with Husky):

```bash
npx husky add .husky/pre-push "npx tejas docs:on-push"
```

When you push to `main` (or your configured branch), the framework will run `tejas generate:docs --ci` before the push completes, so `openapi.json` (and optionally `API_OVERVIEW.md`) stay in sync.

For CI pipelines, run:

```bash
npx tejas generate:docs --ci
```

See [te.js documentation](https://tejas-documentation.vercel.app) for more.
