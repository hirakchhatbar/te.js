import os from 'os';

/**
 * Constants for memory unit conversions.
 * @constant
 */
const UNITS = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
};

/**
 * Parses a size string into bytes.
 * Supports two formats:
 * 1. Percentage of total system memory: "25%"
 * 2. Absolute size with units: "100MB", "1.5GB", etc.
 *
 * Supported units:
 * - B (Bytes)
 * - KB (Kilobytes, 1024 bytes)
 * - MB (Megabytes, 1024^2 bytes)
 * - GB (Gigabytes, 1024^3 bytes)
 *
 * @param {string} sizeStr - The size string to parse (e.g., "100MB", "25%")
 * @returns {number} - The size in bytes
 * @throws {Error} - If the size string is invalid
 * @private
 */
function parseSizeString(sizeStr) {
  if (typeof sizeStr !== 'string') {
    throw new Error('Cache size must be a string');
  }

  const trimmed = sizeStr.trim().toUpperCase();

  // Handle percentage format (e.g., "25%")
  if (trimmed.endsWith('%')) {
    const percent = parseFloat(trimmed.slice(0, -1));
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      throw new Error('Invalid percentage size format');
    }
    const totalMemory = os.totalmem();
    return Math.floor((percent / 100) * totalMemory);
  }

  // Handle absolute size format (e.g., "100KB", "1.5GB")
  const match = trimmed.match(/^([\d.]+)\s*(B|KB|MB|GB)$/);
  if (!match) {
    throw new Error(
      'Invalid size format. Use formats like "100MB", "25%", etc.',
    );
  }

  const value = parseFloat(match[1]);
  const unit = match[2];

  if (isNaN(value) || !UNITS[unit]) {
    throw new Error('Invalid numeric size or unit');
  }

  return Math.floor(value * UNITS[unit]);
}

/**
 * Converts a size string to bytes.
 *
 * @param {string} sizeString - A size string like "100MB", "25%", etc.
 * @returns {number} - Size in bytes
 * @throws {Error} - If the size string is invalid
 */
export function getMaxCacheSizeInBytes(sizeString) {
  return parseSizeString(sizeString);
}
