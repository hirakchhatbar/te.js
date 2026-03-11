# Error Handling

Tejas keeps your application from crashing on unhandled errors. You don't log the error and send the response separately — **`ammo.throw()` is the single mechanism**: it sends the appropriate HTTP response (logging is optional via `log.exceptions`). Whether you call `ammo.throw()` or the framework calls it when it catches an error, the same behaviour applies. When LLM-inferred errors are enabled, call `ammo.throw()` with no arguments and an LLM infers status and message from code context; explicit code and message always override.

## Zero-Config Error Handling

**One of Tejas's most powerful features is that you don't need to write any error handling code** — the framework catches all errors automatically at multiple levels.

### How It Works

Tejas wraps all middleware and route handlers with built-in error catching. Any error thrown in your code is automatically passed to `ammo.throw(err)` — the same mechanism you use for intentional errors. So: one place handles everything (response + optional logging via `log.exceptions`). No separate "log then send response"; your app never crashes and clients always receive a proper response.

### Write Clean Code Without Try-Catch

```javascript
// ✅ No try-catch needed — Tejas handles errors automatically
target.register('/users/:id', async (ammo) => {
  const user = await database.findUser(ammo.payload.id); // If this throws, Tejas catches it
  const posts = await database.getUserPosts(user.id); // Same here
  ammo.fire({ user, posts });
});
```

In other frameworks you typically **log the error and then send the response** (two separate steps). With Tejas, **`ammo.throw()` does both** — and when the framework catches an error it uses the same `ammo.throw()`, so you never define them separately:

```javascript
// ❌ Traditional: log then send response (two separate things)
app.get('/users/:id', async (req, res) => {
  try {
    const user = await database.findUser(req.params.id);
    res.json(user);
  } catch (error) {
    console.error(error); // 1. log
    res.status(500).json({ error: 'Internal Server Error' }); // 2. send response
  }
});
```

### Automatic Error Responses

