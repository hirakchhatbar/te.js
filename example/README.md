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
│   ├── hello.target.js   # Parameterized routes, query params, redirect
│   ├── users.target.js   # CRUD (GET, POST, PUT, DELETE)
│   ├── user.target.js    # File uploads (single + multi)
│   └── cache.target.js   # Redis key-value (optional)
└── services/             # Business logic
    ├── user.service.js  # In-memory user CRUD
    └── cache.service.js # Redis wrapper
```

## Endpoints

### Index

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Default HTML entry |
| GET | `/health` | Health check |
| GET | `/routes` | List all registered routes (grouped) |

### Hello

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hello` | Basic response |
| GET | `/hello/:name` | Parameterized route |
| GET | `/hello/greet?name=Alice` | Query params |
| GET | `/hello/redirect` | Redirects to /hello |

### Users (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users |
| POST | `/users` | Create user (JSON body) |
| GET | `/users/:id` | Get user by id |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |

### User (File Uploads)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/user/updateProfileImage` | Single file (field: image) |
| POST | `/user/uploadDocuments` | Multiple files (field: documents) |

### Cache (requires Redis)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cache/:key` | Get value |
| POST | `/cache` | Set value (body: key, value, ttl?) |

## curl Examples

```bash
# Health check
curl http://localhost:1403/health

# List routes
curl http://localhost:1403/routes

# Hello
curl http://localhost:1403/hello
curl http://localhost:1403/hello/Alice
curl "http://localhost:1403/hello/greet?name=Bob"

# Users CRUD
curl -X POST http://localhost:1403/users -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com"}'
curl http://localhost:1403/users
curl http://localhost:1403/users/1
curl -X PUT http://localhost:1403/users/1 -H "Content-Type: application/json" -d '{"name":"Jane"}'
curl -X DELETE http://localhost:1403/users/1

# File upload (single)
curl -X POST http://localhost:1403/user/updateProfileImage -F "image=@./photo.jpg"

# File upload (multiple)
curl -X POST http://localhost:1403/user/uploadDocuments -F "documents=@./doc1.pdf" -F "documents=@./doc2.pdf"

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

See [te.js documentation](https://tejas-documentation.vercel.app) for more.
