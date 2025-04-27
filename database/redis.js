import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import TejError from '../server/error.js';
import TejLogger from 'tej-logger';
import { pathToFileURL } from 'node:url';

const packageJsonPath = path.join(process.cwd(), 'package.json');
const packagePath = `${process.cwd()}/node_modules/redis/dist/index.js`;

const logger = new TejLogger('RedisConnectionManager');

function checkRedisInstallation() {
  try {
    // Check if redis exists in package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const inPackageJson = !!packageJson.dependencies?.redis;

    // Check if redis exists in node_modules
    const inNodeModules = fs.existsSync(packagePath);

    return {
      needsInstall: !inPackageJson || !inNodeModules,
      reason: !inPackageJson
        ? 'not in package.json'
        : !inNodeModules
          ? 'not in node_modules'
          : null,
    };
  } catch (error) {
    logger.error(error, true);
    return { needsInstall: true, reason: 'error checking installation' };
  }
}

function installRedisSync() {
  const spinner = ['|', '/', '-', '\\'];
  let current = 0;
  let intervalId;

  try {
    const { needsInstall, reason } = checkRedisInstallation();

    if (!needsInstall) {
      return true;
    }

    // Start the spinner
    intervalId = setInterval(() => {
      process.stdout.write(`\r${spinner[current]} Installing redis...`);
      current = (current + 1) % spinner.length;
    }, 100);

    logger.info(`Tejas will install redis (${reason})...`);

    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(command, ['install', 'redis'], {
      stdio: 'inherit',
      shell: true,
    });

    process.stdout.write('\r');
    clearInterval(intervalId);

    if (result.status === 0) {
      logger.info('Redis installed successfully');
      return true;
    } else {
      logger.error('Redis installation failed');
      return false;
    }
  } catch (error) {
    if (intervalId) {
      process.stdout.write('\r');
      clearInterval(intervalId);
    }
    logger.error(error, true);
    return false;
  }
}

/**
 * Create a new Redis client or cluster
 * @param {Object} config - Redis configuration
 * @param {boolean} [config.isCluster=false] - Whether to use Redis Cluster
 * @param {Object} [config.options={}] - Additional Redis options
 * @returns {Promise<RedisClient|RedisCluster>} Redis client or cluster instance
 */
async function createConnection(config) {
  const { needsInstall } = checkRedisInstallation();

  if (needsInstall) {
    const installed = installRedisSync();
    if (!installed) {
      throw new TejError(500, 'Failed to install required redis package');
    }
  }

  const { isCluster = false, options = {} } = config;
  let client;

  try {
    const { createClient, createCluster } = await import(
      pathToFileURL(packagePath)
    );

    if (isCluster) {
      client = createCluster({
        ...options,
      });
    } else {
      client = createClient({
        ...options,
      });
    }

    let connectionTimeout;
    let hasConnected = false;
    let connectionAttempts = 0;
    const maxRetries = options.maxRetries || 3;

    // Create a promise that will resolve when connected or reject on fatal errors
    const connectionPromise = new Promise((resolve, reject) => {
      connectionTimeout = setTimeout(() => {
        if (!hasConnected) {
          client.quit().catch(() => {});
          reject(new TejError(500, 'Redis connection timeout'));
        }
      }, options.connectTimeout || 10000);

      client.on('error', (err) => {
        logger.error(`Redis connection error: ${err}`, true);
        if (!hasConnected && connectionAttempts >= maxRetries) {
          clearTimeout(connectionTimeout);
          client.quit().catch(() => {});
          reject(
            new TejError(
              500,
              `Redis connection failed after ${maxRetries} attempts: ${err.message}`,
            ),
          );
        }
        connectionAttempts++;
      });

      client.on('connect', () => {
        hasConnected = true;
        clearTimeout(connectionTimeout);
        logger.info(
          `Redis connected on ${client?.options?.url ?? client?.options?.socket?.host}`,
        );
      });

      client.on('ready', () => {
        logger.info('Redis ready');
        resolve(client);
      });

      client.on('end', () => {
        logger.info('Redis connection closed');
      });
    });

    await client.connect();
    await connectionPromise;

    return client;
  } catch (error) {
    if (client) {
      try {
        await client.quit();
      } catch (quitError) {
        logger.error(
          `Error while cleaning up Redis connection: ${quitError}`,
          true,
        );
      }
    }
    logger.error(`Failed to create Redis connection: ${error}`, true);
    throw new TejError(
      500,
      `Failed to create Redis connection: ${error.message}`,
    );
  }
}

/**
 * Close a Redis connection
 * @param {RedisClient|RedisCluster} client - Redis client to close
 * @returns {Promise<void>}
 */
async function closeConnection(client) {
  if (client) {
    await client.quit();
  }
}

export default {
  createConnection,
  closeConnection,
};
