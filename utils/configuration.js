/**
 * @fileoverview Configuration loading and normalization utilities.
 *
 * Loads `tejas.config.json` from `process.cwd()` and provides helpers to
 * standardize and flatten config objects so they can be merged with env vars
 * and constructor options.
 */

import * as fs from 'node:fs';
import { getAllEnv } from 'tej-env';

/**
 * Asynchronously read and parse `tejas.config.json` from the current working directory.
 * Returns an empty null-prototype object if the file is missing or unreadable.
 *
 * @returns {Promise<Object>} Parsed config object (may be empty)
 */
const loadConfigFile = async () => {
  try {
    const data = await fs.promises.readFile('tejas.config.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return Object.create(null);
  }
};

const keysToUpperCase = (obj) => {
  if (!obj) return Object.create(null);
  const standardObj = Object.create(null);

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      const upperKey = key.toUpperCase();

      if (typeof value === 'object' && value !== null) {
        standardObj[upperKey] = keysToUpperCase(value);
      } else {
        standardObj[upperKey] = value;
      }
    }
  }

  return standardObj;
};

const flattenObject = (obj, prefix = '') => {
  let flattened = Object.create(null);

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0
      ) {
        const nested = flattenObject(value, newKey);
        Object.assign(flattened, nested);
      } else {
        flattened[newKey] = value;
      }
    }
  }
  return flattened;
};

const standardizeObj = (obj) => {
  let standardObj = obj;
  standardObj = keysToUpperCase(standardObj);
  standardObj = flattenObject(standardObj);
  return standardObj;
};

export { loadConfigFile, standardizeObj };
