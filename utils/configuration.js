import * as fs from 'fs';

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
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        standardObj[key.toUpperCase()] = standardizeObj(value);
      } else {
        standardObj[key.toUpperCase()] = value;
      }
    }
  }

  return standardObj;
};
const flattenObject = (obj, prefix = '') => {
  let flattened = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix.length ? `${prefix}_${key}` : key; // Create a new key
      const value = obj[key];
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        Object.assign(flattened, flattenObject(value, newKey));
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
