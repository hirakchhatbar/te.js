import { env } from 'tej-env';

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
          throw new Error('Invalid JSON structure');
        }
        resolve(jsonData);
      } catch (err) {
        reject(new BodyParserError(`Invalid JSON: ${err.message}`, 400));
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
          throw new Error('Missing boundary in content-type');
        }

        const boundary = '--' + (boundaryMatch[1] || boundaryMatch[2]);
        const parts = body
          .split(boundary)
          .filter((part) => part.trim() !== '' && part.trim() !== '--');

        const parsedData = parts.map((part) => {
          const [headerString, ...contentParts] = part.split('\r\n\r\n');
          if (!headerString || contentParts.length === 0) {
            throw new Error('Malformed multipart part');
          }

          const headers = {};
          const headerLines = headerString.trim().split('\r\n');

          headerLines.forEach((line) => {
            const [key, ...valueParts] = line.split(': ');
            if (!key || valueParts.length === 0) {
              throw new Error('Malformed header');
            }
            headers[key.toLowerCase()] = valueParts.join(': ');
          });

          const value = contentParts.join('\r\n\r\n').replace(/\r\n$/, '');

          // Parse content-disposition
          const disposition = headers['content-disposition'];
          if (!disposition) {
            throw new Error('Missing content-disposition header');
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

class BodyParserError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'BodyParserError';
    this.statusCode = statusCode;
  }
}

export { BodyParserError };
export default parseDataBasedOnContentType;
