# API Documentation

**Version:** 1.0.0

## Project Summary

This API provides a lightweight service combining user account management, a Redis-backed caching layer, and system introspection utilities. It supports full CRUD operations on user resources—including file uploads for profile images and bulk documents—offers key-value caching with optional TTL, and exposes health-check and route discovery endpoints for operational monitoring and API introspection. User data is maintained in-memory for demonstration purposes, and uploaded files are stored on disk with configurable size limits.

---

## APIs Available

### Users
Manages user accounts with full CRUD operations: create, retrieve, update, and delete users. Additionally supports profile image uploads and bulk document uploads, with files stored on disk and configurable size limits.

### Cache
Provides a key-value caching layer backed by Redis. Store arbitrary values with an optional time-to-live (TTL) and retrieve them by key. A middleware guard ensures the Redis service is available before processing any cache request.

### System & Discovery
Core application utilities including a default landing endpoint, a health-check endpoint reporting server status with a current timestamp, and a route discovery endpoint that lists all registered endpoints grouped by source for API introspection.

---

## Key Endpoints

### Getting Started

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Default landing entry point for the API. |
| `GET` | `/health` | Health check — returns server status and current timestamp. |
| `GET` | `/routes` | Route discovery — lists all registered endpoints grouped by source. |

### User Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | Retrieve a list of all users. |
| `POST` | `/users` | Create a new user. |
| `GET` | `/users/{id}` | Retrieve a specific user by ID. |
| `PUT` | `/users/{id}` | Update an existing user by ID. |
| `DELETE` | `/users/{id}` | Delete a user by ID. |
| `GET` | `/users/{id}/updateProfileImage` | Upload or update a user's profile image. |
| `GET` | `/users/{id}/uploadDocuments` | Bulk upload documents for a user. |

### Cache Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/cache` | Store a value in the cache with an optional TTL. |
| `GET` | `/cache/{key}` | Retrieve a cached value by its key. |

---

## Additional Notes

### Data Storage
- **User data** is maintained in-memory and is not persisted across server restarts (demonstration mode).
- **Uploaded files** (profile images, documents) are stored on disk with configurable size limits.

### Cache Availability
All cache endpoints are protected by a middleware guard that verifies the Redis service is reachable before processing requests. If Redis is unavailable, cache requests will be rejected before reaching the handler.

### File Uploads
- **Profile images**: Single-file upload tied to a specific user via `/users/{id}/updateProfileImage`.
- **Bulk documents**: Multi-file upload supported via `/users/{id}/uploadDocuments`.

File size limits are configurable at the application level.

---

## Quick Start

1. **Verify the API is running** — call `GET /health` and confirm a successful status response with a timestamp.
2. **Explore available routes** — call `GET /routes` to discover all registered endpoints.
3. **Create a user** — send a `POST` request to `/users` with the required user payload.
4. **Store and retrieve cache entries** — use `POST /cache` to set a key-value pair, then `GET /cache/{key}` to retrieve it.