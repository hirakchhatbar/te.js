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
      const upperKey = key.toUpperCase();

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        if (key === 'db' || upperKey === 'DB') {
          // Special handling for database configurations
          // Keep the database type key in lowercase but uppercase its properties
          standardObj[upperKey] = Object.entries(value).reduce(
            (acc, [dbType, dbConfig]) => {
              acc[dbType.toLowerCase()] = keysToUpperCase(dbConfig);
              return acc;
            },
            {},
          );
        } else {
          standardObj[upperKey] = keysToUpperCase(value);
        }
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
      const newKey = prefix.length ? `${prefix}_${key}` : key;
      const value = obj[key];

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        if (key === 'DB' || key.startsWith('DB_')) {
          // Keep database configurations nested
          flattened[newKey] = value;
        } else {
          Object.assign(flattened, flattenObject(value, newKey));
        }
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
