import TejLogger from 'tej-logger';

const logger = new TejLogger('PathValidator');

const standardizePath = (path) => {
  if (!path || path.length === 0) return '';

  let standardized = path.startsWith('/') ? path : `/${path}`;
  return standardized.endsWith('/') ? standardized.slice(0, -1) : standardized;
};

const isPathValid = (path) => {
  if (typeof path !== 'string') {
    logger.error(`Path ${path} should be a string. Skipping...`);
    return false;
  }

  return true;
};

export { isPathValid, standardizePath };
