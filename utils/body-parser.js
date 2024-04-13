import formidable from 'formidable';

async function parseDataBasedOnContentType(req) {
  // Check if content type is JSON
  if (req.headers['content-type'] === 'application/json') {
    return await parseJSONRequestBody(req);
  }

  // Check if content type is URL encoded
  if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
    return await parseUrlEncodedData(req);
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

function parseMultiPartData(req) {
  return new Promise(async (resolve, reject) => {
    const form = formidable({});
    let fields;
    let files;
    try {
      [fields, files] = await form.parse(req);
      resolve({ fields, files });
    } catch (err) {
      reject(err);
    }
  });
}

export default parseDataBasedOnContentType;
