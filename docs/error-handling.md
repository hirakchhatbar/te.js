# Error Handling

Tejas provides robust error handling to keep your application running even when unexpected errors occur.

## TejError Class

Use `TejError` for throwing HTTP errors with status codes:

```javascript
import { TejError } from 'te.js';

// Throw a 404 error
throw new TejError(404, 'User not found');

// Throw a 400 error
throw new TejError(400, 'Invalid email format');

// Throw a 500 error
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

For more control, use `ammo.throw()`:

```javascript
// Just status code (uses default message)
ammo.throw(404);

// Status code with message
ammo.throw(404, 'User not found');

// Error object
ammo.throw(new Error('Something went wrong'));

// TejError
ammo.throw(new TejError(400, 'Bad request'));
```

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
    exceptions: true // Log all exceptions
  }
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
        status
      }
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
    500: 'Internal Server Error'
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
    500: 'INTERNAL_ERROR'
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
        details: errors
      }
    });
  }
  
  // Process valid data...
});
```

## Async Error Handling

Tejas automatically catches errors in async handlers:

```javascript
// No try-catch needed for basic cases
target.register('/async', async (ammo) => {
  const data = await fetchData(); // If this throws, Tejas catches it
  ammo.fire(data);
});

// For custom error handling, use try-catch
target.register('/async-custom', async (ammo) => {
  try {
    const data = await fetchData();
    ammo.fire(data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new TejError(503, 'Service temporarily unavailable');
    }
    throw error; // Re-throw unknown errors
  }
});
```

## Error Codes Reference

| Status | Name | When to Use |
|--------|------|-------------|
| 400 | Bad Request | Invalid input, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | Resource conflict (duplicate) |
| 413 | Payload Too Large | Request body too large |
| 422 | Unprocessable Entity | Valid syntax but semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server errors |
| 502 | Bad Gateway | Upstream server error |
| 503 | Service Unavailable | Server temporarily unavailable |
| 504 | Gateway Timeout | Upstream server timeout |

## Best Practices

1. **Use appropriate status codes** — Don't return 500 for client errors
2. **Provide useful messages** — Help developers debug issues
3. **Don't expose internals** — Hide stack traces in production
4. **Log errors** — Enable exception logging for debugging
5. **Be consistent** — Use the same error format throughout your API
6. **Validate early** — Check input before processing
7. **Use TejError** — For HTTP-specific errors with status codes

