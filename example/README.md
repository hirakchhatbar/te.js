# te.js Example

A comprehensive example demonstrating te.js framework features: routing, middleware, rate limiting, file uploads, services, and optional Redis caching.

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
│   ├── users.target.js   # CRUD + file uploads (/users, /users/:id, …)
│   └── cache.target.js   # Redis key-value (optional)
└── services/             # Business logic
    ├── user.service.js  # In-memory user CRUD
    └── cache.service.js # Redis wrapper
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

### Cache (requires Redis)

| Method | Path          | Description                        |
| ------ | ------------- | ---------------------------------- |
| GET    | `/cache/:key` | Get value                          |
| POST   | `/cache`      | Set value (body: key, value, ttl?) |

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

# Cache (requires REDIS_URL)
REDIS_URL=redis://localhost:6379 npm start
curl -X POST http://localhost:1403/cache -H "Content-Type: application/json" -d '{"key":"foo","value":"bar","ttl":60}'
curl http://localhost:1403/cache/foo
```

## Optional: Redis

To enable cache endpoints:

```bash
npm run start:redis
```

Or set `REDIS_URL` before starting:

```bash
# Linux/macOS
REDIS_URL=redis://localhost:6379 npm start

# Windows (PowerShell)
$env:REDIS_URL="redis://localhost:6379"; npm start
```

## Features Demonstrated

- **Routing** — Flat targets, parameterized paths (`:id`)
- **HTTP methods** — `ammo.GET`, `ammo.POST`, `ammo.notAllowed()`
- **Body parsing** — JSON, multipart/form-data
- **Error handling** — `TejError`, `ammo.notFound()`, `ammo.throw()`
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
