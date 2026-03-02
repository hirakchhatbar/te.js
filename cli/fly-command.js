/**
 * `tejas fly` — start the Tejas server by running the user's entry point.
 * Entry point is resolved in order: CLI arg → tejas.config.json "entry" → package.json "main" → index.js → app.js → server.js
 */

import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { loadConfigFile } from '../utils/configuration.js';

const CONVENTION_FILES = ['index.js', 'app.js', 'server.js'];

function resolveEntryPoint(cliArg) {
  const cwd = process.cwd();

  if (cliArg) {
    const candidate = path.isAbsolute(cliArg) ? cliArg : path.join(cwd, cliArg);
    if (fs.existsSync(candidate)) return candidate;
    throw new Error(`Entry file not found: ${cliArg}`);
  }

  const config = loadConfigFile();
  if (config.entry) {
    const candidate = path.join(cwd, config.entry);
    if (fs.existsSync(candidate)) return candidate;
    throw new Error(`Entry file from tejas.config.json not found: ${config.entry}`);
  }

  try {
    const pkgPath = path.join(cwd, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.main) {
      const candidate = path.join(cwd, pkg.main);
      if (fs.existsSync(candidate)) return candidate;
      throw new Error(`Entry file from package.json "main" not found: ${pkg.main}`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      // no package.json, continue to convention
    } else {
      throw err;
    }
  }

  for (const name of CONVENTION_FILES) {
    const candidate = path.join(cwd, name);
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Could not resolve entry point. Set "entry" in tejas.config.json, "main" in package.json, pass a file (tejas fly <file>), or add index.js, app.js, or server.js in ${cwd}`,
  );
}

/**
 * Resolves the entry point and spawns the server process. Exits with the child's exit code.
 */
export function runFlyCommand() {
  const cliArg = process.argv[3]; // tejas fly [file]
  const entryFile = resolveEntryPoint(cliArg);

  const child = spawn(process.execPath, [entryFile], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}
