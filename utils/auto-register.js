import fs from 'fs';

const findTargetFiles = (cb) => {
  if (!process.env.DIR_TARGETS) return;

  const fullPath = `${process.cwd()}\\${process.env.DIR_TARGETS}`;

  // Check if fullPath is valid and directory exists
  if (!fs.existsSync(fullPath)) {
    cb(undefined, `Directory ${fullPath} does not exist.`);
    return;
  }

  const files = fs.readdirSync(fullPath, {
    withFileTypes: true,
    recursive: true,
  });

  const targetFiles = files.filter(
    (file) => file.isFile() && file.name.endsWith('target.js'),
  );

  return cb(targetFiles, undefined);
};

export { findTargetFiles };
