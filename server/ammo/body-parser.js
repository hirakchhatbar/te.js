import { env } from 'tej-env';
import TejError from '../error.js';

async function parseDataBasedOnContentType(req) {
  // Validate content-type header exists
  if (!req.headers['content-type']) {
    throw new BodyParserError('Content-Type header is missing', 400);
  }

  const contentType = req.headers['content-type'].toLowerCase();

  // Check if content type is JSON
  if (contentType === 'application/json') {
    return await parseJSONRequestBody(req);
  }

  // Check if content type is URL encoded
  if (contentType === 'application/x-www-form-urlencoded') {
    return await parseUrlEncodedData(req);
  }

  // Check if content type is multipart form data
  if (contentType.startsWith('multipart/form-data')) {
    return await parseFormData(req);
  }

  throw new BodyParserError(`Unsupported content type: ${contentType}`, 415);
}

function parseJSONRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    const maxSize = env('BODY_MAX_SIZE');
    const timeout = setTimeout(() => {
      reject(new BodyParserError('Request timeout', 408));
    }, env('BODY_TIMEOUT'));

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        clearTimeout(timeout);
        reject(new BodyParserError('Request entity too large', 413));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(new BodyParserError(`Request error: ${err.message}`, 400));
    });

    req.on('end', () => {
      clearTimeout(timeout);
      try {
        if (!body) {
          resolve({});
          return;
        }
        const jsonData = JSON.parse(body);
        if (typeof jsonData !== 'object') {
          throw new TejError(400, 'Invalid JSON structure');
        }
        resolve(jsonData);
      } catch (err) {
        reject(new TejError(400, `Invalid JSON: ${err.message}`));
      }
    });
  });
}

function parseUrlEncodedData(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    const maxSize = env('BODY_MAX_SIZE');
    const timeout = setTimeout(() => {
      reject(new BodyParserError('Request timeout', 408));
    }, env('BODY_TIMEOUT'));

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        clearTimeout(timeout);
        reject(new BodyParserError('Request entity too large', 413));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(new BodyParserError(`Request error: ${err.message}`, 400));
    });

    req.on('end', () => {
      clearTimeout(timeout);
      try {
        if (!body) {
          resolve({});
          return;
        }
        const data = new URLSearchParams(body);
        const parsedData = Object.fromEntries(data);
        resolve(parsedData);
      } catch (err) {
        reject(new BodyParserError('Invalid URL encoded data', 400));
      }
    });
  });
}

function parseFormData(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    const maxSize = env('BODY_MAX_SIZE');
    const timeout = setTimeout(() => {
      reject(new BodyParserError('Request timeout', 408));
    }, env('BODY_TIMEOUT'));

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        clearTimeout(timeout);
        reject(new BodyParserError('Request entity too large', 413));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(new BodyParserError(`Request error: ${err.message}`, 400));
    });

    req.on('end', () => {
      clearTimeout(timeout);
      try {
        if (!body.trim()) {
          resolve([]);
          return;
        }

        const contentType = req.headers['content-type'];
        const boundaryMatch = contentType.match(
          /boundary=(?:"([^"]+)"|([^;]+))/i,
        );

        if (!boundaryMatch) {
          throw new TejError(400, 'Missing boundary in content-type');
        }

        const boundary = '--' + (boundaryMatch[1] || boundaryMatch[2]);
        const parts = body
          .split(boundary)
          .filter((part) => part.trim() !== '' && part.trim() !== '--');

        const parsedData = parts.map((part) => {
          const [headerString, ...contentParts] = part.split('\r\n\r\n');
          if (!headerString || contentParts.length === 0) {
            throw new TejError(400, 'Malformed multipart part');
          }

          const headers = {};
          const headerLines = headerString.trim().split('\r\n');

          headerLines.forEach((line) => {
            const [key, ...valueParts] = line.split(': ');
            if (!key || valueParts.length === 0) {
              throw new TejError(400, 'Malformed header');
            }
            headers[key.toLowerCase()] = valueParts.join(': ');
          });

          const value = contentParts.join('\r\n\r\n').replace(/\r\n$/, '');

          // Parse content-disposition
          const disposition = headers['content-disposition'];
          if (!disposition) {
            throw new TejError(400, 'Missing content-disposition header');
          }

          const nameMatch = disposition.match(/name="([^"]+)"/);
          const filename = disposition.match(/filename="([^"]+)"/);

          return {
            name: nameMatch ? nameMatch[1] : undefined,
            filename: filename ? filename[1] : undefined,
            headers,
            value,
          };
        });

        resolve(parsedData);
      } catch (err) {
        reject(
          new BodyParserError(
            `Invalid multipart form data: ${err.message}`,
            400,
          ),
        );
      }
    });
  });
}

class BodyParserError extends TejError {
  constructor(message, statusCode = 400) {
    super(statusCode, message);
    this.name = 'BodyParserError';
  }
}

export { BodyParserError };
export default parseDataBasedOnContentType;
