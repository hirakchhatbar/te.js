import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import TejLogger from 'tej-logger';

const logger = new TejLogger('RedisAutoInstall');

/**
 * Checks whether the `redis` npm package is available in the consuming
 * project's package.json and node_modules.
 *
 * @returns {{ needsInstall: boolean, reason: string }}
 */
export function checkRedisInstallation() {
  const cwd = process.cwd();

  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    return {
      needsInstall: true,
      reason: 'No package.json found in project root',
    };
  }

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return { needsInstall: true, reason: 'Unable to read package.json' };
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const inPkgJson = 'redis' in deps;

  const modulePath = join(cwd, 'node_modules', 'redis');
  const inNodeModules = existsSync(modulePath);

  if (inPkgJson && inNodeModules) {
    return { needsInstall: false, reason: 'redis is already installed' };
  }

  if (inPkgJson && !inNodeModules) {
    return {
      needsInstall: true,
      reason: 'redis is in package.json but not installed',
    };
  }

  return { needsInstall: true, reason: 'redis is not in package.json' };
}

/**
 * Synchronously installs the `redis` npm package into the consuming project.
 * Throws if the installation fails.
 */
export function installRedisSync() {
  logger.info('Installing redis package …');
  try {
    execSync('npm install redis', {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 60_000,
    });
    logger.info('redis package installed successfully.');
  } catch (err) {
    throw new Error(
      `Failed to auto-install redis package. Install it manually with: npm install redis\n${err.message}`,
    );
  }
}
