import { EventEmitter } from 'node:events';

/**
 * Mock HTTP IncomingMessage (request) object
 * Simulates Node.js http.IncomingMessage for testing
 */
export class MockRequest extends EventEmitter {
  constructor(options = {}) {
    super();

    this.method = options.method || 'GET';
    this.url = options.url || '/';
    this.headers = options.headers || {};
    this.httpVersion = options.httpVersion || '1.1';
    this.socket = options.socket || {
      remoteAddress: options.ip || '127.0.0.1',
      encrypted: options.encrypted || false,
    };

    // Body handling
    this._body = options.body || '';
    this._bodyChunks = [];

    // Connection info
    this.connection = this.socket;

    // Normalize headers to lowercase
    this.headers = Object.keys(this.headers).reduce((acc, key) => {
      acc[key.toLowerCase()] = this.headers[key];
      return acc;
    }, {});
  }

  /**
   * Simulate incoming data by emitting chunks
   */
  simulateBody(body) {
    if (typeof body === 'string') {
      this.emit('data', Buffer.from(body));
    } else if (Buffer.isBuffer(body)) {
      this.emit('data', body);
    } else if (typeof body === 'object') {
      this.emit('data', Buffer.from(JSON.stringify(body)));
    }
    this.emit('end');
  }

  /**
   * Immediately emit body data (for sync tests)
   */
  pipe(destination) {
    if (this._body) {
      destination.write(this._body);
    }
    return destination;
  }
}

/**
 * Mock HTTP ServerResponse (response) object
 * Simulates Node.js http.ServerResponse for testing
 */
export class MockResponse extends EventEmitter {
  constructor() {
    super();

    this.statusCode = 200;
    this.statusMessage = '';
    this.headers = {};
    this._body = '';
    this._chunks = [];

    // Response state flags
    this.headersSent = false;
    this.writableEnded = false;
    this.finished = false;
  }

  /**
   * Set response status code and headers
   */
  writeHead(statusCode, statusMessage, headers) {
    if (this.headersSent) {
      throw new Error('Headers already sent');
    }

    this.statusCode = statusCode;

    // Handle optional statusMessage
    if (typeof statusMessage === 'object') {
      headers = statusMessage;
      statusMessage = '';
    }

    this.statusMessage = statusMessage || '';

    if (headers) {
      Object.keys(headers).forEach((key) => {
        this.headers[key.toLowerCase()] = headers[key];
      });
    }

    this.headersSent = true;
    return this;
  }

  /**
   * Set a single header
   */
  setHeader(name, value) {
    if (this.headersSent) {
      throw new Error('Headers already sent');
    }
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  /**
   * Get a header value
   */
  getHeader(name) {
    return this.headers[name.toLowerCase()];
  }

  /**
   * Remove a header
   */
  removeHeader(name) {
    delete this.headers[name.toLowerCase()];
  }

  /**
   * Check if a header has been set
   */
  hasHeader(name) {
    return name.toLowerCase() in this.headers;
  }

  /**
   * Write data to response body
   */
  write(chunk, encoding, callback) {
    if (this.writableEnded) {
      throw new Error('Write after end');
    }

    if (chunk !== undefined && chunk !== null && chunk !== '') {
      this._chunks.push(chunk);
      this._body += typeof chunk === 'string' ? chunk : chunk.toString();
    }

    if (typeof encoding === 'function') {
      callback = encoding;
    }

    if (typeof callback === 'function') {
      callback();
    }

    return true;
  }

  /**
   * End the response
   */
  end(data, encoding, callback) {
    if (this.writableEnded) {
      return this;
    }

    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    } else if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }

    if (data !== undefined && data !== null && data !== '') {
      this.write(data, encoding);
    }

    this.writableEnded = true;
    this.finished = true;

    this.emit('finish');

    if (typeof callback === 'function') {
      callback();
    }

    return this;
  }

  /**
   * Get the response body as a string
   */
  getBody() {
    return this._body;
  }

  /**
   * Get the response body parsed as JSON
   */
  getJsonBody() {
    try {
      return JSON.parse(this._body);
    } catch {
      return null;
    }
  }

  /**
   * Reset the response for reuse
   */
  reset() {
    this.statusCode = 200;
    this.statusMessage = '';
    this.headers = {};
    this._body = '';
    this._chunks = [];
    this.headersSent = false;
    this.writableEnded = false;
    this.finished = false;
  }
}

/**
 * Create a mock request with common defaults
 */
export function createMockRequest(options = {}) {
  const defaults = {
    method: 'GET',
    url: '/',
    headers: {
      host: 'localhost:3000',
      'user-agent': 'test-agent',
      accept: '*/*',
    },
    ip: '127.0.0.1',
  };

  return new MockRequest({ ...defaults, ...options });
}

/**
 * Create a mock response
 */
export function createMockResponse() {
  return new MockResponse();
}

/**
 * Create a mock request/response pair
 */
export function createMockPair(requestOptions = {}) {
  return {
    req: createMockRequest(requestOptions),
    res: createMockResponse(),
  };
}

/**
 * Create a JSON request with proper headers
 */
export function createJsonRequest(options = {}) {
  return createMockRequest({
    ...options,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Create a form-urlencoded request with proper headers
 */
export function createFormRequest(options = {}) {
  return createMockRequest({
    method: 'POST',
    ...options,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });
}

/**
 * Create a multipart form-data request with proper headers
 */
export function createMultipartRequest(boundary, options = {}) {
  return createMockRequest({
    method: 'POST',
    ...options,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      ...options.headers,
    },
  });
}

/**
 * Helper to create multipart form body
 */
export function createMultipartBody(boundary, fields = [], files = []) {
  let body = '';

  // Add regular fields
  for (const field of fields) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${field.name}"\r\n\r\n`;
    body += `${field.value}\r\n`;
  }

  // Add files
  for (const file of files) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\n`;
    body += `Content-Type: ${file.contentType || 'application/octet-stream'}\r\n\r\n`;
    body += `${file.content}\r\n`;
  }

  body += `--${boundary}--\r\n`;
  return body;
}

export default {
  MockRequest,
  MockResponse,
  createMockRequest,
  createMockResponse,
  createMockPair,
  createJsonRequest,
  createFormRequest,
  createMultipartRequest,
  createMultipartBody,
};
