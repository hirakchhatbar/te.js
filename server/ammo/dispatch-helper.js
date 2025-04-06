import status from 'statuses';

const formattedData = (data) => {
  if (data === null || data === undefined) return '';

  if (typeof data === 'object') {
    try {
      return JSON.stringify(data);
    } catch (error) {
      return String(data);
    }
  }

  if (typeof data === 'string') return data;
  if (typeof data === 'number') return status[data] || String(data);

  return String(data);
};

const statusAndData = (args) => {
  // Handle no arguments
  if (!args || args.length === 0) {
    return {
      statusCode: 204,
      data: status(204),
      contentType: 'text/plain',
    };
  }

  // Handle single argument
  if (args.length === 1) {
    const arg = args[0];

    // If it's a number, treat as status code
    if (typeof arg === 'number') {
      return {
        statusCode: arg,
        data: status(arg) || String(arg),
        contentType: 'text/plain',
      };
    }

    // Otherwise treat as data
    return {
      statusCode: 200,
      data: formattedData(arg),
      contentType: contentType(arg),
    };
  }

  // Handle multiple arguments
  let statusCode = 200;
  let data = args[0];

  // If first argument is a number, treat as status code
  if (typeof args[0] === 'number') {
    statusCode = args[0];
    data = args[1];
  } else {
    // If first argument is not a number, check if second is
    if (typeof args[1] === 'number') {
      statusCode = args[1];
    }
  }

  // If data is undefined, use status message
  if (data === undefined) {
    data = status[statusCode] || String(statusCode);
  }

  // If third argument is provided, it's the content type
  const customContentType = args.length > 2 ? args[2] : null;

  return {
    statusCode,
    data: formattedData(data),
    contentType: customContentType || contentType(data),
  };
};

const contentType = (data) => {
  if (data === null || data === undefined) return 'text/plain';

  switch (typeof data) {
    case 'object':
      return 'application/json';
    case 'string':
      // Check if string is HTML
      if (
        data.trim().toLowerCase().startsWith('<!DOCTYPE') ||
        data.trim().toLowerCase().startsWith('<html')
      ) {
        return 'text/html';
      }
      return 'text/plain';
    case 'number':
      return 'text/plain';
    default:
      return 'text/plain';
  }
};

export { statusAndData, contentType, formattedData };
