---
name: Tejas Framework Test Suite
overview: Create a comprehensive test suite using Vitest for all core features of the Tejas framework, including unit tests, integration tests, edge cases, and error scenarios.
todos:
  - id: setup-vitest
    content: Set up Vitest configuration and install dependencies
    status: completed
  - id: test-helpers
    content: Create test helper utilities and HTTP mocks
    status: pending
  - id: test-ammo
    content: Write unit tests for Ammo class (fire, throw, redirect, shortcuts)
    status: pending
  - id: test-target-registry
    content: Write tests for Target class and TargetRegistry route matching
    status: pending
  - id: test-body-parser
    content: Write tests for body parser (JSON, URL-encoded, multipart)
    status: pending
  - id: test-rate-limiting
    content: Write tests for all 3 rate limiting algorithms
    status: pending
  - id: test-file-uploader
    content: Write tests for file upload middleware
    status: pending
  - id: test-configuration
    content: Write tests for configuration loading and standardization
    status: pending
  - id: test-handler-integration
    content: Write integration tests for request handler and middleware chain
    status: pending
---

# Tejas Framework Test Suite Plan

Create comprehensive tests using Vitest for all core features of the Tejas framework, organized by module with unit, integration, and error scenario coverage.

## Test Infrastructure Setup

Install Vitest and configure for ES modules. Create test utilities and mocks for HTTP requests, database connections, and file system operations.**Files to create:**

- `vitest.config.js` - Vitest configuration with ESM support
- `tests/helpers/mock-http.js` - HTTP request/response mocks
- `tests/helpers/test-utils.js` - Common test utilities

## Core Module Tests

### 1. Ammo Class ([server/ammo.js](server/ammo.js))

Unit tests for the request/response handler:

- HTTP method flag initialization (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- `fire()` response dispatch with various argument patterns (status only, data only, status+data, status+data+content-type)
- `redirect()` with default and custom status codes
- `throw()` error handling (TejError, Error instances, status codes, strings)
- `notFound()`, `notAllowed()`, `unauthorized()` shortcuts
- `enhance()` method populating request properties

### 2. Target & Registry ([server/target.js](server/target.js), [server/targets/registry.js](server/targets/registry.js))

Unit tests for routing:

- Target constructor with base path
- `midair()` middleware registration
- `register()` endpoint registration with path + handler + optional middlewares
- TargetRegistry singleton pattern
- `aim()` exact path matching
- `aim()` parameterized route matching (`/users/:id`, `/api/:category/:id`)
- `getAllEndpoints()` listing (flat and grouped)

### 3. Request Handler ([server/handler.js](server/handler.js))

Integration tests for request processing:

- Middleware chain execution order
- Global + target + route middleware composition
- Async middleware handling
- Error propagation through chain
- 404 handling for unmatched routes
- Response already sent detection

### 4. Body Parser ([server/ammo/body-parser.js](server/ammo/body-parser.js))

Unit tests for request body parsing:

- JSON body parsing (valid, invalid, empty)
- URL-encoded body parsing
- Multipart form data parsing with boundary extraction
- Body size limit enforcement (413 errors)
- Request timeout handling (408 errors)
- Missing content-type handling

### 5. Rate Limiting ([rate-limit/](rate-limit/))

Unit tests for each algorithm:

- **Fixed Window:** Counter increments, window reset, strict mode alignment
- **Sliding Window:** Weighted counts, timestamp pruning, window transitions
- **Token Bucket:** Token consumption, refill rate, burst handling
- Storage interface (memory operations)
- Rate limit header generation (standard, legacy, draft7, draft8)
- `onRateLimited` callback

### 6. File Uploader ([server/files/uploader.js](server/files/uploader.js))

Unit tests for file handling:

- Single file upload with `file()` middleware
- Multiple file upload with `files()` middleware
- File size validation (413 errors for oversized files)
- File metadata extraction (extension, mimetype, path)
- Non-multipart request passthrough
- Directory creation

### 7. Configuration ([utils/configuration.js](utils/configuration.js))

Unit tests for config processing:

- `loadConfigFile()` file reading and JSON parsing
- `standardizeObj()` key uppercasing and flattening
- Missing config file handling
- Nested object flattening with underscores

### 8. TejError ([server/error.js](server/error.js))

Unit tests for custom error:

- Constructor with code and message
- Error inheritance
- Name property

### 9. Database Manager ([database/index.js](database/index.js))

Unit tests (mocked connections):

- Singleton pattern enforcement
- Connection initialization tracking
- `hasConnection()` status checking
- `getConnection()` retrieval
- Connection not found error

## Test File Structure

```javascript
tests/
  helpers/
    mock-http.js
    test-utils.js
  unit/
    ammo.test.js
    target.test.js
    registry.test.js
    body-parser.test.js
    rate-limit/
      fixed-window.test.js
      sliding-window.test.js
      token-bucket.test.js
    file-uploader.test.js
    configuration.test.js
    tej-error.test.js
    database-manager.test.js
  integration/
    handler.test.js
    middleware-chain.test.js
    rate-limit-middleware.test.js


```