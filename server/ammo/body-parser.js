async function parseDataBasedOnContentType(req) {
  // Check if content type is JSON
  if (req.headers['content-type'] === 'application/json') {
    return await parseJSONRequestBody(req);
  }

  // Check if content type is URL encoded
  if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
    return await parseUrlEncodedData(req);
  }

  // Check if content type is multipart form data
  if (req.headers['content-type']?.startsWith('multipart/form-data')) {
    return await parseFormData(req);
  }

  return null;
}

function parseJSONRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const jsonData = JSON.parse(body);
        resolve(jsonData); // Resolve promise with the parsed JSON
      } catch (err) {
        reject(new Error('Invalid JSON')); // Reject promise if JSON parsing fails
      }
    });
  });
}

function parseUrlEncodedData(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const data = new URLSearchParams(body);
      const parsedData = Object.fromEntries(data);
      resolve(parsedData);
    });
  });
}

function parseFormData(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    let files = [];
    let fields = [];

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      // Detect and parse multipart form data
      if (req.headers['content-type'].startsWith('multipart/form-data')) {
        const boundary =
          '--' + req.headers['content-type'].split('boundary=')[1];
        const parts = body
          .split(boundary)
          .filter((part) => part.trim() !== '' && part.trim() !== '--');

        const parsedData = parts.map((part) => {
          const partData = part.split('\r\n\r\n');
          const headersPart = partData[0].trim().split('\r\n');
          const valuePart = partData[1].trim();
          let headers = {};

          headersPart.forEach((header) => {
            const [key, value] = header.split(': ');
            headers[key.toLowerCase()] = value;
          });
          return { headers, value: valuePart };
        });

        resolve(parsedData);
      }
    });
  });
}

export default parseDataBasedOnContentType;
