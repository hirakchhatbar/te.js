import os from 'os';

const UNITS = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
};

function parseSizeString(sizeStr) {
  if (typeof sizeStr !== 'string') {
    throw new Error('Cache size must be a string');
  }

  const trimmed = sizeStr.trim().toUpperCase();

  // Percent format (e.g., "25%")
  if (trimmed.endsWith('%')) {
    const percent = parseFloat(trimmed.slice(0, -1));
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      throw new Error('Invalid percentage size format');
    }
    const totalMemory = os.totalmem();
    return Math.floor((percent / 100) * totalMemory);
  }

  // Absolute size format (e.g., "100KB", "1.5GB")
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
 * @param {string} sizeString - A size string like "100MB", "25%", etc.
 * @returns {number} - Size in bytes
 */
export function getMaxCacheSizeInBytes(sizeString) {
  return parseSizeString(sizeString);
}
