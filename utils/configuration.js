import * as fs from 'fs';
import { getAllEnv } from 'tej-env';

const loadConfigFile = () => {
  try {
    const data = fs.readFileSync('tejas.config.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};

const keysToUpperCase = (obj) => {
  if (!obj) return {};
  const standardObj = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
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
  let flattened = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
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
