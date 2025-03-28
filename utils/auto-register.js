import fs from 'node:fs/promises';
import path from 'path';

const findTargetFiles = async () => {
  if (!process.env.DIR_TARGETS) return;
  const fullPath = path.join(process.cwd(), process.env.DIR_TARGETS);
  const directory = await fs.readdir(fullPath, {
    withFileTypes: true,
    recursive: true,
  });

  return directory.filter(
    (file) => file.isFile() && file.name.endsWith('target.js'),
  );
};

export { findTargetFiles };
