import status from 'statuses';
import { getResponseConfig } from '../../utils/response-config.js';

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

/**
 * Apply response structure envelope when enabled.
 * 2xx → { [successKey]: data }; 4xx/5xx → { [errorKey]: data }; 204 and when disabled → pass through.
 * @param {number} statusCode
 * @param {unknown} data
 * @returns {unknown}
 */
const applyResponseStructure = (statusCode, data) => {
  const { enabled, successKey, errorKey } = getResponseConfig();
  if (!enabled) return data;
  if (statusCode === 204) return data;
  if (statusCode >= 200 && statusCode < 300) {
    return { [successKey]: data };
  }
  if (statusCode >= 400) {
    return { [errorKey]: data };
  }
  return data;
};

const statusAndData = (args) => {
  let statusCode;
  let rawData;
  let customContentType = null;

  // Handle no arguments
  if (!args || args.length === 0) {
    statusCode = 204;
    rawData = status(204);
  } else if (args.length === 1) {
    const arg = args[0];

    // If it's a number, treat as status code
    if (typeof arg === 'number') {
      statusCode = arg;
      rawData = status(arg) || String(arg);
    } else {
      // Otherwise treat as data
      statusCode = 200;
      rawData = arg;
    }
  } else {
    // Handle multiple arguments
    statusCode = 200;
    rawData = args[0];

    if (typeof args[0] === 'number') {
      statusCode = args[0];
      rawData = args[1];
    } else if (typeof args[1] === 'number') {
      statusCode = args[1];
    }

    if (rawData === undefined) {
      rawData = status[statusCode] || String(statusCode);
    }

    customContentType = args.length > 2 ? args[2] : null;
  }

  const wrapped = applyResponseStructure(statusCode, rawData);

  return {
    statusCode,
    data: formattedData(wrapped),
    contentType: customContentType || contentType(wrapped),
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
