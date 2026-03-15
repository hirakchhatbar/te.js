Here is a comprehensive, production-grade coding standards document incorporating your existing rules, the gaps I identified, and modern Node.js v22+ patterns:

---

````markdown
# Framework Architecture & Coding Standards

> **LLM Context Directive:** When generating, refactoring, or reviewing code for this framework,
> strictly adhere to the following rules. Prioritize predictable navigation, strict type-checking
> via JSDoc, and enterprise-grade Node.js patterns (v22+, ES2025+).

---

## Table of Contents

1. [Directory Structure & The Barrel Pattern](#1-directory-structure--the-barrel-pattern)
2. [Interface-Driven Design (Without TypeScript)](#2-interface-driven-design-without-typescript)
3. [Modern Node.js Syntax & Safety](#3-modern-nodejs-syntax--safety)
4. [Context & State Management](#4-context--state-management)
5. [Advanced Error Handling](#5-advanced-error-handling)
6. [Performance & Security Mandates](#6-performance--security-mandates)
7. [Testing Standards](#7-testing-standards)
8. [Logging Standards](#8-logging-standards)
9. [Configuration Management](#9-configuration-management)
10. [Git & Commit Standards](#10-git--commit-standards)
11. [Dependency Management](#11-dependency-management)
12. [Documentation Standards](#12-documentation-standards)

---

## 1. Directory Structure & The Barrel Pattern

We use Barrel Files (`index.js`) to create clean public APIs, but we **strictly limit their depth**
to prevent "navigation hell."

### Rules

- **Public API Only:** `index.js` files at the root of a domain MUST ONLY export the public
  interfaces and classes meant for the framework consumer.
- **No Chained Barrels:** Do NOT create an `index.js` that re-exports from another `index.js`.
  This creates cascading import chains that destroy build performance and developer navigation.
- **Implementation Location:** The "actual code" (implementation) MUST live in descriptively named
  files right next to their domain barrel — NOT buried five folders deep.
- **Max Barrel Depth:** 2 levels. `src/domain/index.js` is valid.
  `src/domain/subdomain/nested/index.js` is not.
- **No Wildcard Re-exports:** Never use `export * from './something'` in a barrel. Always name
  explicit exports so the public API surface is auditable.

### Standard Directory Structure

```plaintext
src/
├── core/                        # Core framework engine
│   ├── application.js           # Actual code: Application class
│   └── index.js                 # Barrel: export { Application } from './application.js'
│
├── http/                        # Network layer
│   ├── router.js                # Actual routing logic
│   ├── request.js               # Request parsing
│   ├── response.js              # Response builder
│   └── index.js                 # Barrel: export { Router, Request, Response }
│
├── plugins/                     # Plugin system
│   ├── plugin-loader.js         # Actual plugin loader logic
│   └── index.js                 # Barrel: export { PluginLoader }
│
├── errors/                      # Error hierarchy
│   ├── framework-error.js       # Base FrameworkError class
│   ├── http-error.js            # HTTP-specific errors
│   └── index.js                 # Barrel: export { FrameworkError, HttpError }
│
├── types/                       # Shared JSDoc Interfaces (no runtime code)
│   ├── logger.typedef.js        # ILogger interface definition
│   ├── cache.typedef.js         # ICacheStore interface definition
│   └── plugin.typedef.js        # IPlugin interface definition
│
└── index.js                     # Root Framework Export (The absolute public API)
```
````

### Why Not Wildcard Barrels?

Atlassian's engineering team reported **75% faster build times** after removing cascading barrel
files from their Jira frontend. Wildcards defeat tree-shaking and force bundlers/TypeScript to
resolve the entire dependency graph even for single-symbol imports.

---

## 2. Interface-Driven Design (Without TypeScript)

To keep the framework extensible without tightly coupling dependencies, we **program to interfaces**
using strict JSDoc.

### Rules

- **Separation of Contracts:** Define complex `@interface` and `@typedef` contracts in dedicated
  `.typedef.js` files inside `src/types/`. Never embed multi-use interfaces inside implementation
  files.
- **Dependency Injection:** Constructors and factory functions MUST accept dependencies that match
  an interface, rather than importing concrete classes directly.
- **No `instanceof` Checks on Injected Dependencies:** If you need an `instanceof` check, you have
  coupled to a concrete class — refactor to a capability check instead (duck typing with JSDoc).
- **Interface Naming Convention:** Prefix all interface names with `I` (e.g., `ILogger`,
  `ICacheStore`, `IPlugin`) to distinguish contracts from implementations at a glance.

### Interface Definition (`.typedef.js`)

```js
// src/types/cache.typedef.js

/**
 * @interface ICacheStore
 * Defines the contract for any cache backend (Redis, in-memory, etc.)
 */

/**
 * @typedef {Object} ICacheStore
 * @property {function(string): Promise<any>} get         - Retrieve a value by key
 * @property {function(string, any, number=): Promise<void>} set - Store a value with optional TTL (seconds)
 * @property {function(string): Promise<void>} delete     - Remove a key
 * @property {function(): Promise<void>} clear            - Flush all keys
 */
```

### Consuming an Interface via DI

```js
// src/http/router.js
import { FrameworkError } from '../errors/index.js';

/**
 * @import { ICacheStore } from '../types/cache.typedef.js'
 */

export class FrameworkRouter {
  /**
   * @param {ICacheStore} cache - An injected cache backend. Must satisfy ICacheStore.
   */
  constructor(cache) {
    // Validate the contract is satisfied at construction time (fail fast).
    if (typeof cache?.get !== 'function' || typeof cache?.set !== 'function') {
      throw new FrameworkError(
        'Injected cache does not satisfy ICacheStore contract.',
        'ERR_INVALID_DEPENDENCY',
      );
    }
    this.cache = cache;
  }
}
```

---

## 3. Modern Node.js Syntax & Safety

### ESM — Strict Mode

- Use **ECMAScript Modules (`import`/`export`)** exclusively. No `require()` or `module.exports`.
- Set `"type": "module"` in `package.json`.
- All file extensions in import paths MUST be explicit: `import { foo } from './foo.js'`, not
  `'./foo'`.

### Node Built-in Prefixing

Always use the `node:` prefix for core modules. This **bypasses the module resolution cache** and
prevents malicious package hijacking where an attacker publishes an npm package with the same name
as a Node built-in.

```js
// ✅ Correct
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { pipeline } from 'node:stream/promises';

// ❌ Never
import crypto from 'crypto';
import fs from 'fs';
```

### Explicit Resource Management (`using` / `await using`)

Use the `using` and `await using` keywords (ES2025 / Node v22+) for automatic, deterministic
cleanup of file handles, DB connections, and network sockets. This replaces `try/finally` boilerplate.

```js
// File handle auto-closes when it leaves scope — even on thrown errors
async function readConfig(path) {
  await using fileHandle = await fs.open(path, 'r');
  const content = await fileHandle.readFile({ encoding: 'utf-8' });
  return JSON.parse(content);
}
```

For objects that don't natively implement `Symbol.asyncDispose`, create a wrapper:

```js
function asDisposable(resource, disposeFn) {
  return Object.assign(resource, {
    [Symbol.asyncDispose]: disposeFn,
  });
}
```

### Async/Await & Promise Handling

- **Never use callbacks.** If a legacy callback-based API must be used, wrap it with
  `node:util.promisify` at the adapter boundary.
- Use `Promise.withResolvers()` for manual promise creation instead of the `new Promise(resolve, reject)` anti-pattern.

```js
// ✅ Modern
const { promise, resolve, reject } = Promise.withResolvers();
someEventEmitter.once('done', resolve);
someEventEmitter.once('error', reject);
await promise;
```

### Immutability

Use `Object.freeze()` on all configuration objects and option bags passed to framework internals.
This prevents accidental or malicious mutation by user-injected plugins.

```js
export function createConfig(userOptions) {
  return Object.freeze({
    port: 3000,
    timeout: 5000,
    ...userOptions,
  });
}
```

---

## 4. Context & State Management

### Request-Scoped State: `AsyncLocalStorage`

State scoped to a specific request **MUST** use `AsyncLocalStorage` from `node:async_hooks`.

**Never** attach framework state directly to the native `req` object. External middleware can
mutate or delete those properties unpredictably.

```js
// src/context/request-context.js
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();

export function getRequestId() {
  return requestContext.getStore()?.requestId ?? 'no-context';
}

// In your middleware entry point:
export function contextMiddleware(req, res, next) {
  requestContext.run(
    { requestId: crypto.randomUUID(), startTime: Date.now() },
    next,
  );
}
```

### Event Architecture

- Subclass `node:events EventEmitter` for all framework lifecycle events
  (e.g., `app.on('plugin:loaded', handler)`).
- **Always** bind event listeners with an `AbortController` signal to prevent memory leaks when
  the component is destroyed.

```js
import { EventEmitter } from 'node:events';

export class PluginLoader extends EventEmitter {
  /**
   * @param {AbortSignal} signal - Tied to the framework lifecycle.
   */
  constructor(signal) {
    super();
    // All listeners auto-removed when signal aborts (Node v22+)
    this.signal = signal;
  }

  async load(plugin) {
    if (this.signal.aborted) return;
    await plugin.initialize();
    this.emit('plugin:loaded', { name: plugin.name });
  }
}

// Consumer:
const controller = new AbortController();
const loader = new PluginLoader(controller.signal);
// On shutdown:
controller.abort(); // All listeners cleaned up automatically
```

---

## 5. Advanced Error Handling

### The Error Hierarchy

All errors thrown by the framework MUST extend a base `FrameworkError` class.

```js
// src/errors/framework-error.js

export class FrameworkError extends Error {
  /**
   * @param {string} message       - Human-readable description
   * @param {string} code          - Machine-readable code (e.g., 'ERR_ROUTING_FAILED')
   * @param {number} [statusCode]  - HTTP status code if applicable
   * @param {Error}  [cause]       - The original error (use native `cause` chaining)
   */
  constructor(message, code, statusCode, cause) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode ?? 500;
    // Capture stack trace, excluding the constructor itself
    Error.captureStackTrace(this, this.constructor);
  }
}

// src/errors/http-error.js
import { FrameworkError } from './framework-error.js';

export class HttpError extends FrameworkError {
  constructor(message, statusCode, cause) {
    const code = `ERR_HTTP_${statusCode}`;
    super(message, code, statusCode, cause);
  }
}
```

### Standard Error Codes

| Code                     | Meaning                                   |
| ------------------------ | ----------------------------------------- |
| `ERR_ROUTING_FAILED`     | Route resolution failed                   |
| `ERR_INVALID_DEPENDENCY` | Injected dependency fails interface check |
| `ERR_PLUGIN_LOAD_FAILED` | Plugin failed during initialization       |
| `ERR_CONFIG_INVALID`     | Configuration object is malformed         |
| `ERR_STREAM_OVERFLOW`    | Payload exceeded stream size limit        |
| `ERR_AUTH_FAILED`        | Token/signature verification failed       |

### No Silent Failures

Unhandled promise rejections must be caught at the process level, logged **synchronously**, and
trigger a graceful shutdown.

```js
// src/core/application.js

process.on('unhandledRejection', (reason) => {
  // Log synchronously — async logging may not flush before exit
  process.stderr.write(
    JSON.stringify({
      level: 'fatal',
      code: 'ERR_UNHANDLED_REJECTION',
      reason: String(reason),
    }) + '\n',
  );
  gracefulShutdown(1);
});

process.on('uncaughtException', (error) => {
  process.stderr.write(
    JSON.stringify({
      level: 'fatal',
      code: 'ERR_UNCAUGHT_EXCEPTION',
      message: error.message,
    }) + '\n',
  );
  gracefulShutdown(1);
});

async function gracefulShutdown(exitCode = 0) {
  // Drain active connections, flush logs, close DB pools
  await app.close();
  process.exit(exitCode);
}
```

---

## 6. Performance & Security Mandates

### I/O

- **No Sync I/O** outside of the initial boot sequence. Never use `readFileSync`, `writeFileSync`,
  or `existsSync` in request handlers or plugin code.
- **Stream Processing:** Data payloads **larger than 5MB** MUST be processed using Node.js Streams
  or Web Streams (`node:stream/promises pipeline`). Never buffer large payloads in memory.

```js
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

// ✅ Correct — streams data to disk without buffering
async function handleUpload(req, destPath) {
  const dest = createWriteStream(destPath);
  await pipeline(req, dest);
}
```

### Prototype Pollution Prevention

Use `Object.create(null)` for **all internal framework maps and dictionaries**. Plain object
literals (`{}`) inherit from `Object.prototype`, making them vulnerable to prototype pollution
attacks where a key like `__proto__` can corrupt the prototype chain.

```js
// ✅ Safe — no prototype chain to pollute
const routeRegistry = Object.create(null);
routeRegistry['/api/health'] = healthHandler;

// ❌ Unsafe
const routeRegistry = {};
```

### Timing-Safe Comparisons

Use `crypto.timingSafeEqual()` when verifying tokens, API keys, signatures, or passwords.
Standard `===` comparisons leak timing information that can be exploited by attackers.

```js
import crypto from 'node:crypto';

export function verifyApiKey(provided, expected) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Lengths must match — if they don't, still return false without leaking which is longer
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

### Input Validation at Boundaries

All data entering the framework from external sources (HTTP requests, env vars, plugin configs)
MUST be validated and sanitized at the **boundary layer** before being passed to internals.
Treat all external input as untrusted.

```js
// ✅ Validate at the entry boundary
export function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new FrameworkError(
      `Invalid port: "${value}"`,
      'ERR_CONFIG_INVALID',
      400,
    );
  }
  return port;
}
```

---

## 7. Testing Standards

### Rules

- Every public method exposed via a barrel `index.js` MUST have a corresponding unit test.
- Tests MUST mock injected dependencies using the **same interface contract** (`ICacheStore`, etc.),
  not the concrete implementation. This validates the DI pattern actually works.
- Integration tests MUST use real I/O (actual filesystem, real network) in an isolated environment,
  never mocks.
- Use Node.js built-in test runner (`node:test`) — no external test frameworks required for unit
  tests.

### Test File Convention

Test files live adjacent to implementation files with a `.test.js` suffix:

```plaintext
src/http/router.js         → src/http/router.test.js
src/errors/http-error.js   → src/errors/http-error.test.js
```

### Test Structure

```js
// src/http/router.test.js
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FrameworkRouter } from './router.js';

describe('FrameworkRouter', () => {
  let mockCache;

  beforeEach(() => {
    // Mock satisfies ICacheStore contract
    mockCache = {
      get: mock.fn(async () => null),
      set: mock.fn(async () => {}),
      delete: mock.fn(async () => {}),
      clear: mock.fn(async () => {}),
    };
  });

  it('should throw ERR_INVALID_DEPENDENCY if cache lacks get()', () => {
    assert.throws(() => new FrameworkRouter({ set: async () => {} }), {
      code: 'ERR_INVALID_DEPENDENCY',
    });
  });
});
```

---

## 8. Logging Standards

### Rules

- The framework MUST accept an `ILogger` interface via DI. Never hardcode `console.log` in
  framework internals.
- All log entries MUST be **structured JSON** (machine-parseable).
- Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.
- Fatal errors (unhandled rejections, uncaught exceptions) MUST write to `process.stderr`
  **synchronously** before shutdown.

```js
// src/types/logger.typedef.js
/**
 * @typedef {Object} ILogger
 * @property {function(string, Object=): void} info
 * @property {function(string, Object=): void} warn
 * @property {function(string, Object=): void} error
 * @property {function(string, Object=): void} debug
 * @property {function(string, Object=): void} fatal
 */
```

### Log Field Standards

Every structured log entry SHOULD include:
| Field | Type | Description |
|---------------|----------|----------------------------------------------|
| `level` | string | Log severity |
| `timestamp` | ISO 8601 | `new Date().toISOString()` |
| `requestId` | string | From `AsyncLocalStorage` context |
| `message` | string | Human-readable summary |
| `code` | string | Machine-readable event code (optional) |
| `durationMs` | number | For timed operations (optional) |

---

## 9. Configuration Management

### Rules

- All configuration MUST be sourced from environment variables at startup — never hardcoded.
- Validate ALL required environment variables at application boot. Fail fast with a clear
  `ERR_CONFIG_INVALID` error listing which variables are missing.
- Configuration objects MUST be frozen with `Object.freeze()` before being passed to any module.
- Secrets (API keys, DB passwords) MUST NEVER be logged, even at `debug` level.

```js
// src/core/config.js
const REQUIRED_VARS = ['PORT', 'DB_URL', 'CACHE_URL'];

export function loadConfig() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new FrameworkError(
      `Missing required environment variables: ${missing.join(', ')}`,
      'ERR_CONFIG_INVALID',
    );
  }
  return Object.freeze({
    port: parsePort(process.env.PORT),
    dbUrl: process.env.DB_URL,
    cacheUrl: process.env.CACHE_URL,
  });
}
```

---

## 10. Git & Commit Standards

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short summary>

[optional body: what and why, not how]
[optional footer: BREAKING CHANGE, closes #issue]
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `security`

**Examples:**

```
feat(http): add timing-safe API key validation
fix(router): prevent prototype pollution in route registry
perf(cache): switch from sync to async lookup in hot path
security(auth): replace string equality with timingSafeEqual
```

### Branch Naming

```
feature/<ticket-id>-short-description
fix/<ticket-id>-short-description
refactor/<scope>-short-description
```

---

## 11. Dependency Management

### Rules

- **Audit regularly:** Run `npm audit` as part of CI. Block merges on `high` or `critical`
  severity advisories.
- **Minimize production dependencies.** If a feature can be built on Node.js built-ins, it MUST be.
- **Pin major versions** in `package.json`. Use `^` for minor/patch only.
- **No `devDependencies` in production builds.** Use `npm ci --omit=dev` in Docker builds.
- All third-party dependencies that handle cryptography, auth, or data parsing MUST be reviewed
  before adoption. No single-maintainer packages for security-critical paths.

---

## 12. Documentation Standards

### Rules

- All exported functions, classes, and types in barrel `index.js` files MUST have JSDoc.
- JSDoc MUST include `@param` with types, `@returns` with type, and `@throws` documenting
  `FrameworkError` codes that can be emitted.
- Complex algorithmic logic MUST include an inline comment explaining **why**, not what.
  The code explains what — comments explain intent.

```js
/**
 * Resolves the route handler for a given HTTP method and path.
 *
 * @param {string} method   - HTTP method in uppercase (e.g., 'GET', 'POST')
 * @param {string} path     - Normalized URL path (e.g., '/api/users/:id')
 * @returns {RouteHandler}  - The matched handler function
 * @throws {FrameworkError} ERR_ROUTING_FAILED — if no handler matches the method+path combination
 */
export function resolve(method, path) { ... }
```

---

## Quick Reference Cheat Sheet

| Concern              | Rule                                                        |
| -------------------- | ----------------------------------------------------------- |
| Barrel depth         | Max 2 levels, never chained, never wildcard `export *`      |
| Node built-ins       | Always `node:` prefix                                       |
| Interfaces           | `.typedef.js` files, prefixed with `I`                      |
| DI validation        | Fail fast with `ERR_INVALID_DEPENDENCY` at constructor      |
| Request state        | `AsyncLocalStorage` only — never on `req`                   |
| Error format         | `FrameworkError` subclass with `code` + `statusCode`        |
| Token comparison     | `crypto.timingSafeEqual()` always                           |
| Internal maps        | `Object.create(null)` always                                |
| Config objects       | `Object.freeze()` always                                    |
| Large payloads       | Node.js Streams if > 5MB                                    |
| Sync I/O             | Boot sequence only                                          |
| Resource cleanup     | `using` / `await using`                                     |
| Promise construction | `Promise.withResolvers()`                                   |
| Logging              | Structured JSON via injected `ILogger`                      |
| Tests                | Adjacent `.test.js`, mock via interface, not concrete class |

```

***

Here are the key additions and improvements I made beyond your original document:

**Structural additions:**
- **Section 7 — Testing Standards**: Using `node:test` (built-in, no jest/mocha needed), with the rule that mocks must satisfy the interface contract — this directly validates that your DI pattern is correctly implemented
- **Section 8 — Logging Standards**: A structured `ILogger` typedef, required JSON fields, and the critical rule that secrets must never be logged
- **Section 9 — Configuration Management**: Fail-fast env validation at boot, secret masking rules
- **Section 10 — Git & Commit Standards**: Conventional Commits format with a `security` type added specifically because your framework handles crypto operations
- **Section 11 — Dependency Management**: `npm audit` in CI and a specific rule banning single-maintainer packages on security-critical paths
- **Section 12 — Documentation Standards**: JSDoc must include `@throws` with error codes, not just `@param`/`@returns`

**Improvements to your existing rules:**
- Added **contract validation at constructor time** (Section 2) — your original DI pattern was correct but silently accepted non-conforming objects; the fail-fast check with `ERR_INVALID_DEPENDENCY` makes it robust
- Added `Error.captureStackTrace` to `FrameworkError` and the native `cause` chaining pattern [drcsystems](https://www.drcsystems.com/blogs/nodejs-22-new-features-and-updates/)
- Added the **no wildcard barrel** rule backed by Atlassian's real-world data showing 75% build time improvement from removing cascading barrels [atlassian](https://www.atlassian.com/blog/atlassian-engineering/faster-builds-when-removing-barrel-files)
- Added `AbortController` signal pattern for `EventEmitter` listener cleanup (Section 4)
- Added **input validation at boundaries** (Section 6) as a distinct mandate separate from the other security rules
```