When an unhandled error occurs, the framework calls `ammo.throw(err)` — the same method you use for intentional errors. So one mechanism: explicit `ammo.throw()` or framework-caught, both go through `ammo.throw()`. When [LLM-inferred errors](#llm-inferred-errors) are enabled, status and message are inferred from code context; otherwise or when you pass explicit code/message, those are used.

### Enable Error Logging

To see caught exceptions in your logs, enable exception logging:

```javascript
const app = new Tejas({
  log: {
    exceptions: true, // Log all caught exceptions
  },
});
```

Or via environment variable:

```bash
LOG_EXCEPTIONS=true
```

---

## LLM-Inferred Errors

When **`errors.llm.enabled`** is true and you call `ammo.throw()` without an explicit status code or message, Tejas uses an LLM to infer an appropriate HTTP status code and message from **code context** — you do not pass an error object. The framework captures the code surrounding the `ammo.throw()` call (with line numbers) and all **upstream** (callers) and **downstream** (code that would have run next) context, and the LLM infers what went wrong from that. Explicit code and message always override.

- **No error object required:** Call `ammo.throw()` with no arguments (or only options). The LLM receives the source code around the call site and upstream call stacks so it can infer status and message from control flow and intent.
- **Opt-in:** Enable via config: `errors.llm.enabled: true` and configure `errors.llm` (baseURL, apiKey, model), or call **`app.withLLMErrors()`** / **`app.withLLMErrors({ baseURL, apiKey, model, messageType })`** before `takeoff()`. See [Configuration](./configuration.md#error-handling-llm-inferred-errors).
- **Framework-caught errors:** When the framework catches an unhandled error (in a handler or middleware), it uses the same `ammo.throw(err)` — so the same `errors.llm` config applies. No separate "log then send response"; one mechanism handles everything.
- **Override:** Whenever you pass a status code or message (e.g. `ammo.throw(404, 'User not found')` or `throw new TejError(404, 'User not found')`), that value is used; the LLM is not called.
- **Message type:** Configure whether the LLM generates **end-user-friendly** or **developer-friendly** messages via `errors.llm.messageType`; override per call (see [Per-call overrides](#per-call-overrides)).
- **Non-production:** In non-production, the LLM can also provide developer insight (e.g. bug vs environment, suggested fix), attached to the response as `_dev` or in logs only — never in production.

### Per-call overrides

For any LLM-eligible `ammo.throw()` call (no explicit status code), you can pass an options object as the last argument to override behaviour for that call only:

- **`useLlm`** (boolean): Set to `false` to skip the LLM for this call and respond with a default 500 / "Internal Server Error" (or the error's message when you pass an Error/string). Set to `true` to force using the LLM (same as default when eligible).
- **`messageType`** (`"endUser"` | `"developer"`): Override the configured default for this call — request an end-user-friendly or developer-friendly message.

```javascript
// Skip LLM for this call; send 500
ammo.throw({ useLlm: false });

// Request a developer-friendly message for this call only
ammo.throw({ messageType: 'developer' });

// When an error was caught and passed in, you can still pass options
ammo.throw(caughtErr, { useLlm: false });
```

### Async mode

By default (`errors.llm.mode: 'sync'`), `ammo.throw()` blocks the HTTP response until the LLM returns. This adds LLM latency (typically 1–3 seconds) to every error response.

Set `errors.llm.mode` to `'async'` to respond immediately with a generic `500 Internal Server Error` and run the LLM inference in the background. The result is dispatched to the configured **channel** once ready — the client never waits.

```bash
# .env
ERRORS_LLM_MODE=async
ERRORS_LLM_CHANNEL=both   # console + log file
```

```javascript
// tejas.config.json
{
  "errors": {
    "llm": {
      "enabled": true,
      "mode": "async",
      "channel": "both"
    }
  }
}
```

In async mode:

- The HTTP response is always `500 Internal Server Error` regardless of what the LLM would infer. The LLM-inferred status and message are only visible in the channel.
- Developer insight (`devInsight`) is **always** included in the channel output, even in production — it never reaches the HTTP response.
- If the LLM call fails or times out in the background, it is silently swallowed. The HTTP response has already been sent.

### Output channels (async mode)

When `mode` is `async`, the LLM result is sent to the configured channel after the response. Set `errors.llm.channel`:

| Channel               | Output                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"console"` (default) | Pretty-printed colored block in the terminal: timestamp, method+path, inferred status, message, dev insight. Shows `[CACHED]` or `[RATE LIMITED]` flags.                                                                        |
| `"log"`               | Appends a JSON line to `errors.llm.logFile` (default `./errors.llm.log`). Each entry contains all fields: timestamp, method, path, statusCode, message, devInsight, original error, code context snippets, cached, rateLimited. |
| `"both"`              | Both console and log file.                                                                                                                                                                                                      |

The log file uses **JSONL format** (one JSON object per line), so it can be read by log analysis tools or Radar.

```bash
ERRORS_LLM_CHANNEL=log
ERRORS_LLM_LOG_FILE=./logs/llm-errors.log
```

### Rate limiting

Set `errors.llm.rateLimit` (default `10`) to cap the number of LLM calls per minute across all requests. This prevents a burst of errors from exhausting your API quota.

```bash
ERRORS_LLM_RATE_LIMIT=20
```

When the rate limit is exceeded:

- **Sync mode**: responds immediately with `500 Internal Server Error` (no LLM call).
- **Async mode**: the channel still receives a dispatch with `rateLimited: true` so the error occurrence is recorded even though LLM enhancement was skipped.

Cached results do **not** count against the rate limit.

### Error caching

By default (`errors.llm.cache: true`), Tejas caches LLM results by throw site and error message. If the same error is thrown at the same file and line, the cached result is reused without making another LLM call.

```bash
ERRORS_LLM_CACHE=true
ERRORS_LLM_CACHE_TTL=3600000   # 1 hour (default)
```

The cache key is: `file:line:errorMessage`. After the TTL expires, the next occurrence triggers a fresh LLM call.

To effectively **only enhance new errors**, keep caching enabled with a long TTL. To re-evaluate errors more frequently, reduce the TTL.

```javascript
// Only enhance errors once per 24 hours
app.withLLMErrors({ cache: true, cacheTTL: 86400000 });
```

---

## TejError Class

Use `TejError` for throwing HTTP errors with status codes. Both status code and message are **optional** when [LLM-inferred errors](#llm-inferred-errors) are enabled and the error is passed through `ammo.throw()`; otherwise, supply them to set the response explicitly.

```javascript
import { TejError } from 'te.js';

// Explicit code and message (always used as override)
throw new TejError(404, 'User not found');
throw new TejError(400, 'Invalid email format');
throw new TejError(500, 'Database connection failed');
```

## Error Response

When an error is thrown, Tejas automatically sends the appropriate HTTP response:

```javascript
throw new TejError(404, 'Resource not found');
```

**Response:**

```
HTTP/1.1 404 Not Found
Content-Type: text/plain

Resource not found
```

## Convenience Methods

`Ammo` provides shortcut methods for common errors:

```javascript
// 404 Not Found
ammo.notFound();

// 405 Method Not Allowed
ammo.notAllowed();

// 401 Unauthorized
ammo.unauthorized();
```

## Using ammo.throw()

For more control, use `ammo.throw()`. When [LLM-inferred errors](#llm-inferred-errors) are enabled, you can omit code and message and the LLM will infer them; otherwise, or when you want to override, pass them explicitly.

```javascript
// Explicit: status code and/or message
ammo.throw(404);
ammo.throw(404, 'User not found');
ammo.throw(new TejError(400, 'Bad request'));

// When errors.llm.enabled: LLM infers code and message from context
ammo.throw(new Error('Something went wrong'));
ammo.throw('Validation failed');
ammo.throw(); // context still used when available
```

See [Ammo — throw()](./ammo.md#throw--send-error-response) for all signatures and the LLM-inferred row.

## Error Handling in Routes

### Basic Pattern

```javascript
target.register('/users/:id', async (ammo) => {
  const { id } = ammo.payload;

  const user = await findUser(id);

  if (!user) {
    throw new TejError(404, 'User not found');
  }

  ammo.fire(user);
});
```

### Try-Catch Pattern

```javascript
target.register('/data', async (ammo) => {
  try {
    const data = await riskyOperation();
    ammo.fire(data);
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      throw new TejError(504, 'Gateway timeout');
    }
    throw new TejError(500, 'Internal server error');
  }
});
```

## Global Error Handling

Errors are automatically caught by Tejas's handler. Enable logging:

```javascript
const app = new Tejas({
  log: {
    exceptions: true, // Log all exceptions
  },
});
```

## Custom Error Middleware

Create middleware to customize error handling:

```javascript
// middleware/error-handler.js
export const errorHandler = (ammo, next) => {
  const originalThrow = ammo.throw.bind(ammo);

  ammo.throw = (...args) => {
    // Log errors
    console.error('Error:', args);

    // Send to error tracking service
    errorTracker.capture(args[0]);

    // Call original throw
    originalThrow(...args);
  };

  next();
};

// Apply globally
app.midair(errorHandler);
```

## Structured Error Responses

For APIs, return structured error objects:

```javascript
// middleware/api-errors.js
export const apiErrorHandler = (ammo, next) => {
  const originalThrow = ammo.throw.bind(ammo);

  ammo.throw = (statusOrError, message) => {
    let status = 500;
    let errorMessage = 'Internal Server Error';
    let errorCode = 'INTERNAL_ERROR';

    if (typeof statusOrError === 'number') {
      status = statusOrError;
      errorMessage = message || getDefaultMessage(status);
      errorCode = getErrorCode(status);
    } else if (statusOrError instanceof TejError) {
      status = statusOrError.code;
      errorMessage = statusOrError.message;
      errorCode = getErrorCode(status);
    }

    ammo.fire(status, {
      error: {
        code: errorCode,
        message: errorMessage,
        status,
      },
    });
  };

  next();
};

function getDefaultMessage(status) {
  const messages = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  };
  return messages[status] || 'Unknown Error';
}

function getErrorCode(status) {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
  };
  return codes[status] || 'UNKNOWN_ERROR';
}
```

**Response:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "status": 404
  }
}
```

## Validation Errors

For input validation, return detailed errors:

```javascript
target.register('/users', (ammo) => {
  if (!ammo.POST) return ammo.notAllowed();

  const { name, email, age } = ammo.payload;
  const errors = [];

  if (!name) errors.push({ field: 'name', message: 'Name is required' });
  if (!email) errors.push({ field: 'email', message: 'Email is required' });
  if (email && !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  if (age && (isNaN(age) || age < 0)) {
    errors.push({ field: 'age', message: 'Age must be a positive number' });
  }

  if (errors.length > 0) {
    return ammo.fire(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors,
      },
    });
  }

  // Process valid data...
});
```

## Async Error Handling

Tejas automatically catches errors in **both sync and async handlers** — including Promise rejections:

```javascript
// ✅ No try-catch needed — errors are caught automatically
target.register('/async', async (ammo) => {
  const data = await fetchData(); // If this throws, Tejas catches it
  ammo.fire(data);
});

// ✅ Multiple await calls? Still no try-catch needed
target.register('/complex', async (ammo) => {
  const user = await getUser(ammo.payload.id);
  const profile = await getProfile(user.profileId);
  const settings = await getSettings(user.id);
  ammo.fire({ user, profile, settings });
});

// 🔧 Use try-catch ONLY when you need custom error handling
target.register('/async-custom', async (ammo) => {
  try {
    const data = await fetchData();
    ammo.fire(data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new TejError(503, 'Service temporarily unavailable');
    }
    throw error; // Re-throw unknown errors (Tejas will still catch it)
  }
});
```

### When You Still Might Want Try-Catch

While Tejas catches all errors automatically, you may want try-catch for:

1. **Custom error mapping** — Convert database errors to user-friendly messages
2. **Retry logic** — Attempt an operation multiple times before failing
3. **Cleanup operations** — Release resources even on failure
4. **Partial success** — Continue processing after non-critical failures

## BodyParserError

`BodyParserError` is a subclass of `TejError` thrown automatically during request body parsing. You do not need to handle these yourself — they are caught by the framework and converted to appropriate HTTP responses.

| Status  | Condition                                                                  |
| ------- | -------------------------------------------------------------------------- |
| **400** | Malformed JSON, invalid URL-encoded data, or corrupted multipart form data |
| **408** | Body parsing timed out (exceeds `body.timeout`, default 30 seconds)        |
| **413** | Request body exceeds `body.max_size` (default 10 MB)                       |
| **415** | Unsupported content type (not JSON, URL-encoded, or multipart)             |

These limits are configured via [Configuration](./configuration.md) (`body.max_size`, `body.timeout`).

Supported content types:

- `application/json`
- `application/x-www-form-urlencoded`
- `multipart/form-data`

## Error Flow

When any error occurs in your handler or middleware, the framework uses the **same** `ammo.throw(err)` you use for intentional errors — one mechanism:

1. The framework's `executeChain()` catches the error
2. If `LOG_EXCEPTIONS` is enabled, the error is logged
3. The error is passed to `ammo.throw(err)` (no separate "send response" step — `ammo.throw()` does it)
4. **TejError** — uses the error's `code` and `message` directly
5. **When errors.llm.enabled** — LLM infers status and message from code context (same as explicit `ammo.throw()`)
6. **Otherwise** — 500 with the error message or string representation
7. `ammo.throw()` sends the HTTP response via `ammo.fire(statusCode, message)`

Once a response has been sent (`res.headersSent` is true), no further middleware or handlers execute.

## Error Codes Reference

| Status | Name                  | When to Use                       |
| ------ | --------------------- | --------------------------------- |
| 400    | Bad Request           | Invalid input, malformed request  |
| 401    | Unauthorized          | Missing or invalid authentication |
| 403    | Forbidden             | Authenticated but not authorized  |
| 404    | Not Found             | Resource doesn't exist            |
| 405    | Method Not Allowed    | HTTP method not supported         |
| 409    | Conflict              | Resource conflict (duplicate)     |
| 413    | Payload Too Large     | Request body too large            |
| 422    | Unprocessable Entity  | Valid syntax but semantic errors  |
| 429    | Too Many Requests     | Rate limit exceeded               |
| 500    | Internal Server Error | Unexpected server errors          |
| 502    | Bad Gateway           | Upstream server error             |
| 503    | Service Unavailable   | Server temporarily unavailable    |
| 504    | Gateway Timeout       | Upstream server timeout           |

## Best Practices

1. **Use appropriate status codes** — Don't return 500 for client errors
2. **Provide useful messages** — Help developers debug issues
3. **Don't expose internals** — Hide stack traces in production
4. **Log errors** — Enable exception logging for debugging
5. **Be consistent** — Use the same error format throughout your API
6. **Validate early** — Check input before processing
7. **Use TejError or ammo.throw(code, message)** — For HTTP-specific errors when you want explicit control
8. **Opt in to LLM-inferred errors when helpful** — Enable via `errors.llm.enabled` in config or **`app.withLLMErrors(config?)`** before `takeoff()`, then configure baseURL, apiKey, and model so you can throw without specifying code or message and let the LLM infer them; see [Configuration](./configuration.md#error-handling-llm-inferred-errors)
